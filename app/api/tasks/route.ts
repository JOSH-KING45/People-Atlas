import {afterId,listPage,pageSize} from '@/lib/list-page';
import {adminClient} from '@/lib/supabase';
import {api,body,json,owner,ApiError} from '@/lib/server';
import {taskDelete,taskDraft} from '@/lib/tasks';

type TaskRow={id:string;person_id:string|null;title:string;kind:string;due_on:string|null;due_at:string|null;completed:boolean;google_event_id:string|null;version:number};
function unpack(row:TaskRow){
 return {id:row.id,personId:row.person_id,title:row.title,kind:row.kind,dueOn:row.due_on,dueAt:row.due_at,completed:row.completed,googleEventId:row.google_event_id,version:row.version};
}

export function GET(request:Request){return api(async()=>{
 const user=await owner(),cursor=afterId(request);
 let query=adminClient().from('atlas_tasks').select('*').eq('owner',user).order('id').limit(pageSize+1);
 if(cursor)query=query.gt('id',cursor);
 const {data,error}=await query;
 if(error)throw error;
 const {items,next}=listPage((data as TaskRow[]).map(unpack));
 return json({tasks:items,next});
})}

export function POST(request:Request){return api(async()=>{
 const user=await owner();
 const parsed=taskDraft.safeParse(await body(request,6000));
 if(!parsed.success)throw new ApiError(400,'Check the title, profile and due date. Reminders need a date and time.');
 const t=parsed.data;
 const values={title:t.title,person_id:t.personId,kind:t.kind,due_on:t.dueOn,due_at:t.dueAt,completed:t.completed};
 const table=adminClient().from('atlas_tasks');
 const {data,error}=await (t.version
  ?table.update({...values,version:t.version+1}).eq('owner',user).eq('id',t.id).eq('version',t.version)
  :table.insert({...values,id:t.id,owner:user,google_event_id:t.googleEventId})).select('*').maybeSingle();
 if(error?.code==='23503')throw new ApiError(400,'Choose a profile from your own workspace.');
 if(error?.code==='23505'&&t.googleEventId&&!t.version)throw new ApiError(409,'This calendar event may already be imported. Reload your tasks and try again.');
 if(error)throw error;
 if(!data)throw new ApiError(409,'This item changed. Reload your tasks and try again.');
 return json({task:unpack(data as TaskRow)});
})}

export function DELETE(request:Request){return api(async()=>{
 const user=await owner();
 const parsed=taskDelete.safeParse(await body(request,1000));
 if(!parsed.success)throw new ApiError(400,'Choose a saved item.');
 const {id,version}=parsed.data;
 const {data,error}=await adminClient().from('atlas_tasks').delete().eq('owner',user).eq('id',id).eq('version',version).select('id').maybeSingle();
 if(error)throw error;
 if(!data)throw new ApiError(409,'This item changed. Reload your tasks and try again.');
 return json({deleted:id});
})}
