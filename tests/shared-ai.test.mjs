import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/fixture.mjs';
const result={model:'test/free-model',choices:[{finish_reason:'stop',message:{content:JSON.stringify({people:[{name:'Test Alex',fields:[{label:'Age',value:'22'}],sourceNote:'Test Alex is 22.'}]})}}]};
const request=(path,value,headers={})=>new Request('https://example.test'+path,{method:'POST',headers,body:JSON.stringify(value)});
test('anonymous visitors use included AI with a server-only key and fixed free route',async t=>{
 const f=fixture();f.env.SHARED_OPENROUTER_API_KEY='server-only-test-key';
 Object.defineProperty(f.env,'DB',{get:()=>assert.fail('Guest extraction must not read account data')});
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer server-only-test-key');const body=JSON.parse(options.body);assert.equal(body.model,'openrouter/free');assert.deepEqual(body.provider.max_price,{prompt:0,completion:0,request:0});return Response.json(result)});
 const r=await f.load('app/api/guest-extract/route.ts').POST(request('/api/guest-extract',{text:'Test Alex is 22.',model:'paid-model',provider:'unknown'}));assert.equal(r.status,200);const data=await r.json();assert.equal(data.people[0].name,'Test Alex');assert.doesNotMatch(JSON.stringify(data),/server-only-test-key/);
 const status=await f.load('app/api/ai-status/route.ts').GET();assert.deepEqual(await status.json(),{sharedAiAvailable:true});
});
test('signed-in users without personal keys use included AI while ownership remains required',async t=>{
 const f=fixture({'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'user@example.test'});f.env.SHARED_OPENROUTER_API_KEY='shared-test';f.env.DB={prepare:()=>({bind:()=>({first:async()=>null})})};t.mock.method(globalThis,'fetch',async()=>Response.json(result));
 const route=f.load('app/api/extract/route.ts');const r=await route.POST(request('/api/extract',{text:'Test Alex is 22.',mode:'ai'}));assert.equal(r.status,200);
 f.setHeaders({});assert.equal((await route.POST(request('/api/extract',{text:'Test',mode:'ai'}))).status,401);
});
test('shared mode retains origin, input and configuration checks',async t=>{
 const f=fixture();const fetch=t.mock.method(globalThis,'fetch',async()=>assert.fail('Invalid request reached provider'));const route=f.load('app/api/guest-extract/route.ts');
 assert.equal((await route.POST(request('/api/guest-extract',{text:'Test'}))).status,503);
 f.env.SHARED_OPENROUTER_API_KEY='shared-test';assert.equal((await route.POST(request('/api/guest-extract',{text:'Test'},{origin:'https://other.test'}))).status,403);
 assert.equal((await route.POST(request('/api/guest-extract',{text:' '}))).status,400);assert.equal(fetch.mock.callCount(),0);
});
