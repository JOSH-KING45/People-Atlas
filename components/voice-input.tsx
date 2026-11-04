'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Mic,Square,Upload,RefreshCw} from 'lucide-react';
import BrowserVoiceInput from './browser-voice-input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {normalizeAudio} from '@/lib/audio-client';
import {apiRequest} from '@/lib/api-client';
const subscribe=()=>()=>{};
const canRecord=()=>typeof navigator.mediaDevices?.getUserMedia==='function'&&'MediaRecorder' in window;
export default function VoiceInput({onText,disabled,remainingCharacters=60000}:{onText:(text:string)=>void;disabled:boolean;remainingCharacters?:number}){
 const supported=useSyncExternalStore(subscribe,canRecord,()=>null);
 const [method,setMethod]=useState('ai'),[starting,setStarting]=useState(false),[recording,setRecording]=useState(false),[seconds,setSeconds]=useState(0),[blob,setBlob]=useState<Blob|null>(null),[preview,setPreview]=useState(''),[sending,setSending]=useState(false),[transcript,setTranscript]=useState(''),[review,setReview]=useState(false),[error,setError]=useState(''),[language,setLanguage]=useState('auto');
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),stopTimer=useRef<ReturnType<typeof setTimeout>|null>(null),controller=useRef<AbortController|null>(null),alive=useRef(true);
 const clearTimers=()=>{if(timer.current)clearInterval(timer.current);if(stopTimer.current)clearTimeout(stopTimer.current);timer.current=null;stopTimer.current=null};
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();clearTimers();const r=recorder.current;if(r){r.ondataavailable=null;r.onstop=null;r.onerror=null;if(r.state!=='inactive')r.stop()}stream.current?.getTracks().forEach(t=>t.stop())}},[]);
 useEffect(()=>{if(disabled&&recorder.current?.state==='recording')recorder.current.stop()},[disabled]);
 useEffect(()=>{if(!blob)return;const url=URL.createObjectURL(blob);
  // Synchronize the media preview with its external object-URL lifetime.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setPreview(url);return()=>URL.revokeObjectURL(url);
 },[blob]);
 const start=async()=>{
  setStarting(true);setError('');setSeconds(0);
  try{
   const source=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(!alive.current){source.getTracks().forEach(t=>t.stop());return}stream.current=source;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));const r=new MediaRecorder(source,mime?{mimeType:mime}:undefined);recorder.current=r;const chunks:Blob[]=[];const began=performance.now();
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   r.onstop=()=>{clearTimers();source.getTracks().forEach(t=>t.stop());if(!alive.current)return;setRecording(false);if(chunks.length)setBlob(new Blob(chunks,{type:r.mimeType||'audio/webm'}));else setError('The microphone returned no audio. Try again or upload a recording.')};
   r.onerror=()=>{if(alive.current)setError('Recording stopped unexpectedly. Any captured audio remains available.');if(r.state!=='inactive')r.stop();else{clearTimers();source.getTracks().forEach(t=>t.stop());if(alive.current)setRecording(false)}};
   r.start(500);setRecording(true);timer.current=setInterval(()=>setSeconds(Math.floor((performance.now()-began)/1000)),500);stopTimer.current=setTimeout(()=>{if(r.state==='recording')r.stop()},89000);
  }catch{stream.current?.getTracks().forEach(t=>t.stop());if(alive.current)setError('Microphone access could not start. Allow permission, upload an audio file, or use browser dictation.')}finally{if(alive.current)setStarting(false)}
 };
 const transcribe=async()=>{if(!blob)return;setSending(true);setError('');const abort=new AbortController();controller.current=abort;
  try{const audio=await normalizeAudio(blob);if(!alive.current)return;const result=await apiRequest('/api/transcribe?language='+language,{method:'POST',headers:{'Content-Type':'audio/wav'},body:audio,signal:abort.signal});if(alive.current){setTranscript(result.text);setReview(true)}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'Transcription failed. Your recording is still here.')}finally{if(alive.current)setSending(false)}
 };
 const busy=recording||starting||sending;
 const discard=()=>{setBlob(null);setPreview('');setTranscript('');setError('');setSeconds(0)};
 return <div className="voice-capture ai-voice-capture"><label className="voice-method">Voice input<select value={method} disabled={busy} onChange={e=>setMethod(e.target.value)}><option value="ai">AI transcription · Whisper</option><option value="browser">Browser dictation</option></select></label>
 {method==='browser'?<BrowserVoiceInput onText={onText} disabled={disabled}/>:<>
 <p className="muted">Record or choose a clip up to 90 seconds. Selecting Transcribe sends the audio to Groq Whisper. Review the transcript before adding it to your note.</p>
 <div className="action-row"><button type="button" className={'outline-button'+(recording?' voice-active':'')} disabled={disabled||sending||starting||(!recording&&(supported!==true||!!blob))} onClick={()=>recording?recorder.current?.stop():void start()}>{recording?<Square size={16}/>:<Mic size={16}/>} {starting?'Opening microphone…':recording?'Stop recording':'Record with AI'}</button><label className="outline-button photo-picker"><Upload size={16}/> Choose audio<input type="file" accept="audio/*,.mp3,.m4a,.mp4,.wav,.webm,.ogg,.flac" disabled={disabled||busy||!!blob} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(file.size>15*1024*1024){setError('Choose an audio file up to 15 MB.');return}setError('');setBlob(file)}}/></label><span role="status" aria-live="polite">{recording?`Recording · ${seconds}s / 90s`:sending?'Transcribing with Whisper…':''}</span></div>
 {supported===false&&<p className="muted">Recording is unavailable in this browser. Choose an audio file or try browser dictation.</p>}
 {blob&&<div className="recording-preview"><audio controls src={preview} aria-label="Preview your recording"/><label className="voice-language">Speech language<select value={language} disabled={sending} onChange={e=>setLanguage(e.target.value)}><option value="auto">Detect automatically</option><option value="en">English / Nigerian English</option><option value="fr">French</option><option value="es">Spanish</option><option value="pt">Portuguese</option><option value="ar">Arabic</option></select></label><div className="action-row"><button type="button" className="primary-button" disabled={disabled||busy} onClick={()=>void transcribe()}><RefreshCw size={16}/>{sending?'Transcribing…':transcript?'Transcribe again':'Transcribe recording'}</button>{transcript&&<button type="button" className="outline-button" onClick={()=>setReview(true)}>Review transcript</button>}<a className="text-button" href={preview} download={blob instanceof File?blob.name:'people-atlas-recording.'+(blob.type.includes('mp4')?'mp4':'webm')}>Download recording</a><button type="button" className="quiet-button" disabled={busy} onClick={discard}>Discard recording & transcript</button></div><p className="muted">Recording stays in this tab for retry until you leave or discard it. It is not saved to your account.</p></div>}
 {error&&<p role="alert" className="error-banner">{error}</p>}
 </>}
 <Dialog open={review} onOpenChange={setReview}><DialogContent className="transcript-dialog"><DialogHeader><DialogTitle>Review your transcript</DialogTitle><DialogDescription>Whisper can mishear names, accents and dates. Correct the text before adding it to your note. No profiles have been saved.</DialogDescription></DialogHeader><label className="field">Transcript<textarea value={transcript} maxLength={60000} onChange={e=>setTranscript(e.target.value)} rows={8}/></label>{transcript.trim().length>remainingCharacters&&<p role="alert">Your note has room for {remainingCharacters} more characters. Shorten this transcript or the existing note first.</p>}<div className="action-row"><button type="button" className="outline-button" onClick={()=>setReview(false)}>Keep recording for later</button><button type="button" className="primary-button" disabled={disabled||!transcript.trim()||transcript.trim().length>remainingCharacters} onClick={()=>{onText(transcript.trim());setReview(false);discard()}}>Add transcript to note</button></div></DialogContent></Dialog>
 </div>;
}
