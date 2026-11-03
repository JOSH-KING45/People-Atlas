// Run: node --test tests/sign-in.test.mjs
// Infrastructure is mocked; these checks do not establish a real SIWC session.
import assert from 'node:assert/strict';
import test from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {fixture} from './helpers/fixture.mjs';

test('anonymous visitors get a working top-level sign-in link on the landing page before the workspace loads',async()=>{
  const {load} = fixture();
  const page = load('app/page.tsx');
  assert.equal(page.dynamic,'force-dynamic');
  const markup = renderToStaticMarkup(await page.default());
  assert.match(markup,/<a[^>]+href="\/login"/);
  assert.match(markup,/Create an account/);
  assert.match(markup,/<a[^>]+href="\/guest"[^>]*>.*Start your people notebook/);
  assert.match(markup,/Guest mode stores profiles locally on this device/);
  assert.match(markup,/fictional example/);
  assert.doesNotMatch(markup,/Connection issue|Add a little context/);
});

test('recognized identity opens the workspace and uses the stable ID for ownership',async()=>{
  const f = fixture({'fixture-session-id':'test-user-a','fixture-email':'a@example.test'});
  assert.equal((await f.load('app/page.tsx').default()).type,f.Workspace);
  const server = f.load('lib/server.ts');
  assert.equal(await server.owner(),'test-user-a');
  f.setHeaders({'fixture-session-id':'test-user-b','fixture-email':'b@example.test'});
  assert.equal(await server.owner(),'test-user-b');
});

test('absent or partial identity cannot access any saved-data endpoint',async()=>{
  const f = fixture();
  Object.defineProperty(f.client,'from',{get:()=>{assert.fail('Unauthenticated request reached the database')}});
  Object.defineProperty(f.client,'storage',{get:()=>{assert.fail('Unauthenticated request reached file storage')}});
  for(const headers of [{},{'fixture-email':'a@example.test'},{'fixture-session-id':'test-user-a'}]){
    f.setHeaders(headers);
    for(const name of ['people','settings','sources']){
      const route = f.load(`app/api/${name}/route.ts`);
      for(const method of ['GET','POST','DELETE'].filter(method=>method in route)){
        const response = await route[method](new Request(`https://example.test/api/${name}`,{method}));
        assert.equal(response.status,401,`${method} ${name}`);
        assert.equal(response.headers.get('cache-control'),'no-store');
        assert.match((await response.json()).error,/Sign in with email/);
      }
    }
  }
});

