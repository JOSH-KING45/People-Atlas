import {currentUser} from '@/app/account';
import {adminClient} from './supabase';
export class ApiError extends Error{constructor(public status:number,message:string,public code?:string){super(message)}}
export async function owner(){const user=await currentUser();if(!user)throw new ApiError(401,'People Atlas could not verify your sign-in. Sign in with email to access your saved records.');return user.id}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store'}})}
export async function api(fn:()=>Promise<Response>){try{return await fn()}catch(e){if(e instanceof ApiError)return json({error:e.message,...(e.code?{code:e.code}:{})},e.status);console.error('People Atlas request failed',e instanceof Error?e.name:'Error');return json({error:'The request could not be completed. Your draft is still here; please try again.'},500)}}
export function guard(request:Request){const origin=request.headers.get('origin');if(request.headers.get('sec-fetch-site')==='cross-site'||(origin&&origin!==new URL(request.url).origin))throw new ApiError(403,'Open People Atlas directly to make changes.')}
export async function body(request:Request,max=2_000_000){guard(request);const text=await request.text();if(text.length>max)throw new ApiError(413,'This batch is too large. Split it into smaller files or notes.');let parsed;try{parsed=JSON.parse(text)}catch{throw new ApiError(400,'The submitted data is not valid.')}if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new ApiError(400,'The submitted data must be an object.');return parsed}
async function cipherKey(){const s=process.env.SETTINGS_ENCRYPTION_KEY;if(!s)throw new ApiError(503,'Secure API key storage is not configured. Built-in extraction still works.');const bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0));return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt'])}
export async function encrypt(value:string){const iv=crypto.getRandomValues(new Uint8Array(12));const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipherKey(),new TextEncoder().encode(value)));return btoa(String.fromCharCode(...iv,...data))}
export async function decrypt(value:string){const data=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(0,12)},await cipherKey(),data.slice(12)))}
export async function userSettings(user:string){const {data,error}=await adminClient().from('settings').select('google_client_id, encrypted_ai_key, ai_model, ai_provider').eq('owner',user).maybeSingle();
 if(error) throw error;
 return data || {google_client_id:'',encrypted_ai_key:'',ai_model:'gpt-4.1-mini',ai_provider:'openai'};}
