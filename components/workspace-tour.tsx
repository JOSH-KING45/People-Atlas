"use client";
import {useEffect,useRef,useState} from 'react';
import {usePersonalization} from './personalization';
import {shouldStartTour} from '@/lib/tour-state';
import {toast} from 'sonner';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {createPortal} from 'react-dom';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
export type TourView='Favourites'|'Inbox'|'People'|'Smart folders'|'Insights'|'Calendar'|'Files & export';
const steps: {view:TourView;target:string;title:string;text:string;tip:string}[]=[
 {view:'Inbox',target:'[aria-label="Details about people"]',title:'Capture the little things',text:'Paste what you know here, select AI extraction, then choose Extract details. People Atlas turns your note into structured details for you to review.',tip:'Example: David is 19, studies Computer Science at FUTMINNA, and his birthday is May 4. Review and edit detected values before saving. Calculated estimates are labelled.'},
 {view:'Inbox',target:'.atlas-tasks .section-heading',title:'Turn notes into follow-ups',text:'Open Tasks & reminders to add a task or set a reminder time. Link it to a profile, or start a task from a person’s profile.',tip:'Try “Call Ada on Friday.” Check Upcoming & overdue, mark a task complete, or snooze a reminder for 10 minutes. Reminders appear inside People Atlas while it’s open.'},
 {view:'People',target:'[data-tour="add-person"]',title:'Your circle, in one place',text:'People is your directory. Use Add person for a manual entry, or open a profile to edit details, add notes, and record important dates.',tip:'Switch between cards and a compact list. Keep enriching existing profiles as you learn more about someone.'},
 {view:'People',target:'.directory-toolbar',title:'Find the detail you need',text:'Search across saved information. Select a field such as Phone to see only people with that detail, with the actual value shown in the result.',tip:'Phone + Email shows people with both. Add a value to narrow a field, combine it with search, or remove chips to widen the results.'},
 {view:'Smart folders',target:'[data-tour="folders"]',title:'Let shared details bring people together',text:'Smart folders automatically group people by saved details such as school, interests, or location. Open a group to see its people.',tip:'Groups update when profiles change. You do not need to move people into folders yourself.'},
 {view:'Insights',target:'.insight-actions',title:'Notice what is missing',text:'Insights helps you spot upcoming birthdays and gaps in your profiles. Select a useful insight to explore the people behind it.',tip:'Start with missing birthdays, then add details manually or through an AI-reviewed note.'},
 {view:'Calendar',target:'[data-tour="calendar"]',title:'Remember important dates',text:'Birthdays and saved important dates appear in Calendar. Birthday event links and calendar downloads help you set reminders.',tip:'Use a birthday link or download the birthday calendar to add dates to another app.'},
 {view:'Calendar',target:'.atlas-calendar-import > button',title:'Bring in dates from Google Calendar',text:'Choose Import from Google Calendar, pick a date range, and grant read-only access. Preview events from your primary calendar and select the ones to import.',tip:'Save selected events as tasks, reminders, or important dates. You can link them to a profile. Atlas flags events you’ve already imported.'},
 {view:'Files & export',target:'.dropzone',title:'Bring information in. Take it with you.',text:'Import supported documents and spreadsheets, review the detected people, and save. Export your circle for a backup or use in another app.',tip:'Import PDF, DOCX, CSV, TSV, XLSX, TXT, JSON or VCF files. WhatsApp chat exports can be imported as TXT. You can replay this tour anytime from the navigation menu.'},
];
export function WorkspaceTour({ready,scope,guest,view,onView,replayRequest,onTry}:{onTry:()=>void;replayRequest:number;ready:boolean;scope:string;guest:boolean;view:TourView;onView:(view:TourView)=>void}){
 const personalization=usePersonalization();
 const [open,setOpen]=useState(false),[index,setIndex]=useState(0);
 const tryAfterClose=useRef(false);
 const checked=useRef(false),previousView=useRef(view),heading=useRef<HTMLHeadingElement>(null);
 const [spot,setSpot]=useState<{top:number;left:number;width:number;height:number}|null>(null);
 useEffect(()=>{if(!open){setSpot(null);return}let frame=0;const target=document.querySelector<HTMLElement>(steps[index].target);if(!target){setSpot(null);return}target.scrollIntoView({block:'start',behavior:'instant'});const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const r=target.getBoundingClientRect();setSpot({top:r.top-5,left:r.left-5,width:r.width+10,height:r.height+10})})};update();const observer=new ResizeObserver(update);observer.observe(target);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);window.addEventListener('resize',update);window.addEventListener('scroll',update,true);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true)}},[open,index,view]);
 const key=`people-atlas-tour-v1:${scope}`;
 const start=()=>{previousView.current=view;setIndex(0);onView(steps[0].view);setOpen(true)};
 const remember=()=>{try{localStorage.setItem(key,'done')}catch{}if(!personalization.prefs.tour?.done)void personalization.save('tour',{done:true}).catch(()=>toast.error('Tour preference could not sync. It is remembered on this device.'))};
 useEffect(()=>{if(!ready||!personalization.ready||!personalization.available||checked.current)return;checked.current=true;let localDone=false;try{localDone=localStorage.getItem(key)==='done'}catch{}const accountDone=personalization.prefs.tour?.done===true;if(localDone||accountDone){if(localDone&&!accountDone)remember();return}if(shouldStartTour(localDone,accountDone)){remember();start()}},[ready,key,personalization.ready,personalization.available]);
 useEffect(()=>{if(open)heading.current?.focus({preventScroll:true})},[index,open]);
 const finish=(completed=false)=>{remember();setOpen(false);onView(completed?'Inbox':previousView.current)};
 const move=(next:number)=>{setIndex(next);onView(steps[next].view)};
 useEffect(()=>{if(replayRequest>0)start()},[replayRequest]);
 const step=steps[index];
 return <>
 {open&&spot&&createPortal(<div className="tour-spotlight" aria-hidden="true" style={spot}/>,document.body)}
 <Dialog open={open} onOpenChange={value=>{if(!value)finish()}}><DialogContent className="atlas-tour guided-tour" style={spot&&spot.top>window.innerHeight/2?{top:16,bottom:"auto"}:{top:"auto",bottom:16}} onPointerDownOutside={e=>e.preventDefault()} onCloseAutoFocus={e=>{e.preventDefault();if(tryAfterClose.current){tryAfterClose.current=false;onTry();return}const target=document.querySelector<HTMLButtonElement>('[data-tour-replay] button');if(target&&target.getBoundingClientRect().width)target.focus();else document.querySelector<HTMLButtonElement>('[data-slot="sidebar-trigger"]')?.focus()}}>
 <div className="tour-progress" aria-live="polite">Tour · {index+1} of {steps.length} · {step.view}</div>
 <div className="tour-copy"><DialogHeader><DialogTitle ref={heading} tabIndex={-1} className="tour-title">{step.title}</DialogTitle><DialogDescription className="tour-description">{step.text}</DialogDescription></DialogHeader>
 <details className="tour-extra" key={index}><summary>Example & tips</summary><p className="tour-tip">{step.tip}</p></details>
 {index===0&&<p className="muted">{guest?'Guest profiles stay in this browser. Export a backup before clearing browser data.':'Your saved profiles belong to your signed-in account.'} {guest?'The tour is shown once in this browser.':'The tour is shown once per account.'} Replay it anytime from the menu.</p>}
 </div>
 {index===steps.length-1&&<button className="outline-button" onClick={()=>{tryAfterClose.current=true;finish(true)}}>Try adding your first person</button>}
 <div className="tour-actions"><button className="quiet-button" onClick={()=>finish()}>Skip tour</button><div><button className="outline-button" disabled={index===0} onClick={()=>move(index-1)}><ArrowLeft size={16}/> Back</button><button className="primary-button" onClick={()=>index===steps.length-1?finish(true):move(index+1)}>{index===steps.length-1?'Start capturing':'Next'}<ArrowRight size={16}/></button></div></div>
 </DialogContent></Dialog></>;
}
