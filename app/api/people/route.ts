import {afterId,listPage,pageSize} from '@/lib/list-page';
import {adminClient} from '@/lib/supabase';
import {normalizeFields} from '@/lib/people';
import {api,body,json,owner,ApiError} from '@/lib/server';
import {z} from 'zod';
const personSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(200),fields:z.record(z.string().trim().min(1).max(80),z.string().max(2000)).refine(v=>Object.keys(v).length<=100),notes:z.string().max(60000),version:z.number().int().positive().optional()});
type ProfileRow = {id:string;name:string;fields:Record<string,string>;notes:string;created_at:string;updated_at:string;version:number};
function unpack(r:ProfileRow){return{id:r.id,name:r.name,fields:r.fields,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at,version:r.version}}
export function GET(request:Request){return api(async()=>{
 const u=await owner(),cursor=afterId(request);
 let query=adminClient().from('people').select('*').eq('owner',u).order('id').limit(pageSize+1);
 if(cursor)query=query.gt('id',cursor);
 const {data,error}=await query;
 if(error)throw error;
 const {items,next}=listPage((data as ProfileRow[]).map(unpack));
 return json({people:items,next});
})}
export function POST(request:Request){return api(async()=>{const u=await owner();const input=z.object({people:z.array(personSchema).min(1).max(200)}).safeParse(await body(request));if(!input.success)throw new ApiError(400,'Check that every profile has a name, valid fields, and no more than 200 people per batch.');const rows=input.data.people.map(p=>({...p,fields:normalizeFields(p.fields)}));if(!z.array(personSchema).safeParse(rows).success)throw new ApiError(400,'Check field names and keep each combined detail under 2,000 characters.');if(new Set(rows.map(p=>p.id)).size!==rows.length)throw new ApiError(400,'Two drafts target the same profile. Save them separately.');const {data,error}=await adminClient().rpc('atlas_save_people',{account_id:u,drafts:rows});if(error)throw error;const saved=(data as ProfileRow[]).map(unpack);return json({saved,conflicts:rows.filter(p=>!saved.some(s=>s.id===p.id)).map(p=>p.id)})})}
export function DELETE(request:Request){return api(async()=>{const u=await owner();const {id,version}=await body(request,1000);if(typeof id!=='string'||!Number.isInteger(version))throw new ApiError(400,'Choose a saved profile.');const {data:deleted,error}=await adminClient().from('people').delete().eq('id',id).eq('owner',u).eq('version',version).select('id').maybeSingle();if(error)throw error;if(!deleted)throw new ApiError(409,'This profile has changed. Refresh it before deleting.');return json({deleted:id})})}
