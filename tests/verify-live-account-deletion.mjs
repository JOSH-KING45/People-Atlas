// Opt-in production build check. This creates and removes only its own fixtures.
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { fixture } from './helpers/fixture.mjs';

if (process.env.ATLAS_VERIFY_DELETION !== 'true') process.exit(0);
const url = process.env.SUPABASE_URL;
if (process.env.VERCEL_ENV !== 'production' ||
    new URL(url).hostname !== 'qyhlkxdshylsfikworzp.supabase.co') {
  throw new Error('Live deletion check is scoped to the People Atlas production project.');
}
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, options);
const session = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY, options);
const email = 'atlas-deletion-test-' + crypto.randomUUID() + '@example.com';
const password = crypto.randomUUID() + 'Aa!9';
const tables = ['people', 'sources', 'settings', 'atlas_preferences', 'atlas_upload_fence'];
const original = crypto.randomUUID();
const image = crypto.randomUUID() + '.jpg';
let id;
let step = 'create disposable account';

function checked(result) {
  if (result.error) throw new Error('Supabase request failed', { cause: result.error });
  return result.data;
}

try {
  id = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user.id;
  step = 'sign in as disposable account';
  checked(await session.auth.signInWithPassword({ email, password }));
  step = 'seed synthetic data and files';
  checked(await admin.from('people').insert({ id: crypto.randomUUID(), owner: id, name: 'Synthetic deletion test', fields: {}, notes: '' }));
  checked(await admin.from('settings').insert({ owner: id }));
  checked(await admin.from('atlas_preferences').insert({ owner: id, key: 'tour', value: { done: true } }));
  checked(await admin.from('sources').insert({ id: original, owner: id, name: 'test.txt', object_key: id+'/'+original, size: 4 }));
  checked(await admin.storage.from('atlas-originals').upload(id+'/'+original, Buffer.from('test'), { contentType: 'application/octet-stream' }));
  checked(await admin.storage.from('atlas-images').upload(id+'/'+image, Uint8Array.of(255,216,255,217), { contentType: 'image/jpeg' }));
  checked(await admin.rpc('atlas_upload_transition', { account_id: id, operation: 'original' }));

  const f = fixture();
  Object.assign(f.env, { ATLAS_ACCOUNT_DELETION_ENABLED: 'true', ATLAS_SHARED_AUTH: 'true', ATLAS_UPLOAD_FENCE_LIVE_AT: process.env.ATLAS_UPLOAD_FENCE_LIVE_AT });
  f.client.from = admin.from.bind(admin);
  f.client.rpc = admin.rpc.bind(admin);
  f.client.storage = admin.storage;
  f.client.auth = admin.auth;
  f.auth.getUser = session.auth.getUser.bind(session.auth);
  f.auth.signOut = session.auth.signOut.bind(session.auth);
  const { DELETE } = f.load('app/api/account/route.ts');
  const request = confirmation => new Request('https://mypeople.com.ng/api/account', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', Origin: 'https://mypeople.com.ng' },
    body: JSON.stringify({ confirmation }),
  });

  step = 'validate confirmation and active upload fence';
  assert.equal((await DELETE(request('NO'))).status, 400);
  assert.equal((await DELETE(request('DELETE'))).status, 409);
  assert.equal(checked(await admin.rpc('atlas_upload_transition', { account_id: id, operation: 'image' })), null);
  // Simulate expiry only for the test account. No signed URL was actually issued.
  checked(await admin.from('atlas_upload_fence').update({ blocked_until: '1970-01-01T00:00:00Z' }).eq('owner', id));

  step = 'execute the production deletion handler with the disposable session';
  const deleted = await DELETE(request('DELETE'));
  assert.equal(deleted.status, 200);
  assert.deepEqual(await deleted.json(), { deleted: true });

  step = 'verify account, rows, and both storage prefixes are gone';
  const deletedAccount = await admin.auth.admin.getUserById(id);
  assert.equal(deletedAccount.error?.status, 404);
  for (const table of tables) assert.deepEqual(checked(await admin.from(table).select('owner').eq('owner', id)), []);
  for (const bucket of ['atlas-originals', 'atlas-images']) assert.deepEqual(checked(await admin.storage.from(bucket).list(id)), []);
  id = undefined;
  console.log('ATLAS_LIVE_DELETION_VERIFIED: confirmation, upload lock, account, rows, originals and images');
} catch (error) {
  const status = error.cause?.status || error.cause?.code;
  console.error('Atlas live deletion check failed at '+step+(status ? ' ('+String(status).replace(/[^a-zA-Z0-9_-]/g,'')+')' : ''));
  process.exitCode = 1;
} finally {
  if (id) {
    try {
      checked(await admin.storage.from('atlas-originals').remove([id+'/'+original]));
      checked(await admin.storage.from('atlas-images').remove([id+'/'+image]));
      const result = await admin.auth.admin.deleteUser(id);
      if (result.error?.status !== 404) checked(result);
    } catch {
      console.error('Disposable Atlas deletion fixture cleanup could not be confirmed.');
      process.exitCode = 1;
    }
  }
}
