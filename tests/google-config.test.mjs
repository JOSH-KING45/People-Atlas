import assert from 'node:assert/strict';
import test from 'node:test';
import {fixture} from './helpers/fixture.mjs';
const identity={'fixture-session-id':'test-user-a','fixture-email':'a@example.test'};
const shared='123456789-shared.apps.googleusercontent.com';

test('shared Google configuration takes precedence while retaining legacy settings as a fallback',()=>{
 const f=fixture(),{googleConnection}=f.load('lib/google-config.ts');
 assert.deepEqual(googleConnection('legacy.apps.googleusercontent.com'),{googleClientId:'legacy.apps.googleusercontent.com',googleManaged:false});
 f.env.GOOGLE_CLIENT_ID=' '+shared+' ';
 assert.deepEqual(googleConnection('legacy.apps.googleusercontent.com'),{googleClientId:shared,googleManaged:true});
});

test('authenticated settings use shared Google client IDs and cannot overwrite them',async()=>{
 const f=fixture(identity);f.env.GOOGLE_CLIENT_ID=shared;
 f.tables.settings.push({owner:'test-user-a',google_client_id:'legacy.apps.googleusercontent.com',encrypted_ai_key:'',ai_model:'gpt-4.1-mini',ai_provider:'openai'});
 const route=f.load('app/api/settings/route.ts');
 assert.equal((await (await route.GET()).json()).googleClientId,shared);
 const response=await route.POST(new Request('https://atlas.example/api/settings',{method:'POST',body:JSON.stringify({googleClientId:'attacker.apps.googleusercontent.com',aiProvider:'openai'})}));
 assert.equal(response.status,200);
 assert.equal((await response.json()).googleClientId,shared);
 assert.equal(f.tables.settings[0].google_client_id,'legacy.apps.googleusercontent.com');
});

test('guest and signed-in workspaces receive the same public Google configuration',async()=>{
 const f=fixture(identity);f.env.GOOGLE_CLIENT_ID=shared;f.env.GOOGLE_CLIENT_SECRET='must-not-be-passed-to-client';
 const getUser=f.auth.getUser;
 f.auth.getUser=async()=>{const result=await getUser();result.data.user.app_metadata={atlas_policy_version:'2026-11-07'};return result};
 const signedIn=await f.load('app/atlas/page.tsx').default();
 const guest=f.load('app/guest/page.tsx').default();
 for(const page of [signedIn,guest]){
  assert.equal(page.props.appGoogleClientId,shared);
  assert.ok(!JSON.stringify(page.props).includes('must-not-be-passed-to-client'));
 }
});
