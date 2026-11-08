export const SIGN_IN_REQUIRED_MESSAGE = 'People Atlas could not verify your sign-in. Sign in with email to access your saved records.';

export class RequestError extends Error {
  constructor(public status:number, message:string,public code?:string){
    super(message);
    this.name = 'RequestError';
  }
}

export function isSignInError(error:unknown):error is RequestError {
  return error instanceof RequestError && error.status === 401;
}

export async function apiRequest(url:string,options?:RequestInit){
  const response = await fetch(url,{...options,credentials:'same-origin'});
  // Preserve authentication failures even when an upstream response is HTML.
  if(response.status === 401) throw new RequestError(401,SIGN_IN_REQUIRED_MESSAGE);
  let data:any;
  try{data = await response.json()}
  catch{throw new RequestError(response.status,'The app could not load this request. Refresh the page and try again.')}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestError(response.status,'The app returned an invalid response. Refresh the page and try again.');
  if(!response.ok) throw new RequestError(response.status,typeof data.error==='string'?data.error:'Please try again.',typeof data.code==='string'?data.code:undefined);
  return data;
}

export async function listRecords<T>(request:(url:string)=>Promise<Record<string,unknown>>,key:'people'|'sources'|'tasks'){
 const records:T[]=[];
 let after='';
 do{
  const page=await request('/api/'+key+(after?'?after='+encodeURIComponent(after):''));
  const rows=page[key];
  if(!Array.isArray(rows))throw new Error('Invalid directory response.');
  records.push(...rows);
  const next=page.next;
  if(next!=null && (typeof next!=='string'||next<=after))throw new Error('Invalid directory cursor.');
  after=typeof next==='string'?next:'';
 }while(after);
 return records;
}
