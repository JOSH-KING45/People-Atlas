import {ageOf,ageGroup,addBirthYear,birthdayParts,formatBirthday,keyName,months,type Person} from './people';

export type FieldFilter={field:string;value?:string;missing?:boolean};
import {meaningful,formatValue} from './meaningful-value';
export {meaningful,formatValue} from './meaningful-value';
export function fieldValue(p:Person,field:string):string{
 if(field==='Age'){const age=ageOf(p);return age===undefined?'':String(age)}
 if(field==='Age group')return ageOf(p)===undefined?'':ageGroup(p);
 const birthday=birthdayParts(p.fields.Birthday||'');
 if(field==='Birthday month')return birthday?months[birthday.month-1]:'';
 if(field==='Birth year'){
  const calculated=addBirthYear({Age:p.fields.Age||'',Birthday:meaningful(p.fields.Birthday)?p.fields.Birthday:''});
  const year=birthday?.year||birthdayParts(calculated.Birthday||'')?.year;
  return formatValue(p.fields['Birth year'])||(year?String(year):formatValue(p.fields['Estimated birth year'])||formatValue(calculated['Estimated birth year']));
 }
 const raw=p.fields[field]??Object.entries(p.fields).find(([k])=>keyName(k)===keyName(field))?.[1];
 return field==='Birthday'&&meaningful(raw)?formatBirthday(String(raw)):formatValue(raw);
}
export function fieldValues(p:Person,field:string):string[]{
 const value=fieldValue(p,field);if(!value)return [];
 return ['Interests','Tags','Languages','Skills','Relationship'].includes(field)?value.split(/[,;]|\s+and\s+/i).map(v=>v.trim()).filter(meaningful):[value];
}
export function filterFields(people:Person[]){return [...new Set(['Phone','Email','Birthday','Age','Birth year','School','Course','Workplace','Lives in','Interests','Relationship','Grade / level','State of origin','Age group','Birthday month',...people.flatMap(p=>Object.keys(p.fields))])].filter(k=>!['Name','Notes'].includes(k))}
export function valueOptions(people:Person[],field:string){
 const values=new Map<string,string>();for(const p of people)for(const v of fieldValues(p,field))values.set(v.toLocaleLowerCase(),v);
 if(field==='Birthday')for(const month of months)if(people.some(p=>fieldValue(p,'Birthday month')===month))values.set(month.toLowerCase(),month);
 return [...values.values()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
export function matchesFilter(p:Person,filter:FieldFilter){
 const values=fieldValues(p,filter.field);if(filter.missing)return !values.length;
 if(!values.length)return false;if(!filter.value)return true;
 const wanted=filter.value.trim().toLocaleLowerCase();
 return values.some(v=>v.toLocaleLowerCase()===wanted)||(filter.field==='Birthday'&&fieldValue(p,'Birthday month').toLowerCase()===wanted);
}
export function matchesSearch(p:Person,search:string){
 const words=search.toLowerCase().trim().split(/\s+/).filter(Boolean).filter(w=>!['and','in','at','the','with','who','are'].includes(w));
 const haystack=[p.name,p.notes,...Object.entries(p.fields).flatMap(([k,v])=>meaningful(v)?[k,formatValue(v)]:[]),fieldValue(p,'Birthday month')].join(' ').toLowerCase();
 return words.every(word=>{const w=word.replace(/birthdays?/g,'birthday').replace(/photographers?/g,'photograph');return haystack.includes(w)||(w==='students'||w==='student')&&meaningful(p.fields.School||p.fields.Course)});
}
export function filterPeople(people:Person[],filters:FieldFilter[],search=''){return people.filter(p=>filters.every(f=>matchesFilter(p,f))&&matchesSearch(p,search))}
