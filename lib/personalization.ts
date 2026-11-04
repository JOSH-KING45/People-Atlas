export type Preferences=Record<string,Record<string,string|boolean>>;
export const THEMES=[{id:'atlas',label:'Atlas blue',accent:'#315bea'},{id:'forest',label:'Forest',accent:'#167565'},{id:'ocean',label:'Ocean',accent:'#146a99'},{id:'plum',label:'Plum',accent:'#8050ab'},{id:'terracotta',label:'Terracotta',accent:'#ae5034'}];
export const WALLPAPERS=[
 {id:'alpine',label:'Alpine calm',photo:'photo-1561175024-ef321892a9a9',credit:'Tom Wheatley',href:'https://unsplash.com/photos/body-of-water-near-trees-l9M1q8W-pyA'},
 {id:'ocean',label:'Ocean rhythm',photo:'photo-1625992865747-d814b125ab22',credit:'Monya Prinsloo',href:'https://unsplash.com/photos/aerial-view-of-ocean-waves-HZmRQsyvGHA'},
 {id:'dunes',label:'Quiet dunes',photo:'photo-1765498067720-6ff6847f8f85',credit:'Royce Fonseca',href:'https://unsplash.com/photos/soft-white-sand-dunes-under-a-pale-blue-sky-PhiT_BhJmvM'},
 {id:'forest',label:'Mountain reflection',photo:'photo-1550947819-98400828e3e0',credit:'Jason Mavrommatis',href:'https://unsplash.com/photos/river-surrounded-by-trees-near-mountain-elMz_DEwavA'},
];
export function wallpaperUrl(id:string,width=1600){const p=WALLPAPERS.find(p=>p.id===id);return p?`https://images.unsplash.com/${p.photo}?auto=format&fit=crop&w=${width}&q=80`:''}
export function ownedImage(path:unknown,owner:string):path is string{return typeof path==='string'&&new RegExp('^'+owner.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/[0-9a-f-]{36}\\.jpg$').test(path)}
export function validatePreference(key:unknown,value:unknown,owner:string){
 if(typeof key!=='string'||!['profile','dashboard','tour'].includes(key)&&!/^person:[0-9a-f-]{36}$/.test(key))throw new Error('Choose a valid preference.');
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid preference.');
 const v=value as Record<string,unknown>;let out:Record<string,string|boolean>={};
 const image=(p:unknown)=>{if(p===''||p===undefined)return '';if(!ownedImage(p,owner))throw new Error('Choose one of your own uploaded images.');return p};
 if(key==='tour'){if(v.done!==true)throw new Error('Invalid tour preference.');out={done:true}}
 else if(key==='profile'){if(typeof v.name!=='string'||v.name.length>100||typeof v.bio!=='string'||v.bio.length>500)throw new Error('Use a name up to 100 characters and bio up to 500.');out={name:v.name.trim(),bio:v.bio.trim(),photo:image(v.photo)}}
 else if(key==='dashboard'){if(!THEMES.some(t=>t.id===v.theme)||typeof v.wallpaper!=='string'||v.wallpaper!==''&&!WALLPAPERS.some(p=>p.id===v.wallpaper))throw new Error('Choose a preset theme and background.');out={theme:v.theme as string,wallpaper:v.wallpaper,photo:image(v.photo)}}
 else {if(v.favorite!==undefined&&typeof v.favorite!=='boolean')throw new Error('Invalid favourite preference.');out={photo:image(v.photo),favorite:v.favorite===true}};
 return {key,value:out};
}
