export type SpeechResult={isFinal:boolean;0:{transcript:string}};
export type SpeechSession={continuous:boolean;interimResults:boolean;lang:string;start:()=>void;stop:()=>void;abort:()=>void;onresult:((e:{resultIndex:number;results:ArrayLike<SpeechResult>})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null};
export function startDictation(recognition:SpeechSession,language:string,onText:(text:string)=>void,onEnd:()=>void,onError:(message:string)=>void){
 recognition.continuous=true;recognition.interimResults=false;recognition.lang=language;let last=-1;
 recognition.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){if(i<=last||!e.results[i].isFinal)continue;last=i;const text=e.results[i][0].transcript.trim();if(text)onText(text)}};
 recognition.onerror=e=>{onEnd();onError(e.error==='not-allowed'?'Microphone permission was denied. Your note is still here.':e.error==='no-speech'?'No speech detected. Try again.':'Voice input stopped. Your note is preserved. You can retry or type instead.')};recognition.onend=onEnd;
 recognition.start();
}
