'use client';
import {encodeWav,MAX_AUDIO_SECONDS} from './audio';
export async function normalizeAudio(blob:Blob){
 if(blob.size>15*1024*1024)throw new Error('Choose an audio file up to 15 MB and 90 seconds.');
 const context=new AudioContext();
 try{
  const decoded=await context.decodeAudioData(await blob.arrayBuffer());
  if(!Number.isFinite(decoded.duration)||decoded.duration<.25||decoded.duration>MAX_AUDIO_SECONDS+.1)throw new Error('Use a recording between 0.25 and 90 seconds. Split longer recordings into shorter clips.');
  const offline=new OfflineAudioContext(1,Math.min(MAX_AUDIO_SECONDS*16000,Math.ceil(decoded.duration*16000)),16000);const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();const rendered=await offline.startRendering();
  return new Blob([encodeWav(rendered.getChannelData(0))],{type:'audio/wav'});
 }finally{await context.close()}
}
