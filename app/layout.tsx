import type { Metadata,Viewport } from "next";
import "./globals.css";
import "./mobile.css";
import MobileViewport from "@/components/mobile-viewport";
import {AppearanceProvider} from "@/components/appearance";
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',interactiveWidget:'resizes-content'};
export const metadata: Metadata = {metadataBase:new URL('https://mypeople.com.ng'),title:"People Atlas · Your private people notebook",description:"Turn everyday notes and files into organized people profiles, smart folders, charts and birthday reminders.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><AppearanceProvider><MobileViewport/>{children}</AppearanceProvider></body></html>}
