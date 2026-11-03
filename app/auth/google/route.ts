import {sessionClient} from '@/lib/supabase';
import {authOrigin} from '@/lib/auth-origin';
import {api,guard} from '@/lib/server';

export async function POST(request:Request) {
  return api(async()=>{
    guard(request);
    const origin = authOrigin();
    let target = origin + '/login?status=google';
    if (process.env.GOOGLE_AUTH_ENABLED === 'true') try {
      const client = await sessionClient();
      const {data,error} = await client.auth.signInWithOAuth({
        provider:'google',
        options:{
          redirectTo:origin + '/auth/callback',
          queryParams:{prompt:'select_account'}
        }
      });
      if (!error && data.url) target = data.url;
    } catch {
      // Keep upstream errors, credentials and OAuth parameters out of public errors.
    }
    return new Response(null,{status:303,headers:{
      Location:target,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'
    }});
  });
}
