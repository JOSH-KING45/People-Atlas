import { ApiError } from './server';
import { adminClient } from './supabase';

export async function uploadTransition(
  accountId: string,
  operation: 'original' | 'image' | 'delete',
  client = adminClient(),
) {
  const { data, error } = await client.rpc('atlas_upload_transition', {
    account_id: accountId,
    operation,
  });
  if (error) throw error;
  if (data === null && operation !== 'delete') {
    throw new ApiError(409, 'Uploads are locked because you started deleting your account.');
  }
  const deadline = typeof data === 'string' ? Date.parse(data) : NaN;
  if (!Number.isFinite(deadline)) throw new Error('Upload deadline could not be verified.');
  return deadline;
}
