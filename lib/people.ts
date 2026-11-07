import {meaningful} from './meaningful-value';
export type Person={id:string;name:string;fields:Record<string,string>;notes:string;createdAt?:string;updatedAt?:string;version?:number;mergeId?:string;calculatedFields?:string[]};
export type Source={id:string;name:string;size:number;createdAt:string};
export function newPersonId(){
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 // getRandomValues is also available where the newer randomUUID method is absent.
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export const CORE=['Age','Birthday','Grade / level','State of origin','Lives in'];
const aliases:Record<string,string>={name:'Name',fullname:'Name',person:'Name',age:'Age',birthday:'Birthday',birthdate:'Birthday',dateofbirth:'Birthday',dob:'Birthday',birthyear:'Birth year',yearofbirth:'Birth year',state:'State of origin',stateoforigin:'State of origin',origin:'State of origin',hometown:'Hometown',livesin:'Lives in',location:'Lives in',city:'Lives in',residence:'Lives in',address:'Address',grade:'Grade / level',level:'Grade / level',gradelevel:'Grade / level',class:'Grade / level',course:'Course',department:'Course',studies:'Course',university:'School',school:'School',hobbies:'Interests',interests:'Interests',hobby:'Interests',email:'Email',phone:'Phone',phonenumber:'Phone',occupation:'Occupation',job:'Occupation',workplace:'Workplace',notes:'Notes',sourcenotes:'Notes'};
export function keyName(k:string){const clean=k.trim().replace(/[_-]+/g,' ').trim();if(/^(phone|email) [1-9]\d*$/i.test(clean))return clean[0].toUpperCase()+clean.slice(1).toLowerCase();const alias=clean.toLowerCase().replace(/[^a-z]/g,'');return Object.hasOwn(aliases,alias)?aliases[alias]:clean.charAt(0).toUpperCase()+clean.slice(1)}
export function normalizeFieldEntries(entries:Iterable<[string,string]>){const grouped=new Map<string,Set<string>>();for(const [key,v] of entries){const label=keyName(key);const k=['Name','Notes'].includes(label)?label+' (detail)':label;let value=v.trim();if(!k||!value)continue;if(k==='State of origin')value=value.replace(/\s+state$/i,'');if(k==='Grade / level'&&/^[1-9]00$/.test(value))value+=' level';if(k==='Birthday'&&birthdayParts(value))value=formatBirthday(value);const values=grouped.get(k)||new Set<string>();values.add(value);grouped.set(k,values)}return addBirthYear(Object.fromEntries([...grouped].map(([key,values])=>[key,[...values].join('; ')])))}
export function addBirthYear(fields:Record<string,string>,now=new Date()){
 const out={...fields};const ageText=out.Age?.trim();const age=Number(ageText);const birthday=birthdayParts(out.Birthday||'');
 if(birthday?.year||out['Birth year']?.trim()){delete out['Estimated birth year'];return out;}
 if(!ageText||!Number.isInteger(age)||age<0||age>130)return out;
 let year=now.getFullYear()-age;
 if(birthday){
  if(now.getMonth()+1<birthday.month||(now.getMonth()+1===birthday.month&&now.getDate()<birthday.day))year--;
  const full=`${birthday.day} ${months[birthday.month-1]} ${year}`;
  if(birthdayParts(full)){out.Birthday=full;delete out['Estimated birth year'];return out;}
  // Conflicting leap-day/age inputs must not create an invalid date.
  return out;
 }
 if(!out['Estimated birth year']?.trim())out['Estimated birth year']=String(year);
 return out;
}
export function normalizeFields(fields:Record<string,string>){return normalizeFieldEntries(Object.entries(fields))}
// Review-only provenance; storage still uses the existing string-field schema.
export function normalizedDraftFields(entries:Iterable<[string,string]>){
 const list=[...entries];const raw=Object.fromEntries(list.map(([k,v])=>[keyName(k),v]));const fields=normalizeFieldEntries(list);
 const calculatedFields:string[]=[];
 if(!birthdayParts(raw.Birthday||'')?.year&&birthdayParts(fields.Birthday||'')?.year)calculatedFields.push('Birthday');
 if(!raw['Estimated birth year']&&fields['Estimated birth year'])calculatedFields.push('Estimated birth year');
 return {fields,calculatedFields};
}
export function normalizeName(s:string){return s.trim().replace(/\s+/g,' ').toLowerCase()}
export const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function birthdayParts(s:string):{month:number;day:number;year?:number}|null{
 if(!s)return null;const value=s.trim();let m:number,d:number,y:number|undefined;
 const iso=value.match(/^(?:(\d{4})-)?(\d{2})-(\d{2})$/);
 const numeric=value.match(/^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?$/);
 if(iso){y=iso[1]?Number(iso[1]):undefined;m=+iso[2];d=+iso[3]}
 else if(numeric){d=+numeric[1];m=+numeric[2];y=numeric[3]?+numeric[3]:undefined}
 else{
  const dayFirst=value.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?(?:,?\s+(\d{4}))?$/i);
  const monthFirst=value.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/i);
  if(!dayFirst&&!monthFirst)return null;
  const month=(dayFirst?dayFirst[2]:monthFirst![1]).toLowerCase();
  m=months.findIndex(name=>name.toLowerCase()===month||name.slice(0,3).toLowerCase()===month||(name==='September'&&month==='sept'))+1;
  d=Number(dayFirst?dayFirst[1]:monthFirst![2]);const year=(dayFirst||monthFirst)![3];y=year?Number(year):undefined;
 }
 if(!m||!d||m>12||d>new Date(Date.UTC(y??2000,m,0)).getUTCDate()||(y!==undefined&&y<1900))return null;
 return{month:m,day:d,year:y};
}
export function formatBirthday(s:string){const b=birthdayParts(s);return b?`${b.day} ${months[b.month-1]}${b.year?' '+b.year:''}`:s}
export function ageOf(p:Person){const b=birthdayParts(p.fields.Birthday||'');if(b?.year){const now=new Date();let n=now.getFullYear()-b.year;if(now.getMonth()+1<b.month||(now.getMonth()+1===b.month&&now.getDate()<b.day))n--;return n>=0?n:undefined;}const value=p.fields.Age?.trim();const a=Number(value);return value&&Number.isInteger(a)&&a>=0&&a<=130?a:undefined}
export function ageGroup(p:Person){const a=ageOf(p);return a===undefined?'Unknown':a<18?'Under 18':a<25?'18–24':a<35?'25–34':a<45?'35–44':a<60?'45–59':'60+'}
export function nextBirthday(p:Person){const b=birthdayParts(p.fields.Birthday||'');if(!b)return null;const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());let year=today.getFullYear();let date:Date;while(true){if(b.day>new Date(year,b.month,0).getDate()){year++;continue}date=new Date(year,b.month-1,b.day);if(date<today){year++;continue}break}return {person:p,date,days:Math.round((date.getTime()-today.getTime())/86400000)}}
export function dimensions(people:Person[]){return [...new Set([...CORE,'Age group','Birthday month',...people.flatMap(p=>Object.keys(p.fields))])].filter(k=>!['Name','Notes','Age'].includes(k))}
export function groupsFor(people:Person[],field:string){const groups=new Map<string,{label:string;people:Person[]}>();for(const p of people){let value=field==='Age group'?ageGroup(p):field==='Birthday month'?(()=>{const b=birthdayParts(p.fields.Birthday||'');return b?months[b.month-1]:'Unknown'})():(meaningful(p.fields[field])?p.fields[field]:'Unknown');const values=['Interests','Tags','Languages','Skills'].includes(field)?value.split(/[,;]|\s+and\s+/i):[value];for(const v of new Set(values.map(v=>v.trim()).filter(Boolean))){const key=v.toLowerCase();const g=groups.get(key)||{label:v,people:[]};if(!g.people.some(x=>x.id===p.id))g.people.push(p);groups.set(key,g)}}return [...groups.values()].sort((a,b)=>b.people.length-a.people.length||a.label.localeCompare(b.label))}
export function smartFolderCount(people:Person[]){return dimensions(people).reduce((sum,k)=>sum+groupsFor(people,k).filter(g=>g.label!=='Unknown').length,0)}
export const example="Tobi Adeyemi is 22, from Oyo State and lives in Abuja. His birthday is 15 October. He is in 300 level, studies Architecture and loves photography and football.\n\nAmara Okafor is 21. She is from Enugu State and lives in Abuja. Her birthday is 8 December. Course: Cybersecurity; Level: 200; Interests: photography, reading; Favourite colour: blue.";
export function parseText(text:string):Person[]{
 const prepared=text.replace(/\r/g,'').trim();
 const labeled=/^Name\s*:/im.test(prepared);
 const separated=prepared.replace(/([.!?])\s+(?=(?!He\b|She\b|His\b|Her\b|They\b|Their\b|It\b|The\b|My\b)[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,3}\s+(?:is|was|lives|comes|studies|works|turned)\b)/g,'$1\n\n');
 const blocks=labeled?prepared.split(/\n+(?=Name\s*:)/i):separated.split(/\n\s*\n|\n(?=(?:[-*•]\s*)?(?:Name\s*:|[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,3}\s+(?:is\b|was\b|lives\b|,\s*\d)))/);
 if(labeled&&blocks.length>1&&!/^Name\s*:/im.test(blocks[0]))blocks.splice(0,2,blocks[0]+'\n'+blocks[1]);
 return blocks.filter(Boolean).map(parseBlock).filter(p=>p.name||Object.keys(p.fields).length>0)
}
function parseBlock(raw:string):Person{const t=raw.replace(/^[\s*•-]+/,'').trim();const fields:Record<string,string>={};let name='';
 const labels=[...t.matchAll(/(?:^|[;\n]\s*|\.\s+|,\s*)([A-Za-z][A-Za-z /_'-]{0,38}):\s*([^;\n]*?)(?=(?:[,;]\s*|\.\s+)[A-Za-z][A-Za-z /_'-]{0,38}:|\n|$)/g)];for(const m of labels){const key=keyName(m[1]);const val=m[2].trim().replace(/[.]$/,'');if(key==='Name')name=val;else if(key!=='Notes')fields[key]=val;}
 const start=t.match(/^(?:I (?:met|know) |Meet |My friend |This is )?([A-Z][\p{L}'’-]+(?:[ \t]+[A-Z][\p{L}'’-]+){0,4})(?=\s+(?:is|was|lives|comes|studies|works|has|turned|will|from|aged)\b|\s*[,;:\n]|$)/iu);if(!name&&start&&!['name','age','birthday','he','she','his','her','they','their'].includes(start[1].toLowerCase()))name=start[1];
 const take=(key:string,re:RegExp,clean?:(v:string)=>string)=>{const m=t.match(re);if(m&&!fields[key])fields[key]=clean?clean(m[1]):m[1].trim().replace(/[.]$/,'')};
 take('Age',/\b(?:aged?|is|turned|turns)\s+(\d{1,3})(?:\s*(?:years?\s*old|yo|yrs?))?\b/i);take('Age',/\b(\d{1,3})\s*[- ]?(?:years?[- ]old|yo|yrs? old)\b/i);take('Age',/^[^,]+,\s*(\d{1,3})\b/);
 take('State of origin',/\b(?:from|hails from|state of origin is)\s+([\p{L} -]+?)(?:\s+state\b|(?=\s+(?:and|but|now|originally)\b|[,.;\n]|$))/iu,v=>v.trim().replace(/ State$/i,''));
 take('Lives in',/\b(?:lives? in|resides? in|based in|stays? in|living in|moved to)\s+([\p{L}\d' -]+?)(?=\s+(?:and|but|where|with)\b|[,.;\n]|$)/iu);
 take('Grade / level',/\b(\d{3})\s*[- ]?level\b/i,v=>v+' level');take('Grade / level',/\b(?:in|grade|class)\s+(SS[123]|JS[123]|JSS\s*[123]|SSS\s*[123]|grade\s*\d+|\d{1,2}(?:th|st|nd|rd) grade)\b/i);
 take('Grade / level',/\b(?:grade|level|class)\s*(?:is\s*)?(\d{1,3})\b/i);
 take('Birthday',/\b(?:birthday\s*(?:is\s*)?(?:falls on|on)?|born(?:\s+on)?|date of birth\s*(?:is)?)\s+([^;\n]+?)(?=\s+(?:and|but)\b|\.(?:\s|$)|[;\n]|$)/i);
 take('Course',/\b(?:studies|studying|study)\s+([\p{L} &'/-]+?)(?=\s+(?:at|in|and|but)\b|[,.;\n]|$)/iu);
 take('School',/\b(?:studies[^.\n]+? at|student at|school is|attends)\s+([\p{L}\d &'()-]+?)(?=\s+(?:and|but)\b|[.;\n]|$)/iu);
 take('Workplace',/\bworks?\s+(?:at|for)\s+([\p{L}\d &'()-]+?)(?=\s+(?:as|and|but|in)\b|[,.;\n]|$)/iu);
 take('Occupation',/\b(?:works? as|is (?:a|an))\s+([\p{L} -]+?)(?=\s+(?:at|and|from|in|who)\b|[,.;\n]|$)/iu);
 take('Interests',/\b(?:loves?|enjoys?|likes?|interested in|hobbies are)\s+([^.;\n]+?)(?=\s+(?:but|she|he|his|her)\b|[.;\n]|$)/i,v=>v.replace(/\s+and\s+/gi,', ').trim());
 take('Email',/([\w.+-]+@[\w.-]+\.[a-z]{2,})/i);take('Phone',/(\+?\d[\d ()-]{7,}\d)/);
 if(fields.Phone&&/^\d{4}-\d{2}-\d{2}$/.test(fields.Phone))delete fields.Phone;
 if(fields.Age&&(+fields.Age>130||+fields.Age<0))delete fields.Age;
 if(fields.Birthday&&birthdayParts(fields.Birthday))fields.Birthday=formatBirthday(fields.Birthday);
 return{id:newPersonId(),name,...normalizedDraftFields(Object.entries(fields)),notes:raw}}
export function fromRows(rows:Record<string,unknown>[],nameColumn?:string):Person[]{return rows.filter(row=>Object.values(row).some(v=>v!==''&&v!=null)).map(row=>{let name='',notes='';const fields:Record<string,string>={};for(const [k,v]of Object.entries(row)){if(v==null||v==='')continue;const key=keyName(k);const value=v instanceof Date?`${v.getUTCFullYear()}-${String(v.getUTCMonth()+1).padStart(2,'0')}-${String(v.getUTCDate()).padStart(2,'0')}`:String(v).trim();if(nameColumn?k===nameColumn:key==='Name'&&!name)name=value;else if(key==='Notes')notes=[notes,value].filter(Boolean).join('\n\n');else fields[key==='Name'?`${k.trim()} (original column)`:k]=value}return{id:newPersonId(),name,...normalizedDraftFields(Object.entries(fields)),notes:notes||Object.entries(row).map(([k,v])=>`${k}: ${v}`).join('\n')}})}
export function rowsFromGrid(grid:unknown[][]):Record<string,unknown>[] {
 const nonempty=grid.filter(row=>row.some(v=>v!==''&&v!=null));if(!nonempty.length)return[];
 const [first,...rest]=nonempty;const width=nonempty.reduce((max,row)=>Math.max(max,row.length),0);
 const headers=Array.from({length:width},(_,i)=>String(first[i]??'').trim()||`Column ${i+1}`);
 if(new Set(headers).size!==headers.length)throw new Error('The sheet has duplicate column headers. Rename them before importing.');
 return rest.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])));
}
