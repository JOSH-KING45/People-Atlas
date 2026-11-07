import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from './helpers/fixture.mjs';

test('account deletion rejects invalid and cross-site requests and uses only the verified account', async () => {
  const f = fixture({ 'fixture-session-id': 'verified-user', 'fixture-email': 'owner@example.com' });
  f.env.ATLAS_ACCOUNT_DELETION_ENABLED = 'true';
  f.env.ATLAS_SHARED_AUTH = 'false';
  f.env.ATLAS_UPLOAD_FENCE_LIVE_AT = new Date(0).toISOString();
  const files = { 'atlas-originals': ['original', 'unfinished'], 'atlas-images': ['old.jpg'] };
  f.client.storage.from = name => ({
    list: async prefix => {
      assert.equal(prefix, 'verified-user');
      return { data: files[name].map(name => ({ name })) };
    },
    remove: async paths => {
      assert.deepEqual(paths, files[name].map(file => 'verified-user/' + file));
      files[name] = [];
      return { data: paths };
    },
  });
  let deleted = false;
  f.client.auth = { admin: { deleteUser: async id => {
    assert.equal(id, 'verified-user');
    assert.deepEqual(Object.values(files), [[], []]);
    deleted = true;
    return {};
  } } };
  f.auth.signOut = async () => ({});
  const { DELETE } = f.load('app/api/account/route.ts');
  const request = (confirmation, origin = 'https://atlas.example') =>
    new Request('https://atlas.example/api/account', {
      method: 'DELETE',
      headers: { Origin: origin },
      body: JSON.stringify({ confirmation, userId: 'another-account' }),
    });
  assert.equal((await DELETE(request('DELETE', 'https://other.example'))).status, 403);
  assert.equal((await DELETE(request('delete'))).status, 400);
  assert.equal(deleted, false);
  assert.equal((await DELETE(request('DELETE'))).status, 200);
  assert.equal(deleted, true);
});

test('storage cleanup errors leave the identity available for retry', async () => {
  const f = fixture();
  f.env.ATLAS_SHARED_AUTH = 'false';
  f.env.ATLAS_UPLOAD_FENCE_LIVE_AT = new Date(0).toISOString();
  f.client.storage.from = () => ({ list: async () => ({ error: new Error('Storage unavailable') }) });
  f.client.auth = { admin: { deleteUser: async () => assert.fail('Identity deleted before storage cleanup') } };
  await assert.rejects(f.load('lib/account-deletion.ts').deleteAtlasAccount('verified-user'), /Storage unavailable/);
});

test('registration checks the current terms version before creating an account', async () => {
  const f = fixture();
  Object.assign(f.env, {
    ATLAS_POLICY_VERSION: 'approved-v2',
    ATLAS_PRIVACY_URL: 'https://atlas.example/privacy',
    ATLAS_TERMS_URL: 'https://atlas.example/terms',
  });
  let calls = 0;
  f.auth.signUp = async () => { calls++; return { data: {} }; };
  const { authenticate } = f.load('app/login/actions.ts');
  const form = new FormData();
  Object.entries({ email: 'owner@example.com', password: 'test-password', action: 'register', policyVersion: 'approved-v1' })
    .forEach(([key, value]) => form.set(key, value));
  await assert.rejects(authenticate(form), /Redirect: \/login\?status=policies/);
  assert.equal(calls, 0);
  form.set('policyVersion', 'approved-v2');
  await assert.rejects(authenticate(form), /Redirect: \/login\?status=confirm/);
  assert.equal(calls, 1);
});

test('Unsplash accepts only canonical photo links and rejects untrusted image hosts', () => {
  const { unsplashPhotoId, unsplashImage } = fixture().load('lib/unsplash.ts');
  assert.equal(unsplashPhotoId('https://unsplash.com/photos/lake-l9M1q8W-pyA?ref=example'), 'l9M1q8W-pyA');
  assert.equal(unsplashPhotoId('https://unsplash.com/photos/l9M1q8W-pyA'), 'l9M1q8W-pyA');
  assert.equal(unsplashPhotoId('https://unsplash.com@evil.example/photos/l9M1q8W-pyA'), null);
  assert.equal(unsplashImage('https://images.unsplash.com.evil.example/photo'), '');
  assert.equal(unsplashImage('https://images.unsplash.com/photo?ixid=example'), 'https://images.unsplash.com/photo?ixid=example');
});

test('linked portfolio admins are blocked before storage or auth changes', async () => {
  const f = fixture();
  f.env.ATLAS_SHARED_AUTH = 'true';
  f.client.from = table => {
    assert.equal(table, 'portfolio_admins');
    return { select: column => {
      assert.equal(column, 'user_id');
      return { eq: (field, id) => {
        assert.equal(field, 'user_id');
        assert.equal(id, 'linked-admin');
        return { maybeSingle: async () => ({ data: { user_id: id } }) };
      } };
    } };
  };
  f.client.storage.from = () => assert.fail('A linked admin must not reach cleanup');
  await assert.rejects(f.load('lib/account-deletion.ts').deleteAtlasAccount('linked-admin'), { status: 409 });
});
