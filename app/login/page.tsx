import { AccountPolicyDocuments } from '@/components/account-policy-documents';
import {accountPolicies} from '@/lib/account-policies';
import {AccountPolicyCheckbox} from '@/components/account-policy-checkbox';
import {authenticate} from './actions';
export default async function Login({searchParams}:{searchParams:Promise<{status?:string}>}){
 const {status}=await searchParams;
 const policies=accountPolicies();
 return <main className="sign-in-page"><section className="sign-in-card"><h1>People Atlas</h1>
 <p>Sign in to your private notebook or create an account.</p>
 {status&&<p role="status">{status==='google'?'Google sign-in could not be completed. Try again or sign in with email.':status==='policies'?'Review and accept the policies to create an account.':status==='confirm'?'Check your email for the confirmation link, then sign in.':'Unable to sign in or register. Check your email and password, then retry.'}</p>}
 <form action="/auth/google" method="post"><button className="outline-button sign-in-button spaced" type="submit" disabled={process.env.GOOGLE_AUTH_ENABLED!=='true'}>Continue with Google</button></form>
 {process.env.GOOGLE_AUTH_ENABLED!=='true'&&<p className="muted">Google sign-in will be available soon.</p>}
 <p className="muted">Or use your email and password</p>
 <form action={authenticate}><label className="field">Email<input name="email" type="email" autoComplete="email" required/></label>
 <label className="field">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label>
 {policies&&<><AccountPolicyDocuments policies={policies}/><AccountPolicyCheckbox policies={policies}/></>}
 <button className="primary-button spaced" name="action" value="login">Sign in</button>
 <button className="outline-button spaced" name="action" value="register">Create account</button></form>
 <a href="/guest">Continue as guest</a><p><a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Use</a></p></section></main>;
}
