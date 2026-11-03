'use server';
import {redirect} from 'next/navigation';
import {sessionClient} from '@/lib/supabase';
export async function authenticate(form:FormData) {
  const email=String(form.get('email') || '').trim(), password=String(form.get('password') || '');
  if(!email || !password || password.length>256) redirect('/login?status=invalid');
  const auth=(await sessionClient()).auth;
  if(form.get('action')==='register'){
    const {data,error}=await auth.signUp({email,password});
    if(error) redirect('/login?status=invalid');
    if(!data.session) redirect('/login?status=confirm');
  } else {
    const {error}=await auth.signInWithPassword({email,password});
    if(error) redirect('/login?status=invalid');
  }
  redirect('/');
}
export async function logout() {
  const {error}=await (await sessionClient()).auth.signOut({scope:'local'});
  if(error) throw new Error('Sign-out could not be completed. Please retry.');
  redirect('/');
}
