import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/fixture.mjs';
function sample(f,seconds=1){const {encodeWav}=f.load('lib/audio.ts');return new Uint8Array(encodeWav(Float32Array.from({length:16000*seconds},(_,i)=>.2*Math.sin(i*.1))))}
function request(bytes,headers={}){return new Request('https://atlas.example/api/transcribe?language=en',{method:'POST',headers:{'Content-Type':'audio/wav',Origin:'https://atlas.example',...headers},body:bytes})}
test('WAV conversion enforces genuine mono PCM duration and rejects silent, invalid and oversized clips',()=>{
 const f=fixture(),{validateWav,encodeWav,MAX_AUDIO_BYTES}=f.load('lib/audio.ts');assert.equal(validateWav(sample(f)),1);
 assert.throws(()=>validateWav(new Uint8Array(encodeWav(new Float32Array(16000)))),/silent/);
 assert.throws(()=>validateWav(new Uint8Array(MAX_AUDIO_BYTES+1)),/90 seconds/);
 const wrong=sample(f);wrong[24]=0;assert.throws(()=>validateWav(wrong),/could not be read/);
 assert.throws(()=>validateWav(sample(f).slice(0,120)),/could not be read/);
});
test('guest AI transcription uses a server-only key and fixed Whisper model without accessing saved account records',async t=>{
 const f=fixture();f.env.SHARED_GROQ_API_KEY='secret-speech-test';Object.defineProperty(f.client,'from',{get:()=>assert.fail('Transcription must not read account data')});
 t.mock.method(f.client,'rpc',async(name,input)=>{assert.equal(name,'atlas_claim_speech_request');assert.equal(input.audio_seconds,10);return{data:true}});
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'https://api.groq.com/openai/v1/audio/transcriptions');assert.equal(options.redirect,'manual');assert.equal(options.headers.Authorization,'Bearer secret-speech-test');assert.equal(options.body.get('model'),'whisper-large-v3');assert.equal(options.body.get('language'),'en');assert.equal(options.body.get('response_format'),'verbose_json');assert.equal(options.body.get('file').type,'audio/wav');return Response.json({text:'Alice lives in London.',segments:[{no_speech_prob:.01}]})});
 const response=await f.load('app/api/transcribe/route.ts').POST(request(sample(f)));assert.equal(response.status,200);const data=await response.json();assert.equal(data.text,'Alice lives in London.');assert.equal(data.model,'whisper-large-v3');assert.doesNotMatch(JSON.stringify(data),/secret-speech-test/);
});
test('speech input and quota checks fail before contacting the provider',async t=>{
 const f=fixture();f.env.SHARED_GROQ_API_KEY='secret';const route=f.load('app/api/transcribe/route.ts');const call=t.mock.method(globalThis,'fetch',async()=>assert.fail('Invalid request reached provider'));
 assert.equal((await route.POST(request(sample(f),{Origin:'https://evil.example'}))).status,403);
 assert.equal((await route.POST(request(sample(f),{'Content-Type':'audio/mp3'}))).status,400);
 assert.equal((await route.POST(request(new Uint8Array(2_880_045)))).status,413);
 assert.equal((await route.POST(request(new Uint8Array(44)))).status,400);
 t.mock.method(f.client,'rpc',async()=>({data:false}));assert.equal((await route.POST(request(sample(f)))).status,429);assert.equal(call.mock.callCount(),0);
});
test('speech failures never leak upstream secrets or return a successful transcript',async t=>{
 const f=fixture();f.env.SHARED_GROQ_API_KEY='secret';const route=f.load('app/api/transcribe/route.ts');const fetch=t.mock.method(globalThis,'fetch');
 for(const [status,expected] of [[401,503],[403,503],[429,429],[500,502],[302,502]]){fetch.mock.mockImplementation(async()=>Response.json({error:'secret-private-audio'},{status}));const response=await route.POST(request(sample(f)));assert.equal(response.status,expected);assert.doesNotMatch(JSON.stringify(await response.json()),/secret-private-audio/)}
 fetch.mock.mockImplementation(async()=>{throw Error('secret-private-audio')});let response=await route.POST(request(sample(f)));assert.equal(response.status,502);assert.match((await response.json()).error,/recording is kept/);
 for(const data of [{text:''},{text:'invented',segments:[{no_speech_prob:.99}]},{error:'secret',text:'invalid'}]){fetch.mock.mockImplementation(async()=>Response.json(data));assert.equal((await route.POST(request(sample(f)))).status,422)}
 fetch.mock.mockImplementation(async()=>new Response('not json'));assert.equal((await route.POST(request(sample(f)))).status,502);
});
test('speech availability exposes no credentials and missing configuration remains explicit',async()=>{
 const f=fixture(),route=f.load('app/api/transcribe/route.ts');assert.deepEqual(await (await route.GET()).json(),{available:false,maxSeconds:90});assert.equal((await route.POST(request(sample(f)))).status,503);
 f.env.SHARED_GROQ_API_KEY='secret';assert.deepEqual(await (await route.GET()).json(),{available:true,maxSeconds:90});
});
