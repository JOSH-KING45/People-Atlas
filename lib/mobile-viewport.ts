export function mobileViewportState(height:number,offsetTop:number,baseline:number,width:number,editing:boolean){
 const visibleHeight=Math.max(1,Math.round(Number.isFinite(height)?height:baseline));
 return {height:visibleHeight,top:Math.max(0,Math.round(Number.isFinite(offsetTop)?offsetTop:0)),keyboard:width<=1024&&editing&&baseline-visibleHeight>140};
}
