import {ArrowRight, CalendarDays, Check, FileText, FolderOpen, LockKeyhole, Network, Search, Sparkles, UserRound, Users} from 'lucide-react';
import Link from 'next/link';
import ContinuePrompt from './continue-prompt';
import styles from './landing.module.css';

export default function Landing({signedIn=false}:{signedIn?:boolean}){
 return <div className={styles.page}>
  {signedIn&&<ContinuePrompt/>}
  <a className={styles.skip} href="#main">Skip to content</a>
  <header className={styles.header}>
   <Link className={styles.brand} href="/" aria-label="People Atlas home"><span><Network size={22} aria-hidden="true"/></span>People Atlas</Link>
   <nav aria-label="Main navigation"><a className={styles.featuresLink} href="#how-it-works">How it works</a><a href={signedIn?"/atlas":"/login"}>{signedIn?"Open Atlas":"Sign in"}</a><a className={styles.smallCta} href="/guest">Try it free <ArrowRight size={16} aria-hidden="true"/></a></nav>
  </header>
  <main id="main">
   <section className={styles.hero} aria-labelledby="hero-title">
    <div className={styles.intro}>
     <p className={styles.eyebrow}><span/> A little more thoughtful. A lot more connected.</p>
     <h1 id="hero-title">The people matter.<br/><em>Remember the details.</em></h1>
     <p className={styles.lead}>A personal notebook for the people in your life. Turn scattered notes into thoughtful profiles, keep memories close, and make room for the details that make someone them.</p>
     <div className={styles.actions}><a className={styles.primary} href={signedIn?"/atlas":"/guest"}>{signedIn?"Continue to Atlas":"Start your people notebook"} <ArrowRight size={18} aria-hidden="true"/></a><a className={styles.secondary} href={signedIn?"/guest":"/login"}>{signedIn?"Explore as a guest":"Create an account"}</a></div>
     <p className={styles.micro}><Check size={15} aria-hidden="true"/> Try guest mode without signing up</p>
    </div>
    <div className={styles.preview} aria-label="Illustrative example of turning a note into a profile">
     <div className={styles.previewTop}><span><Network size={17} aria-hidden="true"/> Your people, in perspective</span><span className={styles.demo}>Example</span></div>
     <div className={styles.note}><p className={styles.caption}><FileText size={15} aria-hidden="true"/> A NOTE WORTH KEEPING</p><p>“Ada enjoys chess, lives in Lagos, and celebrates her birthday on 12 June.”</p></div>
     <div className={styles.transform}><span/><Sparkles size={16} aria-hidden="true"/> Read. Review. Remember.<span/></div>
     <div className={styles.profile}><div className={styles.profileHead}><div className={styles.avatar}>A</div><div><h2>Ada</h2><p>Your people notebook</p></div><span className={styles.profileIcon}><UserRound size={20} aria-hidden="true"/></span></div>
      <dl><div><dt>Lives in</dt><dd>Lagos</dd></div><div><dt>Interests</dt><dd>Chess</dd></div><div><dt>Birthday</dt><dd>12 June <CalendarDays size={15} aria-hidden="true"/></dd></div></dl>
      <div className={styles.source}><Check size={15} aria-hidden="true"/> Original note kept with the profile</div>
     </div>
     <p className={styles.previewFoot}>A fictional example. You review every extraction before saving.</p>
    </div>
   </section>
   <div className={styles.benefitStrip}><span><Users size={18} aria-hidden="true"/> People, beyond a contact list</span><span><FolderOpen size={18} aria-hidden="true"/> A place for every detail</span><span><CalendarDays size={18} aria-hidden="true"/> Dates worth remembering</span></div>
   <section className={styles.workflow} id="how-it-works" aria-labelledby="workflow-title">
    <div className={styles.sectionHead}><p className={styles.eyebrow}>FROM A PASSING NOTE TO A LASTING MEMORY</p><h2 id="workflow-title">Less scattered.<br/>More personal.</h2><p>Write naturally. Organize gently. Find the right detail when it matters.</p></div>
    <div className={styles.steps}>
     <article><span className={styles.stepNumber}>01 / CAPTURE</span><FileText size={25} aria-hidden="true"/><h3>Start with what you know.</h3><p>Write a note, add a person yourself, or import an existing file. Keep the original words alongside the details.</p></article>
     <article><span className={styles.stepNumber}>02 / MAKE IT YOURS</span><Sparkles size={25} aria-hidden="true"/><h3>A little help, your final say.</h3><p>Use the built-in reader or included AI to extract profiles. Review names and fields, make changes, then save.</p></article>
     <article><span className={styles.stepNumber}>03 / RECONNECT</span><Search size={25} aria-hidden="true"/><h3>The details, within reach.</h3><p>Search your directory, combine filters, explore smart folders, and revisit notes, memories and important dates.</p></article>
    </div>
   </section>
   <section className={styles.storage} aria-labelledby="storage-title"><div className={styles.storageIntro}><LockKeyhole size={28} aria-hidden="true"/><p className={styles.eyebrow}>CHOOSE YOUR SPACE</p><h2 id="storage-title">Your notebook.<br/>Your way to keep it.</h2><p>Start small, export a backup, and choose the experience that fits you.</p></div><div className={styles.storageOptions}>
    <article><span className={styles.optionLabel}>JUST EXPLORING?</span><h3>Stay in this browser.</h3><p>Guest mode stores profiles locally on this device. No account needed. Export a backup before clearing browser data.</p><a href="/guest">Explore as a guest <ArrowRight size={16} aria-hidden="true"/></a></article>
    <article><span className={styles.optionLabel}>KEEP YOUR CIRCLE CLOSE</span><h3>Take it across devices.</h3><p>Sign in for account-based cloud storage. Your guest notebook stays separate, with JSON export and import available when you need it.</p><a href="/login">Create your account <ArrowRight size={16} aria-hidden="true"/></a></article>
   </div></section>
   <section className={styles.finalCta}><p className={styles.eyebrow}>GOOD CONNECTIONS START WITH PAYING ATTENTION.</p><h2>Make a little space<br/>for your people.</h2><a className={styles.primary} href="/guest">Open your notebook <ArrowRight size={18} aria-hidden="true"/></a></section>
  </main>
  <footer className={styles.footer}><Link className={styles.brand} href="/"><Network size={20} aria-hidden="true"/>People Atlas</Link><p>Every person is more than a name.</p><nav aria-label="Legal"><Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms of Use</Link></nav><a href="/login">Sign in <ArrowRight size={15} aria-hidden="true"/></a></footer>
 </div>;
}
