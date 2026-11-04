'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Mic,Square} from 'lucide-react';
import {toast} from 'sonner';
import {startDictation,type SpeechSession as Speech} from '@/lib/voice';
type SpeechWindow=Window&{SpeechRecognition?:new()=>Speech;webkitSpeechRecognition?:new()=>Speech};
const subscribe=()=>()=>{};
const supportedSpeech=()=>{const w=window as SpeechWindow;return !!(w.SpeechRecognition||w.webkitSpeechRecognition)};
export default function VoiceInput({onText,disabled}:{onText:(text:string)=>void;disabled:boolean}){
 const supported=useSyncExternalStore(subscribe,supportedSpeech,()=>null);
 const [listening,setListening]=useState(false),[language,setLanguage]=useState('en-NG');const speech=useRef<Speech|null>(null),callback=useRef(onText);
 useEffect(()=>{callback.current=onText},[onText]);
 useEffect(()=>{return()=>{const r=speech.current;if(r){r.onresult=null;r.onend=null;r.onerror=null;r.abort()}}},[]);
 useEffect(()=>{if(disabled)speech.current?.stop()},[disabled]);
 const toggle=()=>{if(listening){speech.current?.stop();return}const w=window as SpeechWindow;const Constructor=w.SpeechRecognition||w.webkitSpeechRecognition;if(!Constructor)return;const recognition=new Constructor();speech.current=recognition;try{startDictation(recognition,language,text=>callback.current(text),()=>setListening(false),message=>toast.error(message));setListening(true)}catch{setListening(false);toast.error('Voice input could not start. Try again or type your note.')}
 };
 return <div className="voice-capture"><div className="action-row"><button type="button" className={'outline-button'+(listening?' voice-active':'')} aria-pressed={listening} disabled={disabled||supported!==true} onClick={toggle}>{listening?<Square size={16}/>:<Mic size={16}/>} {listening?'Stop dictation':'Add with voice'}</button><label className="voice-language">Voice language<select value={language} disabled={listening} onChange={e=>setLanguage(e.target.value)}><option value="en-NG">English (Nigeria)</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="fr-FR">French</option><option value="es-ES">Spanish</option><option value="pt-BR">Portuguese</option><option value="ar-SA">Arabic</option></select></label><span role="status" aria-live="polite">{listening?'Listening… Speak your note.':''}</span></div><p className="muted">{supported===false?'Voice input is unavailable in this browser. Try a supported Chrome or Edge browser, or type your note.':'Your browser may send audio to its speech service. Dictation adds editable text only. Review it before extracting or saving.'}</p></div>;
}
