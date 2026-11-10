import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarDays, FileText, Network, ShieldCheck, Users } from 'lucide-react';

export const metadata: Metadata = {
 title: 'About People Atlas | JAJ TECHNOLOGIES',
 description: 'Learn about People Atlas and the developer behind your private people notebook.',
 alternates: { canonical: '/about' },
};

export default function AboutPage() {
 return <main style={{maxWidth:760,margin:'0 auto',padding:'clamp(24px,5vw,56px) 20px',minHeight:'80vh',color:'var(--foreground,inherit)'}}>
  <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:8,color:'inherit',textDecoration:'none',opacity:.75,marginBottom:40}}><ArrowLeft size={18}/> Back to People Atlas</Link>
  <div style={{textAlign:'center',marginBottom:40}}>
   <div style={{width:76,height:76,borderRadius:22,display:'grid',placeItems:'center',margin:'0 auto 18px',background:'var(--muted,rgba(100,116,139,.12))'}}><Network size={38}/></div>
   <h1 style={{fontSize:'clamp(2rem,6vw,3rem)',margin:'0 0 8px'}}>People Atlas</h1>
   <p style={{opacity:.7,margin:0}}>Your private people notebook</p>
  </div>
  <section aria-labelledby="about-title" style={{marginBottom:36}}>
   <h2 id="about-title" style={{fontSize:24,marginBottom:12}}>Remember what matters.</h2>
   <p style={{lineHeight:1.8,opacity:.82}}>People Atlas helps you organize the people in your life, remember birthdays, preserve important details, and stay connected—all in one personal space.</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginTop:22}}>
    {[{Icon:Users,label:'People',detail:'Organized profiles'},{Icon:CalendarDays,label:'Birthdays',detail:'Important dates'},{Icon:ShieldCheck,label:'Privacy',detail:'Personal information'},{Icon:FileText,label:'Notes',detail:'Remember details'}].map(({Icon,label,detail})=><div key={label} style={{border:'1px solid var(--border,rgba(128,128,128,.25))',borderRadius:14,padding:18}}><Icon size={23} aria-hidden="true"/><h3 style={{fontSize:16,margin:'12px 0 4px'}}>{label}</h3><p style={{fontSize:13,opacity:.7,margin:0}}>{detail}</p></div>)}
   </div>
  </section>
  <section aria-labelledby="developer-title" style={{border:'1px solid var(--border,rgba(128,128,128,.25))',borderRadius:18,padding:24,marginBottom:30}}>
   <p style={{fontSize:12,letterSpacing:1.5,opacity:.65,margin:'0 0 8px'}}>CREATED AND DEVELOPED BY</p>
   <h2 id="developer-title" style={{fontSize:24,margin:'0 0 10px'}}>JAJ TECHNOLOGIES</h2>
   <p style={{lineHeight:1.7,opacity:.8}}>Building thoughtful digital tools that make everyday life easier.</p>
   <a href="https://joshua-japhet.vercel.app/" target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8,color:'inherit',textUnderlineOffset:4,fontWeight:600}}>Visit Joshua Japhet's website <ArrowUpRight size={18}/></a>
  </section>
  <nav aria-label="Legal information" style={{display:'flex',gap:22,flexWrap:'wrap'}}><Link href="/privacy" style={{color:'inherit'}}>Privacy Policy</Link><Link href="/terms" style={{color:'inherit'}}>Terms of Service</Link></nav>
 </main>;
}
