// Supabase HTTP boundary double. SQL policies and RPC behavior have a separate PostgreSQL suite.
export function cloudFixture(){
 const tables={people:[],sources:[],settings:[],atlas_preferences:[]}, files=new Map();
 const client={
  from(table){
   const filters=[];let remove=false,columns='*';
   const query={
    select(selection){columns=selection;return query},
    eq(key,value){filters.push([key,value]);return query},
    delete(){remove=true;return query},
    order(){return query},limit(){return query},
    async upsert(row){
     const key=table==='settings'?'owner':'id';
     const old=tables[table].find(item=>table==='atlas_preferences'?item.owner===row.owner&&item.key===row.key:item[key]===row[key]);
     if(old)Object.assign(old,row);else tables[table].push({...row});
     return {error:null};
    },
    then(resolve){const rows=tables[table].filter(row=>filters.every(([k,v])=>row[k]===v));
     if(remove)tables[table]=tables[table].filter(row=>!rows.includes(row));
     resolve({data:rows.map(row=>columns==='id' ? {id:row.id}:row),error:null});
    },
    async maybeSingle(){return {data:(await query).data[0]||null,error:null}},
    single(){return query.maybeSingle()}
   };return query;
  },
  async rpc(name,{account_id,drafts}={}){
   if(name==='atlas_claim_speech_request')return {data:true};
   if(name==='atlas_claim_ai_request')return {data:true};
   if(name!=='atlas_save_people')throw Error('Unexpected RPC');
   const data=[];
   for(const draft of drafts){
    const row=tables.people.find(row=>row.id===draft.id);
    if(row&&row.owner===account_id&&row.version===draft.version){Object.assign(row,draft,{version:row.version+1});data.push(row)}
    if(!row&&!draft.version){const saved={...draft,owner:account_id,version:1};tables.people.push(saved);data.push(saved)}
   }
   return {data};
  },
  storage:{from:()=>({
   upload:async(key,bytes)=>{files.set(key,bytes);return {error:null}},
   createSignedUploadUrl:async key=>({data:{signedUrl:'https://storage.test/upload/'+key}}),
   info:async key=>({data:files.has(key)?{metadata:{size:files.get(key).length}}:null}),
   createSignedUrl:async key=>({data:{signedUrl:'https://storage.test/download/'+key}}),
   remove:async keys=>{for(const key of keys)files.delete(key);return {error:null}}
  })}
 };
 return {client,tables,files};
}
