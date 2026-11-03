import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';

test('network failures and timeouts are distinct and diagnostics never contain credentials or notes',async(t)=>{
 const {extractWithAi}=fixture().load('lib/ai-extraction.ts');const logs=[];
 t.mock.method(console,'error',(...args)=>logs.push(args));
 const fetch=t.mock.method(globalThis,'fetch',async()=>{throw new Error('fake-secret-key private-note')});
 await assert.rejects(extractWithAi('openrouter','fake-secret-key','openrouter/free','private-note'),error=>error.status===502&&/could not be reached/.test(error.message));
 fetch.mock.mockImplementation(async()=>{throw new DOMException('fake-secret-key private-note','TimeoutError')});
 await assert.rejects(extractWithAi('openrouter','fake-secret-key','openrouter/free','private-note'),error=>error.status===504&&/too long/.test(error.message));
 fetch.mock.mockImplementation(async()=>({ok:true,status:200,json:async()=>{throw new DOMException('private-note','TimeoutError')}}));
 await assert.rejects(extractWithAi('openrouter','fake-secret-key','openrouter/free','private-note'),error=>error.status===504);
 assert.deepEqual(logs.map(row=>row[1].reason),['network','timeout','timeout']);assert.doesNotMatch(JSON.stringify(logs),/fake-secret-key|private-note/);
});

test('malformed upstream content is rejected instead of crashing',async(t)=>{
 const {extractWithAi}=fixture().load('lib/ai-extraction.ts');const fetch=t.mock.method(globalThis,'fetch');
 for(const output of [null,{},'unexpected',[null],[{content:null}],[{content:[null]}]]){
  fetch.mock.mockImplementation(async()=>Response.json({status:'completed',output}));
  await assert.rejects(extractWithAi('openai','fake-key','test-model','Test note'),error=>error.status===422);
 }
});

test('AI extraction preserves repeated details, rejects oversized combinations and never saves automatically',async(t)=>{
 const f=fixture({'fixture-session-id':'test-user-a','fixture-email':'a@example.test'});
 f.env.SETTINGS_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
 const key=await f.load('lib/server.ts').encrypt('fake-key');
 f.tables.settings.push({owner:'test-user-a',encrypted_ai_key:key,ai_provider:'openrouter',ai_model:'openrouter/free'});

 const route=f.load('app/api/extract/route.ts');
 let fields=[{label:'Interests',value:'music'},{label:'Interests',value:'coding'},{label:'birthday',value:'maybe 15 June'}];
 t.mock.method(globalThis,'fetch',async()=>Response.json({model:'fixture/model',choices:[{finish_reason:'stop',message:{content:JSON.stringify({people:[{name:'Test Alex',fields,sourceNote:'Test note'}]})}}]}));
 const request=()=>new Request('https://example.test/api/extract',{method:'POST',body:JSON.stringify({text:'Test note',mode:'ai'})});
 let response=await route.POST(request());assert.equal(response.status,200);const data=await response.json();assert.equal(data.people[0].fields.Interests,'music; coding');assert.equal(data.people[0].fields.Birthday,'maybe 15 June');
 fields=[{label:'Interests',value:'a'.repeat(2000)},{label:'Interests',value:'b'.repeat(2000)}];response=await route.POST(request());assert.equal(response.status,422);
});

test('invalid client response bodies keep their status and never become a sign-in failure',async(t)=>{
 const {apiRequest,isSignInError}=fixture().load('lib/api-client.ts');
 t.mock.method(globalThis,'fetch',async()=>Response.json(null,{status:503}));
 await assert.rejects(apiRequest('/api/people'),e=>e.status===503&&!isSignInError(e));
});

test('guest AI uses a supplied session key without identity or database access',async(t)=>{
 const f=fixture();
 Object.defineProperty(f.client,'from',{get:()=>{assert.fail('Guest extraction accessed the database')}});
 const fetch=t.mock.method(globalThis,'fetch',async(_url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer guest-session-key');
  return Response.json({model:'fixture/free-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify({people:[{name:'Guest Alex',fields:[{label:'Lives in',value:'Abuja'}],sourceNote:'Guest Alex lives in Abuja.'}]})}}]});
 });
 const route=f.load('app/api/guest-extract/route.ts');
 const request=(value)=>new Request('https://example.test/api/guest-extract',{method:'POST',body:JSON.stringify(value)});
 let response=await route.POST(request({text:'Guest Alex lives in Abuja.',provider:'openrouter',key:'guest-session-key',model:'openrouter/free'}));
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.people[0].name,'Guest Alex');assert.equal(data.people[0].fields['Lives in'],'Abuja');assert.match(data.notice,/not stored/i);assert.doesNotMatch(JSON.stringify(data),/guest-session-key/);
 response=await route.POST(request({text:'Test',provider:'unknown',key:'guest-session-key',model:'model'}));assert.equal(response.status,400);
 response=await route.POST(request({text:'Test',provider:'openrouter',key:'',model:'openrouter/free'}));assert.equal(response.status,400);
 assert.equal(fetch.mock.callCount(),1);
});

test('safe AI error categories survive API and client boundaries without leaking provider text',async(t)=>{
 const f=fixture();const {extractWithAi}=f.load('lib/ai-extraction.ts');const {api}=f.load('lib/server.ts');const {apiRequest,isSignInError}=f.load('lib/api-client.ts');
 const fetch=t.mock.method(globalThis,'fetch');
 for(const [upstream,code] of [[429,'ai_limit'],[503,'ai_busy'],[401,'ai_access']]){
  fetch.mock.mockImplementation(async()=>Response.json({error:{message:'secret-key private-note'}},{status:upstream}));
  const response=await api(async()=>{await extractWithAi('openrouter','secret-key','openrouter/free','private-note');return Response.json({})});
  const data=await response.clone().json();assert.equal(data.code,code);assert.doesNotMatch(JSON.stringify(data),/secret-key|private-note/);
  fetch.mock.mockImplementation(async()=>response);
  await assert.rejects(apiRequest('/api/guest-extract'),e=>e.code===code&&!isSignInError(e));
 }
});
