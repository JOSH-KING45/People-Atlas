"use client";
import {SidebarMenuButton,useSidebar} from './ui/sidebar';
export function WorkspaceNavButton({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){const {setOpenMobile}=useSidebar();return <SidebarMenuButton isActive={active} aria-current={active?'page':undefined} onClick={()=>{onClick();setOpenMobile(false)}}>{children}</SidebarMenuButton>}
