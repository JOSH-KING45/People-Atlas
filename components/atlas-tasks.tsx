'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {newPersonId,type Person} from '@/lib/people';
import {taskDraft,taskTime,type Task,type TaskDraft,type TaskKind} from '@/lib/tasks';
import {listRecords} from '@/lib/api-client';
import {authorizeGoogle} from '@/lib/calendar';
import {GOOGLE_CALENDAR_READ_SCOPE,readGoogleCalendar,type CalendarImportEvent} from '@/lib/google-calendar-import';

const labels:Record<TaskKind,string>={task:'Task',reminder:'Reminder',date:'Important date'};
const localDate=(date:Date)=>new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
const blank=(personId:string|null=null):TaskDraft=>({id:newPersonId(),title:'',personId,kind:'task',dueOn:null,dueAt:null,completed:false,googleEventId:null});
const submitOptions=(method:string,data:unknown)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});

export function AtlasTasks({people,request,profileId,googleClientId,googleReady,showImport}:{
 people:Person[];request:(url:string,options?:RequestInit)=>Promise<Record<string,unknown>>;
 profileId:string|null;googleClientId:string;googleReady:boolean;showImport:boolean;
}){
 const [tasks,setTasks]=useState<Task[]>([]);
 const [draft,setDraft]=useState<TaskDraft|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [now,setNow]=useState(Date.now);
 const [completed,setCompleted]=useState(false);
 const [importOpen,setImportOpen]=useState(false);
 const [events,setEvents]=useState<CalendarImportEvent[]|null>(null);
 const [selection,setSelection]=useState<string[]>([]);
 const [importKind,setImportKind]=useState<TaskKind>('date');
 const [importPerson,setImportPerson]=useState('');
 const [from,setFrom]=useState(()=>localDate(new Date()).slice(0,10));
 const [through,setThrough]=useState(()=>localDate(new Date(Date.now()+30*86400000)).slice(0,10));
 const [message,setMessage]=useState('');
 const report=(err:unknown)=>setError(err instanceof Error?err.message:'Please try again.');

 useEffect(()=>{
  let active=true;
  listRecords<Task>(request,'tasks').then(rows=>{if(active)setTasks(rows)}).catch(err=>{if(active)report(err)})
   .finally(()=>{if(active)setLoading(false)});
  const timer=setInterval(()=>setNow(Date.now()),30_000);
  return()=>{active=false;clearInterval(timer)};
 },[request]);
 useEffect(()=>{
  if(profileId)setDraft({...blank(profileId)});
 },[profileId]);

 const save=async(item:TaskDraft)=>{
  const parsed=taskDraft.safeParse(item);
  if(!parsed.success)throw new Error('Enter a title and choose a valid date and time for the item.');
  const {task}=await request('/api/tasks',submitOptions('POST',parsed.data));
  const saved=task as Task;
  setTasks(previous=>[...previous.filter(t=>t.id!==saved.id),saved]);
 };
 const run=async(action:()=>Promise<void>)=>{
  setBusy(true);setError('');setMessage('');
  try{await action()}catch(err){report(err)}finally{setBusy(false)}
 };
 const saveForm=(event:FormEvent)=>{
  event.preventDefault();
  if(draft)void run(async()=>{await save(draft);setDraft(null)});
 };
 const remove=(item:Task)=>{
  if(!window.confirm('Delete this '+labels[item.kind].toLowerCase()+'?'))return;
  void run(async()=>{
   await request('/api/tasks',submitOptions('DELETE',{id:item.id,version:item.version}));
   setTasks(previous=>previous.filter(t=>t.id!==item.id));
   if(draft?.id===item.id)setDraft(null);
  });
 };
 const preview=(event:FormEvent)=>{
  event.preventDefault();
  void run(async()=>{
   setEvents(null);setSelection([]);
   const token=await authorizeGoogle(googleClientId,GOOGLE_CALENDAR_READ_SCOPE,false);
   setEvents(await readGoogleCalendar(token,from,through));
  });
 };
 const imported=new Set(tasks.flatMap(t=>t.googleEventId?[t.googleEventId]:[]));
 const importEvents=()=>void run(async()=>{
  const chosen=(events??[]).filter(e=>selection.includes(e.id)&&!imported.has(e.id));
  if(importKind==='reminder'&&chosen.some(e=>!e.time))throw new Error('All-day events can be imported as tasks or important dates. Timed events can become reminders.');
  let count=0;
  try{
   for(const event of chosen){
    await save({...blank(importPerson||null),title:event.title,kind:importKind,dueOn:event.time?null:event.date,dueAt:event.time,googleEventId:event.id});
    setSelection(previous=>previous.filter(id=>id!==event.id));
    count++;
   }
  }finally{if(count)setMessage(`Imported ${count} calendar event${count===1?'':'s'}.`)}
 });
 const visible=tasks.filter(t=>t.completed===completed).sort((a,b)=>taskTime(a)-taskTime(b)||a.title.localeCompare(b.title));
 const profileOptions=people.map(person=><option key={person.id} value={person.id}>{person.name}</option>);

 return <section className="panel atlas-tasks" aria-labelledby="atlas-tasks-title">
  <div className="section-heading"><h2 id="atlas-tasks-title">Tasks &amp; reminders</h2>
   <button className="outline-button" disabled={loading||busy} onClick={()=>setDraft(blank())}>Add task or reminder</button>
  </div>
  {error&&<p className="error-banner" role="alert">{error}</p>}
  {message&&<p role="status">{message}</p>}
  {draft&&<form className="atlas-task-form" onSubmit={saveForm}>
   <label className="field">Title<input required maxLength={200} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
   <label className="field">Type<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as TaskKind,dueOn:null,dueAt:null})}>
    {Object.entries(labels).map(([key,label])=><option value={key} key={key}>{label}</option>)}
   </select></label>
   <label className="field">Profile<select value={draft.personId??''} onChange={e=>setDraft({...draft,personId:e.target.value||null})}>
    <option value="">No linked profile</option>{profileOptions}
   </select></label>
   <label className="field">{draft.kind==='reminder'||draft.dueAt?'Date and time':'Date'}
    {draft.kind==='reminder'||draft.dueAt
     ?<input type="datetime-local" required value={draft.dueAt?localDate(new Date(draft.dueAt)):''} onChange={e=>setDraft({...draft,dueAt:e.target.value?new Date(e.target.value).toISOString():null,dueOn:null})}/>
     :<input type="date" required={draft.kind==='date'} value={draft.dueOn??''} onChange={e=>setDraft({...draft,dueOn:e.target.value||null})}/>}
   </label>
   <div className="action-row"><button className="primary-button" disabled={busy}>Save item</button><button type="button" className="outline-button" disabled={busy} onClick={()=>setDraft(null)}>Cancel</button></div>
  </form>}
  <div className="action-row" aria-label="Filter items">
   <button className="outline-button" aria-pressed={!completed} onClick={()=>setCompleted(false)}>Upcoming &amp; overdue</button>
   <button className="outline-button" aria-pressed={completed} onClick={()=>setCompleted(true)}>Completed</button>
  </div>
  {loading&&<p role="status">Loading tasks…</p>}
  {!loading&&!visible.length&&<p className="muted">{completed?'No completed items.':'No upcoming tasks or reminders.'}</p>}
  <ul className="atlas-task-list">{visible.map(task=>{
   const when=task.dueAt?new Date(task.dueAt).toLocaleString():task.dueOn?new Date(task.dueOn+'T12:00:00').toLocaleDateString():'No due date';
   const person=people.find(p=>p.id===task.personId);
   return <li key={task.id}>
    <strong>{task.title}</strong><p className="muted">{labels[task.kind]} · {when}{person?' · '+person.name:''}
     {!task.completed&&task.kind!=='date'&&taskTime(task)<=now&&(task.kind==='reminder'?' · Reminder due':' · Overdue')}
    </p>
    <div className="action-row">
     <button className="text-button" disabled={busy} onClick={()=>setDraft(task)}>Edit</button>
     <button className="text-button" disabled={busy} onClick={()=>void run(()=>save({...task,completed:!task.completed}))}>{task.completed?'Reopen':task.kind==='reminder'?'Dismiss':'Complete'}</button>
     {!task.completed&&task.kind==='reminder'&&<button className="text-button" disabled={busy} onClick={()=>void run(()=>save({...task,dueAt:new Date(Math.max(Date.now(),taskTime(task))+600000).toISOString()}))}>Snooze 10 min</button>}
     <button className="text-button" disabled={busy} onClick={()=>remove(task)}>Delete</button>
    </div>
   </li>;
  })}</ul>
  {showImport&&<div className="atlas-calendar-import">
   <button className="outline-button" aria-expanded={importOpen} disabled={busy} onClick={()=>setImportOpen(open=>!open)}>Import from Google Calendar</button>
   {importOpen&&<>
    <p className="muted">Preview events from your primary calendar with read-only access. Atlas saves only the selected titles, dates and event IDs to recognize duplicates.</p>
    <form className="atlas-task-form" onSubmit={preview}>
     <label className="field">From<input type="date" required value={from} onChange={e=>{setFrom(e.target.value);setEvents(null)}}/></label>
     <label className="field">Through<input type="date" required min={from} value={through} onChange={e=>{setThrough(e.target.value);setEvents(null)}}/></label>
     <button className="primary-button" disabled={!googleClientId||!googleReady||busy}>Authorize and preview</button>
    </form>
    {!googleClientId&&<p className="muted">Google Calendar import is currently unavailable.</p>}
    {events&&<>
     {!events.length&&<p>No events found in this date range.</p>}
     <ul className="atlas-task-list">{events.map(event=><li key={event.id}>
      <label><input type="checkbox" checked={selection.includes(event.id)||imported.has(event.id)} disabled={busy||imported.has(event.id)}
       onChange={e=>setSelection(previous=>e.target.checked?[...previous,event.id]:previous.filter(id=>id!==event.id))}/>
       {' '}{event.title} · {event.date}{imported.has(event.id)?' · Already imported':''}</label>
     </li>)}</ul>
     {!!events.length&&<div className="atlas-task-form">
      <label className="field">Import as<select value={importKind} onChange={e=>setImportKind(e.target.value as TaskKind)}>
       {Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select></label>
      <label className="field">Link to profile<select value={importPerson} onChange={e=>setImportPerson(e.target.value)}><option value="">No linked profile</option>{profileOptions}</select></label>
      <button className="primary-button" disabled={busy||!selection.length} onClick={importEvents}>Import selected ({selection.length})</button>
     </div>}
    </>}
   </>}
  </div>}
 </section>;
}
