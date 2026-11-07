import { currentUser } from '@/app/account';
import { deleteAtlasAccount } from '@/lib/account-deletion';
import { api, ApiError, body, json } from '@/lib/server';
import { sessionClient } from '@/lib/supabase';

export function DELETE(request: Request) {
  return api(async () => {
    if (process.env.ATLAS_ACCOUNT_DELETION_ENABLED !== 'true') throw new ApiError(503, 'Account deletion is temporarily unavailable.');
    const { confirmation } = await body(request, 1024);
    const user = await currentUser();
    if (!user) throw new ApiError(401, 'Sign in to delete your account.');
    if (confirmation !== 'DELETE') throw new ApiError(400, 'Type DELETE to confirm.');

    await deleteAtlasAccount(user.id);
    await (await sessionClient()).auth.signOut({ scope: 'local' });
    return json({ deleted: true });
  });
}
