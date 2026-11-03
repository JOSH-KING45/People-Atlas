import {extractWithAi} from '@/lib/ai-extraction';
import {api,body,json,owner,userSettings,decrypt,ApiError} from '@/lib/server';
import {parseText} from '@/lib/people';
import {peopleFromAiOutput} from '@/lib/extracted-people';
import {extractWithSharedAi} from '@/lib/shared-ai';

export function POST(request:Request){return api(async()=>{
 const user=await owner();
 const {text,mode}=await body(request,100000);
 if(typeof text!=='string'||!text.trim()||text.length>60000)throw new ApiError(400,'Enter between 1 and 60,000 characters. Split longer documents into smaller parts.');
 if(mode!==undefined&&mode!=='ai'&&mode!=='built-in')throw new ApiError(400,'Choose AI extraction or the built-in reader.');
 if(mode!=='ai'){
  const people=parseText(text);
  if(people.length>200)throw new ApiError(400,'Please import at most 200 people at a time.');
  return json({people,mode:'built-in',notice:'Built-in extraction recognizes common wording and labeled details. Review each field; the full original note is preserved.'});
 }
 const settings=await userSettings(user);
 const extracted=settings.encrypted_ai_key
  ?await extractWithAi(settings.ai_provider,await decrypt(settings.encrypted_ai_key),settings.ai_model,text)
  :await extractWithSharedAi(text);
 const people=peopleFromAiOutput(extracted.output);
 return json({people,mode:'ai',aiModel:extracted.model,notice:`Read with ${extracted.model}. AI can misread details. Review these fields against the original text before saving.`});
})}
