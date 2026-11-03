"use client";
import type {Person,Source} from './people';
import {newPersonId,normalizeFields,parseText} from './people';

const DB_NAME='people-atlas-guest';
const DB_VERSION=1;
const DEFAULT_SETTINGS={googleClientId:'',hasAiKey:false,aiModel:'openrouter/free',aiProvider:'openrouter'};
type StoredSource=Source&{blob:Blob};

function database(){
 return new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(DB_NAME,DB_VERSION);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('people'))db.createObjectStore('people',{keyPath:'id'});if(!db.objectStoreNames.contains('sources'))db.createObjectStore('sources',{keyPath:'id'});if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'key'})};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error||new Error('Guest storage could not open.'));
 });
}
async function transaction<T>(storeName:'people'|'sources'|'settings',mode:IDBTransactionMode,run:(store:IDBObjectStore,finish:(value:T)=>void,fail:(error:unknown)=>void)=>void){
 const db=await database();return new Promise<T>((resolve,reject)=>{const tx=db.transaction(storeName,mode);const store=tx.objectStore(storeName);let result:T;let completed=false;const finish=(value:T)=>{result=value;completed=true};const fail=(error:unknown)=>reject(error);run(store,finish,fail);tx.oncomplete=()=>{db.close();if(completed)resolve(result)};tx.onerror=()=>{db.close();reject(tx.error||new Error('Guest storage failed.'))};tx.onabort=tx.onerror});
}
function requestResult<T>(request:IDBRequest<T>,finish:(value:T)=>void,fail:(error:unknown)=>void){request.onsuccess=()=>finish(request.result);request.onerror=()=>fail(request.error)}
function body(options?:RequestInit){if(typeof options?.body!=='string')return{};return JSON.parse(options.body)}

export async function guestApiRequest(url:string,options?:RequestInit){
 const endpoint=new URL(url,location.origin);const method=options?.method||'GET';
 if(endpoint.pathname==='/api/people'&&method==='GET'){
  const people=await transaction<Person[]>('people','readonly',(store,finish,fail)=>requestResult(store.getAll(),finish,fail));
  return{people:people.sort((a,b)=>a.name.localeCompare(b.name))};
 }
 if(endpoint.pathname==='/api/people'&&method==='POST'){
  const input=body(options).people as Person[];if(!Array.isArray(input)||!input.length||input.length>200)throw new Error('Save between 1 and 200 people at a time.');
  return transaction<{saved:Person[];conflicts:string[]}>('people','readwrite',(store,finish,fail)=>{const saved:Person[]=[];const conflicts:string[]=[];let remaining=input.length;for(const person of input){const get=store.get(person.id);get.onerror=()=>fail(get.error);get.onsuccess=()=>{const old=get.result as Person|undefined;if(person.version&&old?.version!==person.version)conflicts.push(person.id);else{const now=new Date().toISOString();const next={...person,name:person.name.trim(),fields:normalizeFields(person.fields),version:(old?.version||0)+1,createdAt:old?.createdAt||now,updatedAt:now};store.put(next);saved.push(next)}if(!--remaining)finish({saved,conflicts})}}});
 }
 if(endpoint.pathname==='/api/people'&&method==='DELETE'){
  const input=body(options);await transaction<void>('people','readwrite',(store,finish,fail)=>{const get=store.get(input.id);get.onerror=()=>fail(get.error);get.onsuccess=()=>{const old=get.result as Person|undefined;if(!old||old.version!==input.version){fail(new Error('This profile changed. Refresh it before deleting.'));return}requestResult(store.delete(input.id),()=>finish(),fail)}});return{deleted:input.id};
 }
 if(endpoint.pathname==='/api/sources'&&method==='GET'){
  const records=await transaction<StoredSource[]>('sources','readonly',(store,finish,fail)=>requestResult(store.getAll(),finish,fail));
  return{sources:records.map(({blob:_,...source})=>source).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))};
 }
 if(endpoint.pathname==='/api/sources'&&method==='POST'){
  const file=(options?.body as FormData)?.get('file');if(!(file instanceof File))throw new Error('Choose a file to import.');const source:StoredSource={id:newPersonId(),name:file.name,size:file.size,createdAt:new Date().toISOString(),blob:file};await transaction<void>('sources','readwrite',(store,finish,fail)=>requestResult(store.put(source),()=>finish(),fail));const {blob:_,...metadata}=source;return{source:metadata};
 }
 if(endpoint.pathname==='/api/sources'&&method==='DELETE'){
  const input=body(options);await transaction<void>('sources','readwrite',(store,finish,fail)=>requestResult(store.delete(input.id),()=>finish(),fail));return{deleted:input.id};
 }
 if(endpoint.pathname==='/api/settings'&&method==='GET'){
  const saved=await transaction<any>('settings','readonly',(store,finish,fail)=>requestResult(store.get('config'),finish,fail));return{...DEFAULT_SETTINGS,...saved?.value,hasAiKey:false};
 }
 if(endpoint.pathname==='/api/settings'&&method==='POST'){
  const input=body(options);const value={...DEFAULT_SETTINGS,googleClientId:typeof input.googleClientId==='string'?input.googleClientId.trim():'',hasAiKey:false};await transaction<void>('settings','readwrite',(store,finish,fail)=>requestResult(store.put({key:'config',value}),()=>finish(),fail));return value;
 }
 if(endpoint.pathname==='/api/extract'&&method==='POST'){
  const input=body(options);if(input.mode==='ai')throw new Error('AI extraction needs an account. Sign in with ChatGPT, then add your API key in Connections.');const people=parseText(String(input.text||''));return{people,mode:'built-in',notice:'Built-in extraction runs on this device. Review every field before saving.'};
 }
 throw new Error('This feature is unavailable in guest mode.');
}

export async function guestSourceUrls(){
 const records=await transaction<StoredSource[]>('sources','readonly',(store,finish,fail)=>requestResult(store.getAll(),finish,fail));return Object.fromEntries(records.map(record=>[record.id,URL.createObjectURL(record.blob)]));
}