test('untrusted identity headers cannot authenticate or redirect a visitor',async()=>{
 const f=fixture({'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'a@test.com','return_to':'https://other.test'});
 assert.equal(await f.load('app/account.ts').currentUser(),null);
 assert.match(renderToStaticMarkup(await f.load('app/page.tsx').default()),/href="\/login"/);
});

test('the client classifies JSON and HTML 401 responses as sign-in failures',async(t)=>{
  const {apiRequest,isSignInError} = fixture().load('lib/api-client.ts');
  for(const content of ['{"error":"Unauthorized"}','<html>Sign in</html>']){
    const mock = t.mock.method(globalThis,'fetch',async(_url,options)=>{
      assert.equal(options.credentials,'same-origin');
      return new Response(content,{status:401});
    });
    await assert.rejects(apiRequest('/api/people'),error=>isSignInError(error)&&/Sign in with email/.test(error.message));
    mock.mock.restore();
  }
});

test('network and service failures do not prompt users to sign in',async(t)=>{
  const {apiRequest,isSignInError} = fixture().load('lib/api-client.ts');
  const mock = t.mock.method(globalThis,'fetch',async()=>Response.json({error:'Database unavailable'},{status:503}));
  await assert.rejects(apiRequest('/api/people'),error=>!isSignInError(error)&&error.status===503&&error.message==='Database unavailable');
  mock.mock.mockImplementation(async()=>{throw new TypeError('Failed to fetch')});
  await assert.rejects(apiRequest('/api/people'),error=>!isSignInError(error));
});


test('provider requests use only the selected official endpoint and never follow redirects',()=>{
 const f=fixture();const {createAiRequest}=f.load('lib/ai-extraction.ts');
 const expected={openai:'https://api.openai.com/v1/responses',gemini:'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',groq:'https://api.groq.com/openai/v1/chat/completions',openrouter:'https://openrouter.ai/api/v1/chat/completions'};
 for(const [provider,url] of Object.entries(expected)){
  const r=createAiRequest(provider,'test-key-'+provider,'test/model:free','Sample note');
  assert.equal(r.url,url);assert.equal(r.options.redirect,'manual');
  assert.equal(r.options.headers.Authorization,'Bearer test-key-'+provider);
  const body=JSON.parse(r.options.body);assert.equal(body.model,'test/model:free');
  if(provider==='openai'){assert.equal(body.store,false);assert.equal(body.input,'Sample note')}
  else{assert.equal(body.messages[1].content,'Sample note');assert.equal(body.response_format.type,provider==='gemini'?'json_schema':'json_object')}
 }
});

test('provider results normalize correctly and incomplete or rejected responses never become drafts',async(t)=>{
 const {extractWithAi}=fixture().load('lib/ai-extraction.ts');
 const output=JSON.stringify({people:[]});
 const mock=t.mock.method(globalThis,'fetch',async()=>Response.json({choices:[{finish_reason:'stop',message:{content:output}}]}));
 for(const provider of ['gemini','groq','openrouter'])assert.deepEqual(await extractWithAi(provider,'test-key','test-model','note'),{output,model:'test-model'});
 mock.mock.mockImplementation(async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:output}]}]}));
 assert.deepEqual(await extractWithAi('openai','test-key','test-model','note'),{output,model:'test-model'});
 mock.mock.mockImplementation(async()=>Response.json({choices:[{finish_reason:'length',message:{content:output}}]}));
 await assert.rejects(extractWithAi('groq','test-key','test-model','note'),e=>e.status===422);
 mock.mock.mockImplementation(async()=>Response.json({error:'test-key'},{status:401}));
 await assert.rejects(extractWithAi('gemini','test-key','test-model','note'),e=>e.status===400&&!e.message.includes('test-key'));
 await assert.rejects(extractWithAi('https://example.test','test-key','test-model','note'),e=>e.status===400);
});

test('switching providers requires a new key and stores provider and encrypted key together',async()=>{
 const f=fixture({'fixture-session-id':'test-user-a','fixture-email':'a@example.test'});
 f.env.SETTINGS_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
 f.tables.settings.push({owner:'test-user-a',encrypted_ai_key:'old-ciphertext',google_client_id:'',ai_model:'gpt-4.1-mini',ai_provider:'openai'});
 const {POST}=f.load('app/api/settings/route.ts');
 const request=(input)=>new Request('https://example.test/api/settings',{method:'POST',body:JSON.stringify(input)});
 let response=await POST(request({aiProvider:'openrouter',aiModel:'provider/model:free'}));
 assert.equal(response.status,400);assert.equal(f.tables.settings[0].encrypted_ai_key,'old-ciphertext');
 response=await POST(request({aiProvider:'openrouter',aiModel:'provider/model:free',aiKey:'new-test-key'}));
 assert.equal(response.status,200);const saved=f.tables.settings[0];assert.equal(saved.owner,'test-user-a');assert.equal(saved.ai_provider,'openrouter');
 assert.notEqual(saved.encrypted_ai_key,'new-test-key');assert.notEqual(saved.encrypted_ai_key,'old-ciphertext');
 assert.equal(await f.load('lib/server.ts').decrypt(saved.encrypted_ai_key),'new-test-key');
 const result=await response.json();assert.equal(result.aiProvider,'openrouter');assert.equal(result.hasAiKey,true);assert.ok(!JSON.stringify(result).includes('new-test-key'));
});


