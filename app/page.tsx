import {LockKeyhole,Network,ArrowRight,UserRound} from 'lucide-react';
import {chatGPTSignInPath,getChatGPTUser} from './chatgpt-auth';
import PeopleWorkspace from './people-workspace';

export const dynamic = 'force-dynamic';

export default async function Home(){
  const user = await getChatGPTUser();
  const signInHref = chatGPTSignInPath('/');

  if(user) return <PeopleWorkspace signInHref={signInHref} tourScope={user.userId}/>;

  return <main className="sign-in-page">
    <section className="sign-in-card" aria-labelledby="sign-in-title">
      <div className="brand sign-in-brand"><Network aria-hidden="true"/><span>People Atlas</span></div>
      <div className="sign-in-symbol"><LockKeyhole size={27} aria-hidden="true"/></div>
      <h1 id="sign-in-title">Sign in to your people notebook.</h1>
      <p>Your profiles, notes and files belong to your account. Sign in to open your saved circle or start a new one.</p>
      <a href={signInHref} target="_top" className="primary-button sign-in-button">Sign in with ChatGPT <ArrowRight size={18} aria-hidden="true"/></a>
      <a href="/guest" className="outline-button sign-in-button guest-sign-in-button"><UserRound size={18} aria-hidden="true"/> Continue as guest</a>
      <p className="guest-sign-in-note">Guest data stays in this browser. Clearing browser data removes it.</p>
      <div className="sign-in-help">
        <h2>Cloud account</h2>
        <p>ChatGPT is the supported cloud sign-in for this version. It keeps each person’s saved records separate.</p>
        <p>Guest mode needs no account. Its records stay on this device and can be exported as a backup.</p>
      </div>
    </section>
  </main>;
}
