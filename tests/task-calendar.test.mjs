import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';
const f=fixture();
const {taskDraft,taskTime}=f.load('lib/tasks.ts');
const {readGoogleCalendar}=f.load('lib/google-calendar-import.ts');

test('tasks accept undated entries and reminders require an exact time',()=>{
 const task={id:crypto.randomUUID(),personId:null,title:'Call Ada',kind:'task',dueOn:null,dueAt:null,completed:false,googleEventId:null};
 assert.equal(taskDraft.safeParse(task).success,true);
 assert.equal(taskTime(task),Infinity);
 assert.equal(taskDraft.safeParse({...task,kind:'reminder',dueOn:'2026-11-09'}).success,false);
 assert.equal(taskDraft.safeParse({...task,kind:'date',dueOn:'2026-11-09'}).success,true);
 assert.equal(taskDraft.safeParse({...task,dueOn:'2026-02-31'}).success,false);
 assert.equal(taskDraft.safeParse({...task,kind:'reminder',dueAt:'2026-11-09T10:00:00+01:00'}).success,true);
});

test('Google preview requests minimal fields, handles pages and preserves all-day dates',async t=>{
 const urls=[];
 t.mock.method(globalThis,'fetch',async (url,options)=>{
  assert.equal(options.headers.Authorization,'Bearer test-token');
  const parsed=new URL(url);
  urls.push(parsed);
  assert.equal(parsed.pathname,'/calendar/v3/calendars/primary/events');
  assert.equal(parsed.searchParams.get('fields'),'nextPageToken,items(id,iCalUID,summary,status,start(date,dateTime))');
  return Response.json(urls.length===1?{nextPageToken:'more',items:[
   {id:'a',summary:'Interview',description:'Private notes',start:{date:'2026-11-09'}},
   {id:'b',summary:'Cancelled',status:'cancelled',start:{date:'2026-11-10'}},
  ]}:{items:[{id:'c',iCalUID:'recurring',summary:'Follow up',start:{dateTime:'2026-11-10T14:00:00+01:00'}}]});
 });
 assert.deepEqual(await readGoogleCalendar('test-token','2026-11-09','2026-11-10'),[
  {id:'a',title:'Interview',date:'2026-11-09',time:null},
  {id:'recurring|c',title:'Follow up',date:'2026-11-10',time:'2026-11-10T14:00:00+01:00'},
 ]);
 assert.equal(urls[1].searchParams.get('pageToken'),'more');
});