test('the recommended free route requires structured output and zero-cost providers',()=>{
 const f=fixture();const {createAiRequest}=f.load('lib/ai-extraction.ts');
 const {AI_PROVIDERS,RECOMMENDED_OPENROUTER_MODEL}=f.load('lib/ai-providers.ts');
 assert.equal(AI_PROVIDERS.openrouter.defaultModel,'openrouter/free');
 const request=createAiRequest('openrouter','fake-key',RECOMMENDED_OPENROUTER_MODEL,'Example note');
 const body=JSON.parse(request.options.body);
 assert.equal(body.model,'openrouter/free');assert.equal(body.response_format.type,'json_schema');
 assert.equal(body.response_format.json_schema.strict,true);
 assert.deepEqual(body.response_format.json_schema.schema.required,['people']);
 assert.equal(body.provider.require_parameters,true);
 assert.deepEqual(body.provider.max_price,{prompt:0,completion:0,request:0});
 assert.equal(body.models,undefined,'No paid model fallback may be added');
 const pinned=JSON.parse(createAiRequest('openrouter','fake-key','example/model:free','note').options.body);
 assert.deepEqual(pinned.provider.max_price,{prompt:0,completion:0,request:0});
 const custom=JSON.parse(createAiRequest('openrouter','fake-key','example/paid-model','note').options.body);
 assert.equal(custom.model,'example/paid-model');assert.equal(custom.provider.max_price,undefined);
});

test('OpenRouter errors distinguish free limits, unavailable models, and account issues without leaking upstream text',async(t)=>{
 const {extractWithAi}=fixture().load('lib/ai-extraction.ts');
 const responses=[
  [429,429,/usage or rate limit/],
  [503,503,/temporarily unavailable or busy/],
  [404,503,/No available OpenRouter provider/],
  [402,400,/account balance or key spending-limit/],
  [401,400,/rejected the key/],
 ];
 const fetch=t.mock.method(globalThis,'fetch');
 for(const [upstream,status,message] of responses){
  fetch.mock.mockImplementation(async()=>Response.json({error:{code:upstream,message:'private-key-and-note'}},{status:upstream}));
  await assert.rejects(extractWithAi('openrouter','fake-key','openrouter/free','note'),e=>e.status===status&&message.test(e.message)&&!e.message.includes('private-key-and-note'));
 }
 fetch.mock.mockImplementation(async()=>Response.json({error:{code:429,message:'private-key-and-note'}}));
 await assert.rejects(extractWithAi('openrouter','fake-key','openrouter/free','note'),e=>e.status===429&&!e.message.includes('private-key-and-note'));
});

test('free extraction returns the actual model for review and rejects invalid or partial profiles without saving',async(t)=>{
 const f=fixture({'fixture-session-id':'test-user-a','fixture-email':'a@example.test'});
 f.env.SETTINGS_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
 const key=await f.load('lib/server.ts').encrypt('fake-key');
 f.tables.settings.push({owner:'test-user-a',encrypted_ai_key:key,ai_model:'openrouter/free',ai_provider:'openrouter'});
 const {POST}=f.load('app/api/extract/route.ts');
 const note='Fictional Zara is 19 and lives in Abuja.';
 const input=()=>new Request('https://example.test/api/extract',{method:'POST',body:JSON.stringify({text:note,mode:'ai'})});
 const responseBody=(people,finish='stop')=>({model:'example/actual-free-model:free',choices:[{finish_reason:finish,message:{content:JSON.stringify({people})}}]});
 const fetch=t.mock.method(globalThis,'fetch',async()=>Response.json(responseBody([{name:'Fictional Zara',fields:[{label:'Age',value:'19'}],sourceNote:note}])));
 const result=await POST(input());assert.equal(result.status,200);
 const data=await result.json();assert.equal(data.people[0].fields.Age,'19');assert.equal(data.people[0].notes,note);
 assert.equal(data.aiModel,'example/actual-free-model:free');assert.match(data.notice,/example\/actual-free-model:free/);
 fetch.mock.mockImplementation(async()=>Response.json(responseBody([{name:'Fictional Zara',fields:'invalid',sourceNote:note}])));
 assert.equal((await POST(input())).status,422);
 fetch.mock.mockImplementation(async()=>Response.json(responseBody([],'length')));
 assert.equal((await POST(input())).status,422);
});
