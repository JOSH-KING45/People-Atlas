import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';

function setup(){
 const f=fixture();
 f.env.APP_URL='https://atlas.example';f.env.GOOGLE_AUTH_ENABLED='true';
 return f;
}
test('Google authorization uses a fixed callback and rejects cross-site form submission',async()=>{
 const f=setup();let calls=0;
 f.auth.signInWithOAuth=async input=>{
  calls++;assert.equal(input.provider,'google');
  assert.deepEqual(input.options,{redirectTo:'https://atlas.example/auth/callback',queryParams:{prompt:'select_account'}});
  return {data:{url:'https://project.supabase.co/auth/v1/authorize?provider=google'},error:null};
 };
 const route=f.load('app/auth/google/route.ts');
 const r=await route.POST(new Request('https://attacker.example/auth/google',{method:'POST'}));
 assert.equal(r.status,303);assert.match(r.headers.get('location'),/^https:\/\/project.supabase.co/);
 assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal((await route.POST(new Request('https://atlas.example/auth/google',{method:'POST',headers:{Origin:'https://attacker.example'}}))).status,403);
 assert.equal(calls,1);
});
test('provider errors return a safe login error without upstream details',async()=>{
 const f=setup();
 f.auth.signInWithOAuth=async()=>({data:{url:null},error:{message:'private credential'}});
 const response=await f.load('app/auth/google/route.ts').POST(new Request('https://atlas.example/auth/google',{method:'POST'}));
 assert.equal(response.headers.get('location'),'https://atlas.example/login?status=google');
 assert.equal(await response.text(),'');
});
test('callback exchanges the PKCE code and ignores untrusted redirect destinations',async()=>{
 const f=setup();let calls=0;
 f.auth.exchangeCodeForSession=async code=>{calls++;assert.equal(code,'fixture-code');return {error:null}};
 const response=await f.load('app/auth/callback/route.ts').GET(new Request('https://attacker.example/auth/callback?code=fixture-code&next=https://attacker.example'));
 assert.equal(response.headers.get('location'),'https://atlas.example/');
 assert.equal(response.headers.get('referrer-policy'),'no-referrer');
 assert.equal(calls,1);
});
test('denied, missing, expired and mismatched callbacks cannot open the workspace',async()=>{
 const f=setup();let calls=0;
 f.auth.exchangeCodeForSession=async()=>{calls++;return {error:{message:'secret verifier'}}};
 const route=f.load('app/auth/callback/route.ts');
 for(const query of ['','?error=access_denied&code=ignored','?code=expired']){
  const response=await route.GET(new Request('https://atlas.example/auth/callback'+query));
  assert.equal(response.headers.get('location'),'https://atlas.example/login?status=google');
  assert.equal(await response.text(),'');
 }
 assert.equal(calls,1);
});
test('OAuth rejects insecure or ambiguous configured origins',()=>{
 const f=setup(),{authOrigin}=f.load('lib/auth-origin.ts');
 for(const value of ['http://remote.test','https://user:pass@atlas.example','https://atlas.example/path','https://atlas.example/?next=other','https://atlas.example/#fragment']){
  f.env.APP_URL=value;assert.throws(authOrigin);
 }
 f.env.APP_URL='http://localhost:3000';assert.equal(authOrigin(),'http://localhost:3000');
});

test('unconfigured Google login never sends visitors to an unavailable provider',async()=>{
 const f=setup();f.env.GOOGLE_AUTH_ENABLED='false';
 f.auth.signInWithOAuth=async()=>assert.fail('Disabled provider was used');
 const response=await f.load('app/auth/google/route.ts').POST(new Request('https://atlas.example/auth/google',{method:'POST'}));
 assert.equal(response.headers.get('location'),'https://atlas.example/login?status=google');
});
