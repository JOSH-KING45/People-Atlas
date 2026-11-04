import {api,guard,json,ApiError} from '@/lib/server';
import {MAX_AUDIO_BYTES} from '@/lib/audio';
import {speechAvailable,transcribeAudio} from '@/lib/speech-transcription';
export const runtime='nodejs';
export const maxDuration=90;
export function GET(){return json({available:speechAvailable(),maxSeconds:90})}
export function POST(request:Request){return api(async()=>{
 guard(request);if(request.headers.get('content-type')!=='audio/wav')throw new ApiError(400,'Choose audio using the recorder or audio file picker.');
 if(Number(request.headers.get('content-length'))>MAX_AUDIO_BYTES)throw new ApiError(413,'This recording is too large. Use a clip up to 90 seconds.');
 if(!request.body)throw new ApiError(400,'Choose a recording first.');
 const reader=request.body.getReader();const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.byteLength;if(total>MAX_AUDIO_BYTES){await reader.cancel();throw new ApiError(413,'This recording is too large. Use a clip up to 90 seconds.')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return json(await transcribeAudio(bytes,new URL(request.url).searchParams.get('language')||'auto'));
})}
