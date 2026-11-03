import {createServerClient} from '@supabase/ssr';
import {createClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';

export async function sessionClient() {
  const jar = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: values => {
        // Server components cannot write cookies. The request proxy refreshes them.
        try { for (const {name,value,options} of values) jar.set(name,value,options); }
        catch (error) { if (!(error instanceof Error && error.message.includes('Cookies can only be modified'))) throw error; }
      }
    }
  });
}

export function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: {persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
}
