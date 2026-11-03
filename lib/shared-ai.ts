import {adminClient} from './supabase';
import {extractWithAi} from './ai-extraction';
import {RECOMMENDED_OPENROUTER_MODEL} from './ai-providers';
import {ApiError} from './server';

function sharedConfig(){
 const groqKey=process.env.SHARED_GROQ_API_KEY?.trim();
 const groqModel=process.env.SHARED_GROQ_MODEL?.trim();
 if(groqKey)return groqModel?{provider:'groq' as const,key:groqKey,model:groqModel}:null;
 const key=process.env.SHARED_OPENROUTER_API_KEY?.trim();
 return key?{provider:'openrouter' as const,key,model:RECOMMENDED_OPENROUTER_MODEL}:null;
}
export function sharedAiAvailable(){return !!sharedConfig()}
export async function extractWithSharedAi(text:string){
 const config=sharedConfig();
 if(!config)throw new ApiError(503,'Included AI is not configured yet. Use the built-in reader or add your own key in Connections.');
 const {data,error}=await adminClient().rpc('atlas_claim_ai_request');
 if(error)throw new ApiError(503,'Included AI is temporarily unavailable.');
 if(!data)throw new ApiError(429,'Included AI is busy. Retry in a minute or use built-in extraction.');
 // The visitor cannot select a paid model, provider, endpoint or credential.
 return extractWithAi(config.provider,config.key,config.model,text);
}
