import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/fixture.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const headers=id=>({'fixture-session-id':id,'fixture-email':'test@example.test'});
const req=value=>new Request('https://atlas.example/api/preferences',{method:'POST',body:JSON.stringify(value)});
test('preferences are isolated by authenticated account and partial saves retain other sections',async()=>{
 const f=fixture(headers(a)),r=f.load('app/api/preferences/route.ts');
 assert.equal((await r.POST(req({key:'profile',value:{name:'Test',bio:'Notes',photo:''}}))).status,200);
 assert.equal((await r.POST(req({key:'tour',value:{done:true}}))).status,200);
 assert.equal((await r.GET()).status,200);assert.equal((await (await r.GET()).json()).preferences.profile.name,'Test');
 f.setHeaders(headers(b));assert.deepEqual((await (await r.GET()).json()).preferences,{});
 f.setHeaders({});assert.equal((await r.GET()).status,401);assert.equal((await r.POST(req({key:'tour',value:{done:true}}))).status,401);
});
test('preference validation rejects foreign photos, untrusted background URLs and invalid keys',()=>{
 const {validatePreference}=fixture().load('lib/personalization.ts');
 const path=`${a}/${crypto.randomUUID()}.jpg`;
 assert.equal(validatePreference('profile',{name:'Name',bio:'',photo:path},a).value.photo,path);
 for(const value of [{name:'Name',bio:'',photo:`${b}/${crypto.randomUUID()}.jpg`},{name:'Name',bio:'',photo:'javascript:alert(1)'},{name:'Name',bio:'',photo:`${a}/../secret.jpg`}])assert.throws(()=>validatePreference('profile',value,a));
 assert.throws(()=>validatePreference('dashboard',{theme:'atlas',wallpaper:'https://evil.example/image',photo:''},a));
 assert.throws(()=>validatePreference('__proto__',{},a));assert.throws(()=>validatePreference('tour',{done:false},a));
});
test('photos can only attach to an existing person owned by the same account',async()=>{
 const f=fixture(headers(a)),id=crypto.randomUUID(),r=f.load('app/api/preferences/route.ts');f.tables.people.push({id,owner:b});
 assert.equal((await r.POST(req({key:'person:'+id,value:{photo:''}}))).status,404);
 f.tables.people[0].owner=a;assert.equal((await r.POST(req({key:'person:'+id,value:{photo:''}}))).status,200);
});
test('image uploads validate raster bytes, origin and size and sign only owned private images',async()=>{
 const f=fixture(headers(a)),r=f.load('app/api/images/route.ts');
 const upload=(bytes,type='image/jpeg',origin='https://atlas.example')=>r.POST(new Request('https://atlas.example/api/images',{method:'POST',headers:{'Content-Type':type,Origin:origin},body:new Uint8Array(bytes)}));
 for(const [bytes,type] of [[[1,2,3,4],'image/jpeg'],[[255,216,255,217],'image/svg+xml'],[new Uint8Array(2_000_001),'image/jpeg']])assert.equal((await upload(bytes,type)).status,400);
 assert.equal((await upload([255,216,255,217],'image/jpeg','https://evil.example')).status,403);
 const saved=await upload([255,216,255,0,255,217]);assert.equal(saved.status,200);const {path}=await saved.json();assert.ok(path.startsWith(a+'/'));
 let response=await r.GET(new Request('https://atlas.example/api/images?path='+encodeURIComponent(path)));assert.equal(response.status,302);assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 f.setHeaders(headers(b));assert.equal((await r.GET(new Request('https://atlas.example/api/images?path='+encodeURIComponent(path)))).status,404);
 f.setHeaders({});assert.equal((await r.GET(new Request('https://atlas.example/api/images?path='+encodeURIComponent(path)))).status,401);
});
test('tour auto-start requires neither browser nor account dismissal, so it does not repeat after login',()=>{
 const {shouldStartTour}=fixture().load('lib/tour-state.ts');
 assert.equal(shouldStartTour(false,false),true);assert.equal(shouldStartTour(true,false),false);assert.equal(shouldStartTour(false,true),false);assert.equal(shouldStartTour(true,true),false);
});

test('voice appends only new final transcripts and retains the original note on permission or network errors',()=>{
 const {startDictation}=fixture().load('lib/voice.ts');let note='Original note';let errors=[],ended=0,started=0;
 const speech={start(){started++},stop(){},abort(){}};
 startDictation(speech,'en-NG',text=>{note+='\n'+text},()=>ended++,message=>errors.push(message));
 assert.equal(started,1);assert.equal(speech.lang,'en-NG');
 const final={isFinal:true,0:{transcript:' Ada likes chess. '}};
 speech.onresult({resultIndex:0,results:[{isFinal:false,0:{transcript:'Incomplete'}}]});assert.equal(note,'Original note');
 speech.onresult({resultIndex:0,results:[final]});speech.onresult({resultIndex:0,results:[final]});assert.equal(note,'Original note\nAda likes chess.');
 speech.onerror({error:'not-allowed'});speech.onerror({error:'network'});assert.equal(note,'Original note\nAda likes chess.');assert.equal(ended,2);assert.equal(errors.length,2);assert.match(errors[0],/permission was denied/);
});
