import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cloudFixture} from './cloud.mjs';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const nativeRequire = createRequire(import.meta.url);

export function fixture(initialHeaders = {}){
  let requestHeaders = new Headers(initialHeaders);
  const cache = new Map();
  const env = {};
  const Workspace = () => null;
  const cloud=cloudFixture();
  const services={
    adminClient:()=>cloud.client,
    sessionClient:async()=>({auth:{getUser:async()=>({data:{user:requestHeaders.has('fixture-session-id')&&requestHeaders.has('fixture-email')?{id:requestHeaders.get('fixture-session-id')}:null}})}})
  };
  const replacements = {
    'next/headers':{headers:async()=>requestHeaders},
    'next/navigation':{redirect:(url)=>{throw new Error(`Redirect: ${url}`)}},
    '@/lib/supabase':services, './supabase':services,
    './people-workspace':{default:Workspace,__esModule:true},
  };
  function load(relative){
    const path = resolve(root,relative);
    if(cache.has(path)) return cache.get(path).exports;
    const loadedModule = {exports:{}};
    cache.set(path,loadedModule);
    const output = ts.transpileModule(readFileSync(path,'utf8'),{
      fileName:path,
      compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
    }).outputText;
    const requireSource = (specifier) => {
      if(specifier in replacements) return replacements[specifier];
      if(specifier.startsWith('@/')) return load(`${specifier.slice(2)}.ts`);
      if(specifier.startsWith('.')) return load(resolve(dirname(path),`${specifier}.ts`));
      return nativeRequire(specifier);
    };
    new Function('require','module','exports','process',output)(requireSource,loadedModule,loadedModule.exports,{env});
    return loadedModule.exports;
  }
  return {...cloud,load,env,Workspace,setHeaders:(value)=>{requestHeaders = new Headers(value)}};
}

