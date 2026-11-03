import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';


const identity=(id)=>({'fixture-session-id':id,'fixture-email':id+'@example.test'});
const request=(route,body,method='POST')=>new Request('https://example.test/api/'+route,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function setup(t){const f=fixture(identity('test-user-a'));f.env.SETTINGS_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');return f}

const person=()=>({id:crypto.randomUUID(),name:'Test Alex',fields:{Age:'21','Lives in':'Abuja'},notes:'Original note.'});

test('people API CRUD enforce ownership and stale versions',async(t)=>{
 const f=setup(t),route=f.load('app/api/people/route.ts'),p=person();
 let result=await (await route.POST(request('people',{people:[p]}))).json();assert.equal(result.saved[0].version,1);
 result=await (await route.POST(request('people',{people:[{...p,version:1,fields:{...p.fields,Course:'Cybersecurity'}}]}))).json();assert.equal(result.saved[0].version,2);
 const conflict=await (await route.POST(request('people',{people:[{...p,version:1,name:'Stale edit'}]}))).json();assert.deepEqual(conflict.conflicts,[p.id]);
 f.setHeaders(identity('test-user-b'));assert.deepEqual((await (await route.GET()).json()).people,[]);
 for(const edit of [p,{...p,version:2}]){const r=await (await route.POST(request('people',{people:[edit]}))).json();assert.equal(r.saved.length,0);assert.deepEqual(r.conflicts,[p.id])}
 assert.equal((await route.DELETE(request('people',{id:p.id,version:2},'DELETE'))).status,409);
 f.setHeaders(identity('test-user-a'));let saved=(await (await route.GET()).json()).people;assert.equal(saved[0].name,p.name);assert.equal(saved[0].fields.Course,'Cybersecurity');
 assert.equal((await route.DELETE(request('people',{id:p.id,version:1},'DELETE'))).status,409);
 assert.equal((await route.DELETE(request('people',{id:p.id,version:2},'DELETE'))).status,200);assert.deepEqual((await (await route.GET()).json()).people,[]);
});

test('batch conflicts identify unsaved profiles while valid rows save',async(t)=>{
 const f=setup(t),route=f.load('app/api/people/route.ts'),a=person(),b={...person(),name:'Test Zara'};
 await route.POST(request('people',{people:[a]}));
 const r=await (await route.POST(request('people',{people:[a,b]}))).json();assert.deepEqual(r.conflicts,[a.id]);assert.deepEqual(r.saved.map(p=>p.id),[b.id]);
 const duplicate=await route.POST(request('people',{people:[b,b]}));assert.equal(duplicate.status,400);
});

test('malformed JSON shapes and cross-origin writes fail as client errors',async(t)=>{
 const f=setup(t);
 for(const name of ['people','settings','extract'])for(const input of [null,[],true]){
  const response=await f.load('app/api/'+name+'/route.ts').POST(request(name,input));assert.equal(response.status,400,name+' '+JSON.stringify(input));
 }
 const cross=new Request('https://example.test/api/people',{method:'POST',headers:{Origin:'https://other.example.test','Content-Type':'application/json'},body:JSON.stringify({people:[person()]})});
 assert.equal((await f.load('app/api/people/route.ts').POST(cross)).status,403);
});

test('field limits are checked after aliases are combined',async(t)=>{
 const f=setup(t),route=f.load('app/api/people/route.ts');
 for(const fields of [{' ':'blank label'},{Notes:'a'.repeat(2000),notes:'b'.repeat(2000)}])assert.equal((await route.POST(request('people',{people:[{...person(),fields}]}))).status,400);
});

test('keys are encrypted, private per account, preserved on ordinary saves and removable',async(t)=>{
 const f=setup(t),route=f.load('app/api/settings/route.ts');
 const settings={aiProvider:'openrouter',aiModel:'openrouter/free',aiKey:'fake-integration-key'};
 let response=await route.POST(request('settings',settings));assert.equal(response.status,200);assert.ok(!(await response.text()).includes(settings.aiKey));
 const stored=f.tables.settings[0];assert.notEqual(stored.encrypted_ai_key,settings.aiKey);assert.equal(await f.load('lib/server.ts').decrypt(stored.encrypted_ai_key),settings.aiKey);
 await route.POST(request('settings',{...settings,aiKey:''}));assert.equal(f.tables.settings[0].encrypted_ai_key,stored.encrypted_ai_key);
 f.setHeaders(identity('test-user-b'));assert.equal((await (await route.GET()).json()).hasAiKey,false);
 f.setHeaders(identity('test-user-a'));await route.POST(request('settings',{aiProvider:'openrouter',aiModel:'openrouter/free',removeAiKey:true}));assert.equal((await (await route.GET()).json()).hasAiKey,false);
});

test('source upload/download/delete preserves bytes and blocks another account',async(t)=>{
 const f=setup(t),route=f.load('app/api/sources/route.ts');
 const bytes=Buffer.from('Name,Age\nAlex,21\n'),name='sample.csv',size=bytes.length;
 const prepared=await (await route.POST(request('sources',{action:'prepare',name,size}))).json();
 f.files.set('test-user-a/'+prepared.id,bytes);
 const upload=await route.POST(request('sources',{action:'finish',name,size,id:prepared.id}));
 assert.equal(upload.status,200);const {source}=await upload.json();
 const get=()=>route.GET(new Request('https://example.test/api/sources?id='+source.id));
 const download=await get();assert.equal(download.status,302);
 assert.deepEqual(f.files.get(new URL(download.headers.get('location')).pathname.slice('/download/'.length)),bytes);
 assert.equal(f.files.size,1);
 f.setHeaders(identity('test-user-b'));assert.equal((await get()).status,404);assert.equal((await route.DELETE(request('sources',{id:source.id},'DELETE'))).status,404);assert.equal(f.files.size,1);
 f.setHeaders(identity('test-user-a'));assert.equal((await route.DELETE(request('sources',{id:source.id},'DELETE'))).status,200);assert.equal(f.files.size,0);assert.equal((await get()).status,404);
});

test('directory pagination respects response size, validates cursors and assembles complete records',async()=>{
 const f=fixture(),{listPage,afterId}=f.load('lib/list-page.ts');
 const rows=Array.from({length:51},(_,i)=>({id:('00000000-0000-4000-8000-'+String(i).padStart(12,'0')),notes:'界'.repeat(30000)}));
 const first=listPage(rows);
 assert.ok(first.items.length>0&&first.items.length<50);
 assert.equal(first.next,first.items.at(-1).id);
 assert.throws(()=>afterId(new Request('https://app.test/?after=bad')));
 const {listRecords}=f.load('lib/api-client.ts');
 const result=await listRecords(async url=>{
  const id=afterId(new Request('https://app.test'+url));
  const {items,next}=listPage(rows.filter(r=>!id||r.id>id));return {people:items,next};
 },'people');
 assert.deepEqual(result,rows);
});
