import {z} from 'zod';
import {ApiError} from './server';
export const pageSize=50;
export function afterId(request?:Request) {
 const cursor=request && new URL(request.url).searchParams.get('after');
 if(cursor && !z.string().uuid().safeParse(cursor).success)throw new ApiError(400,'Invalid page cursor.');
 return cursor;
}
// Leave room below Vercel's response limit even for multilingual notes and arbitrary fields.
export function listPage<T extends {id:string}>(rows:T[]){
 let bytes=0;
 const items:T[]=[];
 for(const row of rows){
  bytes+=Buffer.byteLength(JSON.stringify(row));
  if(items.length===pageSize || (items.length && bytes>2_500_000))break;
  items.push(row);
 }
 return {items,next:items.length<rows.length?items[items.length-1].id:null};
}
