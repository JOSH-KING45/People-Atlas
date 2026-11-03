"use client";
import {useEffect,useState} from 'react';
import {ThemeProvider,useTheme} from 'next-themes';
import {Moon,Sun} from 'lucide-react';

export function AppearanceProvider({children}:{children:React.ReactNode}){
 return <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="people-atlas-theme">{children}</ThemeProvider>;
}
export function ThemeToggle(){
 const {resolvedTheme,setTheme}=useTheme();const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 const dark=mounted&&resolvedTheme==='dark';
 return <button className="icon-button theme-toggle" type="button" disabled={!mounted} aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Switch to light mode':'Switch to dark mode'} onClick={()=>setTheme(dark?'light':'dark')}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>;
}
