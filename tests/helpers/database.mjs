import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';

export function databaseFixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const migration of ['0000_soft_deathbird.sql','0001_flippant_rictor.sql'])sqlite.exec(readFileSync(new URL('../../drizzle/'+migration,import.meta.url),'utf8'));
 const prepare=(sql)=>{
  let values=[];
  const statement={
   bind(...args){values=args;return statement},
   async first(){return sqlite.prepare(sql).get(...values)||null},
   async all(){return{results:sqlite.prepare(sql).all(...values)}},
   async run(){const meta=sqlite.prepare(sql).run(...values);return{success:true,meta,results:[]}},
  };return statement;
 };
 const DB={prepare,async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.all());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const files=new Map();
 const BUCKET={async put(key,stream){files.set(key,new Uint8Array(await new Response(stream).arrayBuffer()))},async get(key){const bytes=files.get(key);return bytes?{body:new Blob([bytes]).stream()}:null},async delete(key){files.delete(key)}};
 return{DB,BUCKET,files,sqlite,close:()=>sqlite.close()};
}
