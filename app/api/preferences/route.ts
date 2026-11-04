import {adminClient} from '@/lib/supabase';
import {api,body,json,owner,ApiError} from '@/lib/server';
import {validatePreference} from '@/lib/personalization';
export function GET(){return api(async()=>{const u=await owner();const {data,error}=await adminClient().from('atlas_preferences').select('key,value').eq('owner',u);if(error)throw error;return json({preferences:Object.fromEntries((data||[]).map(r=>[r.key,r.value]))})})}
export function POST(request:Request){return api(async()=>{
 const u=await owner();const input=await body(request,5000);let checked;
 try{checked=validatePreference(input.key,input.value,u)}catch(e){throw new ApiError(400,(e as Error).message)}
 if(checked.key.startsWith('person:')){const {data,error}=await adminClient().from('people').select('id').eq('owner',u).eq('id',checked.key.slice(7)).maybeSingle();if(error)throw error;if(!data)throw new ApiError(404,'Save this person before adding a photo.')}
 if(checked.value.photo){const {data,error}=await adminClient().storage.from('atlas-images').info(String(checked.value.photo));if(error||!data)throw new ApiError(400,'Upload the picture before saving it.')}
 const {error}=await adminClient().from('atlas_preferences').upsert({owner:u,...checked},{onConflict:'owner,key'});if(error)throw error;return json(checked);
})}
