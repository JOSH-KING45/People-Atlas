// Development-only UI fixture. The harness HTML is never included in public builds.
import React from 'react';
import {AppearanceProvider} from '../../components/appearance';
import {createRoot} from 'react-dom/client';
import PeopleWorkspace from '../../app/people-workspace';
import {parseText,normalizeFields,newPersonId,type Person,type Source} from '../../lib/people';
import '../../app/globals.css';

let people:Person[]=[
 {id:'12345678-1234-4234-8234-123456789abc',name:'Test Alex',fields:{Age:'21',Birthday:'15 October','Lives in':'Abuja','State of origin':'Oyo',Interests:'music, coding'},notes:'Fictional test record.',version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
 {id:'22345678-1234-4234-8234-123456789abc',name:'Test Nia',fields:{Age:'19',Birthday:'11 June','Lives in':'Abuja','State of origin':'Enugu',Interests:'photography'},notes:'Fictional test record.',version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
];
let settings={googleClientId:'',hasAiKey:true,aiProvider:'openrouter',aiModel:'openrouter/free'};
let sources:Source[]=[];
let failNext=false;
const nativeFetch=window.fetch.bind(window);
window.fetch=async(input,options)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.href);
 if(url.origin!==window.location.origin)throw new Error('External calls are disabled in the UI fixture.');
 if(!url.pathname.startsWith('/api/'))return nativeFetch(input,options);
 if(failNext){failNext=false;return Response.json({error:'Simulated service failure. Your draft is preserved.'},{status:503})}
 const method=options?.method||'GET';const body=typeof options?.body==='string'?JSON.parse(options.body):{};
 if(url.pathname==='/api/settings'){
  if(method==='POST')settings={...settings,aiProvider:body.aiProvider,aiModel:body.aiModel,hasAiKey:!body.removeAiKey};
  return Response.json(settings);
 }
 if(url.pathname==='/api/sources'){
  if(method==='POST'){
   const file=(options?.body as FormData).get('file') as File;
   const source={id:newPersonId(),name:file.name,size:file.size,createdAt:new Date().toISOString()};sources=[source,...sources];return Response.json({source});
  }
  return Response.json({sources});
 }
 if(url.pathname==='/api/extract')return Response.json({people:parseText(body.text),notice:body.mode==='ai'?'Simulated AI result for interface testing.':'Built-in extraction for interface testing.',mode:body.mode});
 if(url.pathname==='/api/people'){
  if(method==='DELETE'){people=people.filter(p=>p.id!==body.id);return Response.json({deleted:body.id})}
  if(method==='POST'){
   const saved=body.people.map((p:Person)=>({...p,fields:normalizeFields(p.fields),version:(p.version||0)+1,createdAt:p.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}));
   for(const p of saved)people=[...people.filter(old=>old.id!==p.id),p];
   return Response.json({saved,conflicts:[]});
  }
  return Response.json({people});
 }
 throw new Error('Unexpected fixture API request.');
};

createRoot(document.getElementById('root')!).render(<>
 <div style={{padding:'8px 16px',background:'#fff3c4',color:'#453812',fontSize:14}}>Interface test · fictional records · external calls disabled <button style={{marginLeft:16,textDecoration:'underline'}} onClick={()=>{failNext=true}}>Fail next request</button></div>
 <AppearanceProvider><PeopleWorkspace signInHref='/signin-with-chatgpt?return_to=%2F'/></AppearanceProvider>
</>);
