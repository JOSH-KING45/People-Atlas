import type { Metadata } from "next";
import "./globals.css";
import {AppearanceProvider} from "@/components/appearance";
export const metadata: Metadata = {title:"People Atlas · Your private people notebook",description:"Turn everyday notes and files into organized people profiles, smart folders, charts and birthday reminders.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><body><AppearanceProvider>{children}</AppearanceProvider></body></html>}
