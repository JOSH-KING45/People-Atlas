import type { Metadata } from 'next';
import Landing from './landing';
import {currentUser} from './account';

const title = 'People Atlas | Personal CRM & Private Contact Notebook';
const description = 'Organize contacts and notes, remember birthdays, and track follow-ups in People Atlas. Try the private contact notebook in guest mode without an account.';

export const metadata: Metadata = {
 title,
 description,
 alternates: { canonical: '/' },
 openGraph: { title, description, url: '/', siteName: 'People Atlas', type: 'website' },
};

export const dynamic = 'force-dynamic';
export default async function Home(){
 const user=await currentUser();
 return <Landing signedIn={!!user}/>;
}
