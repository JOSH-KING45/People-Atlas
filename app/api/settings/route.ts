import {googleConnection} from '@/lib/google-config';
import {adminClient} from '@/lib/supabase';
import {api,body,json,owner,userSettings,encrypt,ApiError} from '@/lib/server';
import {isAiProvider} from '@/lib/ai-providers';
export function GET(){return api(async()=>{
 const s=await userSettings(await owner());
 return json({...googleConnection(s.google_client_id),hasAiKey:!!s.encrypted_ai_key,aiModel:s.ai_model,aiProvider:s.ai_provider});
})}
export function POST(request:Request){return api(async()=>{
 const u=await owner();const input=await body(request,5000);const old=await userSettings(u);
 const provider=input.aiProvider??old.ai_provider;
 if(input.aiProvider===undefined&&old.ai_provider!=='openai')throw new ApiError(409,'Refresh People Atlas before changing your provider settings.');
 if(!isAiProvider(provider))throw new ApiError(400,'Choose a supported AI provider.');
 const google=googleConnection().googleManaged?old.google_client_id:typeof input.googleClientId==='string'?input.googleClientId.trim():old.google_client_id;
 if(google&&!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(google))throw new ApiError(400,'Enter a valid Google OAuth web client ID.');
 const model=typeof input.aiModel==='string'?input.aiModel.trim():old.ai_model;
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(model))throw new ApiError(400,'Enter a valid model ID from your selected provider.');
 const suppliedKey=typeof input.aiKey==='string'?input.aiKey.trim():'';
 if(suppliedKey.length>1000||/[\r\n]/.test(suppliedKey))throw new ApiError(400,'Enter a valid API key.');
 // Never reuse a credential with a different provider.
 if(provider!==old.ai_provider&&!suppliedKey&&input.removeAiKey!==true)throw new ApiError(400,'Enter an API key for the new provider before saving.');
 let key=old.encrypted_ai_key;
 if(input.removeAiKey===true)key='';else if(suppliedKey)key=await encrypt(suppliedKey);
 const {error}=await adminClient().from('settings').upsert({owner:u,google_client_id:google,encrypted_ai_key:key,ai_model:model,ai_provider:provider});
 if(error) throw error;
 return json({...googleConnection(google),hasAiKey:!!key,aiModel:model,aiProvider:provider});
})}
