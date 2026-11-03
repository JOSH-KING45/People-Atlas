import {env} from 'cloudflare:workers';
import {extractWithAi} from './ai-extraction';
import {RECOMMENDED_OPENROUTER_MODEL} from './ai-providers';
import {ApiError} from './server';

export function sharedAiAvailable(){return typeof (env as any).SHARED_OPENROUTER_API_KEY==='string'&&!!(env as any).SHARED_OPENROUTER_API_KEY.trim()}
export async function extractWithSharedAi(text:string){
 if(!sharedAiAvailable())throw new ApiError(503,'Included AI is not configured yet. Use the built-in reader or add your own key in Connections.');
 // The visitor cannot select a paid model, provider, endpoint or credential.
 return extractWithAi('openrouter',(env as any).SHARED_OPENROUTER_API_KEY.trim(),RECOMMENDED_OPENROUTER_MODEL,text);
}
