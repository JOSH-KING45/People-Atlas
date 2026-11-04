import {adminClient} from './supabase';
import {ApiError} from './server';
import {validateWav} from './audio';
export function speechAvailable(){return !!process.env.SHARED_GROQ_API_KEY?.trim()}
export async function transcribeAudio(bytes:Uint8Array,language:string){
 if(!speechAvailable())throw new ApiError(503,'AI transcription is not configured. Use browser dictation or type your note.');
 if(!['auto','en','fr','es','pt','ar'].includes(language))throw new ApiError(400,'Choose a supported speech language.');
 let duration:number;try{duration=validateWav(bytes)}catch(e){throw new ApiError(400,(e as Error).message)}
 const {data,error}=await adminClient().rpc('atlas_claim_speech_request',{audio_seconds:Math.max(10,Math.ceil(duration))});if(error)throw new ApiError(503,'AI transcription is temporarily unavailable. Your recording is kept here for retry.');if(!data)throw new ApiError(429,'The shared voice quota is busy or exhausted. Keep this recording and retry later, or use browser dictation.');
 const form=new FormData();const copy=new ArrayBuffer(bytes.length);new Uint8Array(copy).set(bytes);form.append('file',new Blob([copy],{type:'audio/wav'}),'recording.wav');form.append('model','whisper-large-v3');form.append('response_format','verbose_json');form.append('temperature','0');if(language!=='auto')form.append('language',language);
 const signal=AbortSignal.timeout(60000);let response:Response;
 try{response=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',redirect:'manual',headers:{Authorization:`Bearer ${process.env.SHARED_GROQ_API_KEY!.trim()}`},body:form,signal})}catch{throw new ApiError(signal.aborted?504:502,signal.aborted?'Transcription took too long. Your recording is kept for retry.':'Groq could not be reached. Your recording is kept for retry.')}
 if(!response.ok){if(response.status===429)throw new ApiError(429,'Groq reported a speech usage limit. Your recording is kept for retry.');if([401,403].includes(response.status))throw new ApiError(503,'The shared key cannot access the speech model. Your recording is kept for retry.');throw new ApiError(502,'The speech service could not transcribe this recording. Retry or use browser dictation.')}
 let result;try{result=await response.json()}catch{throw new ApiError(502,'The speech service returned an unreadable result. Your recording is kept for retry.')}
 if(!result||typeof result.text!=='string'||!result.text.trim()||result.text.length>60000||result.error)throw new ApiError(422,'No usable transcript was returned. Your recording is kept for retry.');
 if(Array.isArray(result.segments)&&result.segments.length&&result.segments.every((s:{no_speech_prob?:number})=>typeof s?.no_speech_prob==='number'&&s.no_speech_prob>=.8))throw new ApiError(422,'No clear speech was detected. Try a clearer recording.');
 return {text:result.text.trim(),model:'whisper-large-v3',duration:Math.round(duration)};
}
