"use client";
import {useId,useState} from 'react';
import {Plus,X,Users} from 'lucide-react';
import {CORE,type Person,keyName,birthdayParts,addBirthYear} from '@/lib/people';
import {meaningful} from '@/lib/field-filters';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Empty,EmptyHeader,EmptyTitle,EmptyDescription,EmptyMedia} from '@/components/ui/empty';
export function Choose({value,onChange,options,label,className=''}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];label:string;className?:string}){return <Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className={'choose '+className}><SelectValue placeholder={label}/></SelectTrigger><SelectContent>{options.map(o=><SelectItem value={o.value} key={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>}
export function Initials({name}:{name:string}){const colors=['blue','teal','amber','purple'];const index=[...name].reduce((a,c)=>a+c.charCodeAt(0),0)%4;return <span className={'person-avatar '+colors[index]}>{name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?'}</span>}
export function EmptyPeople({title='Your circle starts with a name.',description='Add a note or import a file to create your first profiles.',children}:{title?:string;description?:string;children?:React.ReactNode}){return <Empty className="empty-state"><EmptyHeader><EmptyMedia variant="icon"><Users/></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{children}</Empty>}
export function PersonEditor({person,onChange,original,review=false}:{person:Person;onChange:(p:Person)=>void;original?:Person;review?:boolean}){
 const [custom,setCustom]=useState(''),[expanded,setExpanded]=useState(false),[approved,setApproved]=useState<string[]>([]);const editorId=useId();
 const calculated=addBirthYear(person.fields);
 const fields=[...new Set([...(expanded?CORE:[]),...Object.keys(person.fields)])];
 const put=(key:string,value:string)=>{let next={...person.fields,[key]:value};let provenance=person.calculatedFields||[];if(key==='Age'||key==='Birthday')delete next['Estimated birth year'];if(key==='Age'&&provenance.includes('Birthday')){const b=birthdayParts(next.Birthday||'');if(b){next.Birthday=`${String(b.month).padStart(2,'0')}-${String(b.day).padStart(2,'0')}`;next=addBirthYear(next)}}if(key==='Birthday')provenance=provenance.filter(k=>k!=='Birthday');setApproved(a=>a.filter(k=>k!==key&&!(key==='Age'&&['Birthday','Estimated birth year'].includes(k))));onChange({...person,fields:next,calculatedFields:provenance})};
 return <div className="person-editor">
  <label className="field full"><span>Name <b>*</b></span><input value={person.name} maxLength={200} onChange={e=>onChange({...person,name:e.target.value})} placeholder="Full name"/></label>
  {calculated.Birthday!==person.fields.Birthday&&<p className="muted">Birthday on save: {calculated.Birthday} (year calculated from age).</p>}
  {calculated['Estimated birth year']&&<p className="muted">Estimated birth year: {calculated['Estimated birth year']}. Without a day and month, the actual year may be one year earlier.</p>}
  <div className="field-grid">{fields.map((k,index)=><div className="field" key={k}>
   <span><label htmlFor={`${editorId}-field-${index}`}>{k}</label><button className="remove-field" type="button" aria-label={`Remove ${k}`} onClick={()=>{const f={...person.fields};delete f[k];onChange({...person,fields:f})}}><X size={13}/></button></span>
   <input id={`${editorId}-field-${index}`} value={person.fields[k]||''} maxLength={2000} placeholder={k==='Birthday'?'e.g. 15 October 2004':'Not recorded'} onChange={e=>put(k,e.target.value)}/>
   {review&&meaningful(person.fields[k])&&<button type="button" className="field-confirm" aria-pressed={approved.includes(k)} onClick={()=>setApproved(a=>a.includes(k)?a.filter(x=>x!==k):[...a,k])}>{person.calculatedFields?.includes(k)||k==='Estimated birth year'?(k==='Birthday'?'Calculated year · ':'Calculated estimate · '):''}{approved.includes(k)?'Confirmed by you':'Review and confirm'}</button>}
   {original?.fields[k]&&person.fields[k]&&original.fields[k]!==person.fields[k]&&<div className="field-warning">Replaces: {original.fields[k]} <button type="button" className="text-button" onClick={()=>put(k,original.fields[k])}>Keep existing</button></div>}
   {k==='Birthday'&&person.fields[k]&&!birthdayParts(person.fields[k])&&<small className="field-warning">Use a day and month, with an optional year, for reminders.</small>}
  </div>)}</div>
  {!expanded&&<button className="text-button spaced" type="button" onClick={()=>setExpanded(true)}><Plus size={15}/> Add more details</button>}
  <div className="add-field"><input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Add a detail, e.g. Favourite food" aria-label="New field name" maxLength={80}/><button className="outline-button" disabled={!custom.trim()} onClick={()=>{const k=keyName(custom);if(!k||k==='Name'||k==='Notes')return;if(!Object.hasOwn(person.fields,k)){put(k,'');setCustom('')}}}><Plus size={16}/> Add field</button></div>
  <details className="source-note"><summary>Original note</summary><textarea maxLength={60000} aria-label="Original note" value={person.notes} onChange={e=>onChange({...person,notes:e.target.value})}/></details>
 </div>;
}
