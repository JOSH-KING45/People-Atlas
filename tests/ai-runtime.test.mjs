// Uses the installed Workers runtime with a local upstream service, no live keys or network.
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const miniflareRequire=createRequire(wranglerRequire.resolve('miniflare/package.json'));
const workerd=miniflareRequire('workerd');

test('AI requests run in Workers and reject redirects without forwarding credentials',()=>{
 const temp=mkdtempSync(join(tmpdir(),'people-atlas-ai-runtime-'));
 try{
  const compile=(source)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  for(const name of ['ai-extraction','ai-providers']){
   const source=readFileSync(join(root,'lib',name+'.ts'),'utf8');
   writeFileSync(join(temp,name+'.js'),compile(source).replace(/from (['"])\.\/(ai-providers|server)\1/g,"from './$2.js'"));
  }
  // Load the real error class without bringing unrelated database/auth bindings into the test.
  const server=ts.createSourceFile('server.ts',readFileSync(join(root,'lib/server.ts'),'utf8'),ts.ScriptTarget.Latest,true);
  const errorClass=server.statements.find(s=>ts.isClassDeclaration(s)&&s.name?.text==='ApiError');
  assert.ok(errorClass);
  writeFileSync(join(temp,'server.js'),compile(errorClass.getText(server)));
  writeFileSync(join(temp,'test.js'),readFileSync(join(root,'tests/fixtures/ai-runtime.js'),'utf8'));
  const modules=['test','ai-extraction','ai-providers','server'].map(name=>`(name = "${name}.js", esModule = embed "${name}.js")`).join(',');
  writeFileSync(join(temp,'config.capnp'),`using Workerd = import "/workerd/workerd.capnp";
const config :Workerd.Config = (services = [
 (name = "ai-transport-tests", worker = (modules = [${modules}], compatibilityDate = "2026-05-15", globalOutbound = "upstream")),
 (name = "upstream", worker = (modules = [${modules}], compatibilityDate = "2026-05-15", globalOutbound = "upstream"))
]);`);
  const result=spawnSync(workerd.default,['test',join(temp,'config.capnp'),'ai-transport-tests'],{encoding:'utf8',timeout:15000});
  assert.ifError(result.error);
  assert.equal(result.status,0,(result.stdout||'')+(result.stderr||''));
  assert.match(result.stderr,/\[ PASS \] ai-transport-tests/);
 }finally{rmSync(temp,{recursive:true,force:true})}
});
