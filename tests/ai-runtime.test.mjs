import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from 'node:http';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';

test('Node HTTP transport normalizes all providers and rejects redirects without forwarding keys',async t=>{
 const {load}=fixture(),{AI_PROVIDERS}=load('lib/ai-providers.ts');
 const {extractWithAi}=load('lib/ai-extraction.ts');
 const output=JSON.stringify({people:[]}), key='fake-runtime-key',note='Test Person is 21.';
 let forwarded=0;
 const server=createServer(async(req,res)=>{
  if(req.url==='/unexpected'){forwarded++;res.end();return}
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=JSON.parse(raw),provider=req.url.slice(1);
  assert.equal(req.method,'POST');assert.equal(req.headers.authorization,'Bearer '+key);
  assert.equal(provider==='openai'?body.input:body.messages[1].content,note);
  if(body.model.startsWith('redirect-')){res.writeHead(Number(body.model.slice(9)),{Location:'/unexpected'});res.end();return}
  if(body.model==='unauthorized'){res.writeHead(401);res.end('{}');return}
  res.end(JSON.stringify(provider==='openai'?{status:'completed',model:'actual',output:[{content:[{type:'output_text',text:output}]}]}:{model:'actual',choices:[{finish_reason:'stop',message:{content:output}}]}));
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());
 const original=globalThis.fetch;
 t.mock.method(globalThis,'fetch',(url,options)=>{
  const provider=Object.keys(AI_PROVIDERS).find(p=>AI_PROVIDERS[p].endpoint===url);
  assert.ok(provider);return original('http://127.0.0.1:'+server.address().port+'/'+provider,options);
 });
 for(const provider of Object.keys(AI_PROVIDERS))assert.deepEqual(await extractWithAi(provider,key,'model',note),{model:'actual',output});
 for(const status of [301,302,303,307,308])await assert.rejects(extractWithAi('openrouter',key,'redirect-'+status,note),e=>e.status===502&&!e.message.includes(key));
 await assert.rejects(extractWithAi('openrouter',key,'unauthorized',note),e=>e.status===400);
 assert.equal(forwarded,0);
});
