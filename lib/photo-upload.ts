'use client';
import {cropRectangle,type Crop} from './photo-crop';
export async function preparePhoto(file:File,background=false,crop?:Crop){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024)throw new Error('Choose a JPEG, PNG or WebP image up to 15 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>60_000_000)throw new Error('This picture is too large. Choose a smaller image.');
  const rect=crop?cropRectangle(image.naturalWidth,image.naturalHeight,background?16/9:1,crop):{x:0,y:0,width:image.naturalWidth,height:image.naturalHeight};
  const limit=background?1600:512;const ratio=Math.min(1,limit/Math.max(rect.width,rect.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));
  const context=canvas.getContext('2d');if(!context)throw new Error('Image processing is unavailable.');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('This image could not be processed.')),'image/jpeg',.82));
  if(blob.size>2_000_000)throw new Error('Choose a smaller picture.');return blob;
 }finally{URL.revokeObjectURL(url)}
}
export function dataUrl(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Image could not be read.'));reader.readAsDataURL(blob)})}

export async function existingPhotoFile(url:string){const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw new Error('Picture could not be loaded. Try uploading it again.');return new File([await response.blob()],'picture.jpg',{type:'image/jpeg'})}
