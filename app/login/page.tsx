import {authenticate} from './actions';
export default async function Login({searchParams}:{searchParams:Promise<{status?:string}>}){
 const {status}=await searchParams;
 return <main className="sign-in-page"><section className="sign-in-card"><h1>People Atlas</h1>
 <p>Sign in to your private notebook or create an account.</p>
 {status&&<p role="status">{status==='confirm'?'Check your email for the confirmation link, then sign in.':'Unable to sign in or register. Check your email and password, then retry.'}</p>}
 <form action={authenticate}><label className="field">Email<input name="email" type="email" autoComplete="email" required/></label>
 <label className="field">Password<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label>
 <button className="primary-button spaced" name="action" value="login">Sign in</button>
 <button className="outline-button spaced" name="action" value="register">Create account</button></form>
 <a href="/guest">Continue as guest</a></section></main>;
}
