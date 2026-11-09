'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { birthdayParts, type Person } from '@/lib/people';
import type { Task } from '@/lib/tasks';
import styles from './atlas-month-calendar.module.css';

export type ProfileDate = { person: Person; label: string; date: Date };

type Entry = { id: string; title: string; detail: string; time?: string };
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const taskLabels = { task: 'Task', reminder: 'Reminder', date: 'Important date' };
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'full' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

function dateKey(date: Date) {
 return [String(date.getFullYear()).padStart(4, '0'), String(date.getMonth()+1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function AtlasMonthCalendar({ people, profileDates, tasks, addDisabled, onAdd }: {
 people: Person[];
 profileDates: ProfileDate[];
 tasks: Task[];
 addDisabled: boolean;
 onAdd: (date: string) => void;
}) {
 const [selected, setSelected] = useState<Date | null>(null);
 useEffect(() => { setSelected(new Date()); }, []);

 const year = selected?.getFullYear();
 const month = selected?.getMonth();
 const entries = useMemo(() => {
  const days = new Map<string, Entry[]>();
  const add = (key: string, entry: Entry) => {
   const list = days.get(key);
   if (list) list.push(entry);
   else days.set(key, [entry]);
  };
  if (year === undefined || month === undefined) return days;
  for (const person of people) {
   const birthday = birthdayParts(person.fields.Birthday || '');
   if (!birthday || birthday.month !== month+1) continue;
   const date = new Date(year, month, birthday.day);
   if (date.getMonth() === month && (birthday.year === undefined || year >= birthday.year)) {
    add(dateKey(date), { id: 'birthday-' + person.id, title: person.name + '’s birthday', detail: 'Birthday' });
   }
  }
  for (const item of profileDates) {
   add(dateKey(item.date), { id: item.person.id + '-' + item.label, title: item.label, detail: item.person.name });
  }
  for (const task of tasks) {
   const date: Date | null = task.dueAt ? new Date(task.dueAt) : null;
   const key = date ? dateKey(date) : task.dueOn;
   if (!key) continue;
   const detail = [taskLabels[task.kind], task.googleEventId && 'Google Calendar', task.completed && 'Completed'].filter(Boolean).join(' · ');
   add(key, { id: task.id, title: task.title, detail, time: date ? timeFormat.format(date) : undefined });
  }
  return days;
 }, [people, profileDates, tasks, year, month]);

 if (!selected) return null;
 const selectedKey = dateKey(selected);
 const todayKey = dateKey(new Date());
 const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
 const offset = first.getDay();
 const last = new Date(first.getFullYear(), first.getMonth()+1, 0).getDate();
 const agenda = entries.get(selectedKey) ?? [];
 const moveMonth = (step: number) => setSelected(new Date(first.getFullYear(), first.getMonth()+step, 1));

 return <section className={'panel ' + styles.calendar} aria-labelledby="atlas-month-title">
  <div className={styles.toolbar}>
   <h2 id="atlas-month-title" aria-live="polite">{monthFormat.format(first)}</h2>
   <div className={styles.navigation}>
    <button type="button" className="outline-button" aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={17} aria-hidden="true"/></button>
    <button type="button" className="outline-button" onClick={()=>setSelected(new Date())}>Today</button>
    <button type="button" className="outline-button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={17} aria-hidden="true"/></button>
   </div>
  </div>
  <div className={styles.days} role="group" aria-label="Days of the month">
   {weekdays.map(day=><span className={styles.weekday} key={day}>{day}</span>)}
   {Array.from({ length: offset }, (_, index)=><span key={'blank-' + index} aria-hidden="true"/>)}
   {Array.from({ length: last }, (_, index)=>{
    const day = index+1;
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    const key = dateKey(date);
    const count = entries.get(key)?.length ?? 0;
    return <button type="button" key={key} className={styles.day} aria-pressed={key===selectedKey}
     aria-current={key===todayKey?'date':undefined}
     aria-label={dayFormat.format(date) + (count ? ', ' + count + (count===1?' item':' items') : '')}
     onClick={()=>setSelected(date)}>
     {day}{count>0&&<span className={styles.count} aria-hidden="true">{count}</span>}
    </button>;
   })}
  </div>
  <section className={styles.agenda} aria-labelledby="atlas-day-title">
   <div className={styles.toolbar}>
    <h3 id="atlas-day-title" aria-live="polite">{dayFormat.format(selected)}</h3>
    <button type="button" className="outline-button" disabled={addDisabled} onClick={()=>onAdd(selectedKey)}>Add task or reminder for this day</button>
   </div>
   {agenda.length ? <ul className={styles.entries}>{agenda.map(entry=><li key={entry.id}>
    <strong>{entry.title}</strong>
    <div className="muted">{entry.detail}{entry.time && ' · ' + entry.time}</div>
   </li>)}</ul> : <p className="muted">Nothing scheduled for this day.</p>}
  </section>
 </section>;
}
