import {afterId,listPage,pageSize} from '@/lib/list-page';
import {api,body,json,owner,ApiError} from '@/lib/server';
import {adminClient} from '@/lib/supabase';
import {z} from 'zod';
const bucketName='atlas-originals';
const nameSchema=z.string().trim().min(1).max(240).regex(/^[^\/\\\x00-\x1f]+\.(pdf|docx|csv|tsv|xlsx|txt|json)$/i);
const upload=z.object({name:nameSchema,size:z.number().int().min(0).max(15*1024*1024)});
const uuid=z.string().uuid();
export function GET(request:Request){return api(async()=>{
 const account=await owner(),client=adminClient(),id=new URL(request.url).searchParams.get('id');
 if(id){
  if(!uuid.safeParse(id).success)throw new ApiError(400,'Invalid file.');
  const {data:file,error}=await client.from('sources').select('object_key,name').eq('id',id).eq('owner',account).maybeSingle();
  if(error)throw error;
  if(!file)throw new ApiError(404,'File not found.');
  const {data,error:signError}=await client.storage.from(bucketName).createSignedUrl(file.object_key,60,{download:file.name});
  if(signError)throw signError;
  return new Response(null,{status:302,headers:{Location:data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }
 const cursor=afterId(request);
 let query=client.from('sources').select('id,name,size,createdAt:created_at').eq('owner',account).order('id').limit(pageSize+1);
 if(cursor)query=query.gt('id',cursor);
 const {data,error}=await query;
 if(error)throw error;
 const {items,next}=listPage(data);return json({sources:items,next});
})}
export function POST(request:Request){return api(async()=>{
 const account=await owner(),input=await body(request,2048),metadata=upload.safeParse(input);
 if(!metadata.success)throw new ApiError(400,'Choose a supported file up to 15 MB.');
 const client=adminClient(),bucket=client.storage.from(bucketName);
 if(input.action==='prepare'){
  const id=crypto.randomUUID();
  const {data,error}=await bucket.createSignedUploadUrl(account+'/'+id);
  if(error)throw error;
  return json({id,url:data.signedUrl});
 }
 if(input.action!=='finish'||!uuid.safeParse(input.id).success)throw new ApiError(400,'Invalid upload.');
 const key=account+'/'+input.id;
 const {data:file,error}=await bucket.info(key);
 if(error||!file||file.metadata?.size!==metadata.data.size)throw new ApiError(400,'The original upload could not be verified.');
 const {error:saveError}=await client.from('sources').upsert({id:input.id,owner:account,name:metadata.data.name,size:metadata.data.size,object_key:key},{onConflict:'id',ignoreDuplicates:true});
 if(saveError)throw saveError;
 const {data:source,error:readError}=await client.from('sources').select('id,name,size,createdAt:created_at').eq('owner',account).eq('id',input.id).single();
 if(readError)throw readError;
 return json({source});
})}
export function DELETE(request:Request){return api(async()=>{
 const account=await owner(),{id}=await body(request,1000),client=adminClient();
 if(!uuid.safeParse(id).success)throw new ApiError(400,'Choose a source file.');
 const {data:file,error}=await client.from('sources').select('object_key').eq('id',id).eq('owner',account).maybeSingle();
 if(error)throw error;
 if(!file)throw new ApiError(404,'File not found.');
 const {error:storageError}=await client.storage.from(bucketName).remove([file.object_key]);
 if(storageError)throw storageError;
 const {error:deleteError}=await client.from('sources').delete().eq('id',id).eq('owner',account);
 if(deleteError)throw deleteError;
 return json({deleted:id});
})}
