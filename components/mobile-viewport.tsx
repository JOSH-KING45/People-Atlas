'use client';
import {useEffect} from 'react';
import {mobileViewportState} from '@/lib/mobile-viewport';

export default function MobileViewport(){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;let baseline=window.innerHeight,frame=0;
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const element=document.activeElement;const editing=element instanceof HTMLTextAreaElement||element instanceof HTMLInputElement&&!['button','submit','reset','checkbox','radio','file','range','color','hidden'].includes(element.type)||element instanceof HTMLElement&&element.isContentEditable;
   const height=viewport?.height||window.innerHeight;if(!editing)baseline=Math.max(baseline,height,window.innerHeight);
   const state=mobileViewportState(height,viewport?.offsetTop||0,baseline,window.innerWidth,editing);
   root.style.setProperty('--atlas-visible-height',state.height+'px');root.style.setProperty('--atlas-visible-top',state.top+'px');root.dataset.atlasKeyboard=state.keyboard?'open':'closed';
  })};
  const orient=()=>{baseline=window.innerHeight;update()};
  update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update);window.addEventListener('orientationchange',orient);document.addEventListener('focusin',update);document.addEventListener('focusout',update);
  return()=>{cancelAnimationFrame(frame);viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('orientationchange',orient);document.removeEventListener('focusin',update);document.removeEventListener('focusout',update);root.style.removeProperty('--atlas-visible-height');root.style.removeProperty('--atlas-visible-top');delete root.dataset.atlasKeyboard};
 },[]);
 return null;
}
