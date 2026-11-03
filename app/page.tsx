import {googleConnection} from '@/lib/google-config';
import Landing from './landing';
import {currentUser} from './account';
import PeopleWorkspace from './people-workspace';

export const dynamic = 'force-dynamic';

export default async function Home(){
  const user = await currentUser();
  const signInHref = '/login';

  if(user) return <PeopleWorkspace signInHref={signInHref} tourScope={user.id} appGoogleClientId={googleConnection().googleClientId}/>;

  return <Landing/>;
}
