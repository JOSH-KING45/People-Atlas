const placeholders=new Set(['unknown','not provided','not recorded','not available','n/a','na','none','null','undefined','-','—']);
export function meaningful(value:unknown):boolean{
 if(value==null)return false;
 if(typeof value==='string')return !!value.trim()&&!placeholders.has(value.trim().toLowerCase());
 if(Array.isArray(value))return value.some(meaningful);
 if(typeof value==='object')return Object.values(value).some(meaningful);
 return typeof value==='number'?Number.isFinite(value):typeof value==='boolean';
}
export function formatValue(value:unknown):string{
 if(!meaningful(value))return '';
 if(Array.isArray(value))return value.filter(meaningful).map(formatValue).join(', ');
 if(typeof value==='object')return Object.entries(value!).filter(([,v])=>meaningful(v)).map(([k,v])=>`${k}: ${formatValue(v)}`).join('; ');
 return String(value).trim();
}
