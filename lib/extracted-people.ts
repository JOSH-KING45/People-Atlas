import {z} from 'zod';
import {normalizedDraftFields,keyName,newPersonId} from './people';
import {ApiError} from './server';

const extractionSchema=z.object({people:z.array(z.object({
 name:z.string().max(200),
 fields:z.array(z.object({label:z.string().trim().min(1).max(80).refine(label=>!!keyName(label)),value:z.string().max(2000)})).max(100),
 sourceNote:z.string().max(60000),
})).max(200)});

export function peopleFromAiOutput(output:string){
 let data:unknown;try{data=JSON.parse(output)}catch{throw new ApiError(422,'No structured result was returned. Try a smaller note.')}
 const validated=extractionSchema.safeParse(data);
 if(!validated.success)throw new ApiError(422,'The extraction needs a smaller input. Nothing has been saved.');
 const people=validated.data.people.map(p=>({id:newPersonId(),name:p.name,...normalizedDraftFields(p.fields.map(f=>[f.label,f.value])),notes:p.sourceNote}));
 if(people.some(p=>Object.values(p.fields).some(value=>value.length>2000)))throw new ApiError(422,'Some combined details are too long. Split your note into smaller parts; nothing has been saved.');
 return people;
}
