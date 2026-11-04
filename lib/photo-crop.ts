export type Crop={zoom:number;x:number;y:number};
export function cropRectangle(width:number,height:number,aspect:number,crop:Crop){
 if(![width,height,aspect,crop.zoom,crop.x,crop.y].every(Number.isFinite)||width<=0||height<=0||aspect<=0)throw new Error('Invalid crop.');
 const zoom=Math.max(1,Math.min(3,crop.zoom));
 let w=width,h=width/aspect;if(h>height){h=height;w=height*aspect}w/=zoom;h/=zoom;
 return{x:(width-w)*Math.max(0,Math.min(100,crop.x))/100,y:(height-h)*Math.max(0,Math.min(100,crop.y))/100,width:w,height:h};
}
