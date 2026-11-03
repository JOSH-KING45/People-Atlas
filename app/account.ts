import {sessionClient} from '@/lib/supabase';
export async function currentUser() {
  const client = await sessionClient();
  const {data:{user}} = await client.auth.getUser();
  return user;
}
