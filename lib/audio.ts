export const MAX_AUDIO_SECONDS=90;
export const MAX_AUDIO_BYTES=44+16000*2*MAX_AUDIO_SECONDS;
export function encodeWav(samples:Float32Array){
 const buffer=new ArrayBuffer(44+samples.length*2),view=new DataView(buffer);
 const word=(offset:number,text:string)=>{for(let i=0;i<text.length;i++)view.setUint8(offset+i,text.charCodeAt(i))};
 word(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,samples.length*2,true);
 for(let i=0;i<samples.length;i++){const s=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,Math.round(s*(s<0?32768:32767)),true)}return buffer;
}
export function validateWav(bytes:Uint8Array){
 if(bytes.byteLength<44||bytes.byteLength>MAX_AUDIO_BYTES)throw new Error('Use audio between 0.25 and 90 seconds.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),word=(offset:number)=>String.fromCharCode(...bytes.slice(offset,offset+4));
 if(word(0)!=='RIFF'||word(8)!=='WAVE'||word(12)!=='fmt '||word(36)!=='data'||v.getUint32(4,true)!==bytes.length-8||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==1||v.getUint32(24,true)!==16000||v.getUint32(28,true)!==32000||v.getUint16(32,true)!==2||v.getUint16(34,true)!==16||v.getUint32(40,true)!==bytes.length-44||(bytes.length-44)%2)throw new Error('Audio could not be read. Choose a recording through the audio picker.');
 const duration=(bytes.length-44)/32000;if(duration<.25||duration>MAX_AUDIO_SECONDS)throw new Error('Use audio between 0.25 and 90 seconds.');
 let sum=0;for(let i=44;i<bytes.length;i+=2){const s=v.getInt16(i,true)/32768;sum+=s*s}if(Math.sqrt(sum/((bytes.length-44)/2))<.001)throw new Error('This recording is silent or too quiet. Speak closer to the microphone and try again.');
 return duration;
}
