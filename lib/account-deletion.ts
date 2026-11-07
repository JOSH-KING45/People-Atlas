import { ApiError } from './server';
import { adminClient } from './supabase';

export async function deleteAtlasAccount(accountId: string) {
  const client = adminClient();

  const sharedAuth = process.env.ATLAS_SHARED_AUTH;
  if (sharedAuth !== 'true' && sharedAuth !== 'false') {
    throw new ApiError(503, 'Account deletion is temporarily unavailable.');
  }
  if (sharedAuth === 'true') {
    const { data, error } = await client.from('portfolio_admins').select('user_id').eq('user_id', accountId).maybeSingle();
    if (error) throw error;
    if (data) throw new ApiError(409, 'This sign-in also manages the portfolio. Contact the operator to remove only your Atlas data.');
  }

  // Include abandoned uploads and replaced photos that have no database row.
  for (const name of ['atlas-originals', 'atlas-images']) {
    const bucket = client.storage.from(name);
    while (true) {
      const { data, error } = await bucket.list(accountId, { limit: 100 });
      if (error) throw error;
      if (!data.length) break;
      const { data: removed, error: removeError } = await bucket.remove(
        data.map(object => accountId + '/' + object.name)
      );
      if (removeError) throw removeError;
      if (!removed.length) throw new Error('Account file cleanup did not complete.');
    }
  }

  // Foreign keys cascade to Atlas people, source metadata, settings and preferences.
  const { error } = await client.auth.admin.deleteUser(accountId);
  if (error) throw error;
}
