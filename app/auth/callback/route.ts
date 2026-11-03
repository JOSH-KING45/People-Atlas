import {sessionClient} from '@/lib/supabase';
import {authOrigin} from '@/lib/auth-origin';

export async function GET(request:Request) {
  const origin = authOrigin();
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  let target = origin + '/login?status=google';
  if (code && !params.has('error')) {
    try {
      const client = await sessionClient();
      const {error} = await client.auth.exchangeCodeForSession(code);
      if (!error) target = origin + '/';
    } catch {
      // Missing, expired and mismatched PKCE verifiers all return to sign-in.
    }
  }
  return new Response(null,{status:303,headers:{
    Location:target,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'
  }});
}
