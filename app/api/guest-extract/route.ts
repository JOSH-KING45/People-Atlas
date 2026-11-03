import {extractWithAi} from '@/lib/ai-extraction';
import {AI_PROVIDERS,isAiProvider} from '@/lib/ai-providers';
import {peopleFromAiOutput} from '@/lib/extracted-people';
import {api,body,json,ApiError} from '@/lib/server';
import {extractWithSharedAi} from '@/lib/shared-ai';

export function POST(request:Request){return api(async()=>{
 const input=await body(request,120000);
 const {text,provider,key,model}=input;
 if(typeof text!=='string'||!text.trim()||text.length>60000)throw new ApiError(400,'Enter between 1 and 60,000 characters. Split longer documents into smaller parts.');
 if(key===undefined){
  const extracted=await extractWithSharedAi(text);
  const people=peopleFromAiOutput(extracted.output);
  return json({people,mode:'ai',aiModel:extracted.model,notice:`Read with ${extracted.model} using included AI. Review these fields against the original text before saving.`});
 }
 if(!isAiProvider(provider))throw new ApiError(400,'Choose a supported AI provider.');
 if(typeof key!=='string'||!key.trim()||key.length>1000)throw new ApiError(400,`Enter a valid ${AI_PROVIDERS[provider].label} API key.`);
 if(typeof model!=='string'||!model.trim()||model.length>200)throw new ApiError(400,'Enter a valid text model ID.');
 const extracted=await extractWithAi(provider,key.trim(),model.trim(),text);
 const people=peopleFromAiOutput(extracted.output);
 return json({people,mode:'ai',aiModel:extracted.model,notice:`Read with ${extracted.model}. AI can misread details. Review these fields against the original text before saving. Your guest API key was not stored.`});
})}
