import {adminClient} from './supabase';
import {extractWithAi} from './ai-extraction';
import {RECOMMENDED_OPENROUTER_MODEL} from './ai-providers';
import {ApiError} from './server';

export function sharedAiAvailable(){return typeof process.env.SHARED_OPENROUTER_API_KEY==='string'&&!!process.env.SHARED_OPENROUTER_API_KEY!.trim()}
export async function extractWithSharedAi(text:string){
 if(!sharedAiAvailable())throw new ApiError(503,'Included AI is not configured yet. Use the built-in reader or add your own key in Connections.');
 const {data,error}=await adminClient().rpc('atlas_claim_ai_request');
 if(error)throw new ApiError(503,'Included AI is temporarily unavailable.');
 if(!data)throw new ApiError(429,'Included AI is busy. Retry in a minute or use built-in extraction.');
 // The visitor cannot select a paid model, provider, endpoint or credential.
 return extractWithAi('openrouter',process.env.SHARED_OPENROUTER_API_KEY!.trim(),RECOMMENDED_OPENROUTER_MODEL,text);
}
