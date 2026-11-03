import {createServerClient} from '@supabase/ssr';
import {NextRequest,NextResponse} from 'next/server';
export async function proxy(request:NextRequest) {
  let response = NextResponse.next({request});
  if (!request.cookies.getAll().some(cookie => cookie.name.startsWith('sb-'))) return response;
  const client = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {cookies:{
    getAll: () => request.cookies.getAll(),
    setAll(values) {
      for(const {name,value} of values) request.cookies.set(name,value);
      response=NextResponse.next({request});
      for(const {name,value,options} of values) response.cookies.set(name,value,options);
      response.headers.set('Cache-Control','private, no-store');
    }
  }});
  await client.auth.getUser();
  return response;
}
export const config={matcher:['/','/login','/api/people','/api/settings','/api/sources','/api/extract']};
