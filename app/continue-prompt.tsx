'use client';
import {useEffect,useRef} from 'react';
import {ArrowRight,Network} from 'lucide-react';
import styles from './landing.module.css';

export default function ContinuePrompt(){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const element=dialog.current;
  if(element&&!element.open)element.showModal();
  return ()=>element?.close();
 },[]);
 return <dialog ref={dialog} className={styles.continuePrompt} aria-labelledby="continue-title" aria-describedby="continue-description">
  <Network size={28} aria-hidden="true"/>
  <h2 id="continue-title">Welcome back.</h2>
  <p id="continue-description">You’re signed in. Ready to open your people notebook?</p>
  <a className={styles.primary} href="/atlas">Continue to Atlas <ArrowRight size={18} aria-hidden="true"/></a>
  <button className={styles.stayButton} type="button" onClick={()=>dialog.current?.close()}>Stay on this page</button>
 </dialog>;
}
