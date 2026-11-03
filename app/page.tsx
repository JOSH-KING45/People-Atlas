import Landing from './landing';
import {currentUser} from './account';

export const dynamic = 'force-dynamic';
export default async function Home(){
 const user=await currentUser();
 return <Landing signedIn={!!user}/>;
}
