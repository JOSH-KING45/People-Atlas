import {createAiRequest,extractWithAi} from './ai-extraction.js';
import {AI_PROVIDERS} from './ai-providers.js';

const note='Test Person is 21.';
const key='fake-runtime-key';
const output=JSON.stringify({people:[{name:'Test Person',fields:[{label:'Age',value:'21'}],sourceNote:note}]});
function check(condition,message){if(!condition)throw new Error(message)}

export default {
 async test(){
  for(const provider of Object.keys(AI_PROVIDERS)){
   const model=provider==='openrouter'?'openrouter/free':'runtime/model';
   const request=createAiRequest(provider,key,model,note);
   // The old redirect:'error' option throws here in this Workers version.
   const nativeRequest=new Request(request.url,request.options);
   check(nativeRequest.redirect==='manual','Provider requests must not follow redirects');
   const result=await extractWithAi(provider,key,model,note);
   check(result.output===output,'Provider response was not normalized');
   check(result.model==='runtime/actual-model','Actual model was not preserved');
  }
  for(const status of [301,302,303,307,308]){
   let error;
   try{await extractWithAi('openrouter',key,'runtime/redirect-'+status,note)}catch(e){error=e}
   check(error?.status===502&&/unexpected redirect/.test(error.message),'Redirect was followed or incorrectly classified: '+status);
   check(!error.message.includes(key),'An error exposed the key');
  }
  let error;
  try{await extractWithAi('openrouter',key,'runtime/unauthorized',note)}catch(e){error=e}
  check(error?.status===400&&/rejected the key/.test(error.message),'Key rejection was incorrectly classified');
 },
 async fetch(request){
  // This handler is the local outbound service. No real provider receives a request.
  check(Object.values(AI_PROVIDERS).some(p=>p.endpoint===request.url),'Credentials were forwarded to an unexpected destination');
  check(request.method==='POST','Provider request method changed');
  check(request.headers.get('Authorization')==='Bearer '+key,'Provider did not receive its key');
  const body=await request.json();
  const status=Number(body.model.split('runtime/redirect-')[1]);
  if(status)return new Response(null,{status,headers:{Location:'https://redirect-target.example.test/collect'}});
  if(body.model==='runtime/unauthorized')return Response.json({error:{code:401}},{status:401});
  const openai=request.url===AI_PROVIDERS.openai.endpoint;
  check((openai?body.input:body.messages[1].content)===note,'Provider did not receive the note');
  return Response.json(openai
   ? {status:'completed',model:'runtime/actual-model',output:[{content:[{type:'output_text',text:output}]}]}
   : {model:'runtime/actual-model',choices:[{finish_reason:'stop',message:{content:output}}]});
 }
};
