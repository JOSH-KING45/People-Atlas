import {redirect} from 'next/navigation';
import {currentUser} from '../account';
import PeopleWorkspace from '../people-workspace';
import {googleConnection} from '@/lib/google-config';

export const dynamic='force-dynamic';
export default async function Atlas(){
 const user=await currentUser();
 if(!user)redirect('/login');
 return <PeopleWorkspace signInHref="/login" tourScope={user.id} appGoogleClientId={googleConnection().googleClientId}/>;
}
