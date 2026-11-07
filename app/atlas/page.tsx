import {accountPolicies} from '@/lib/account-policies';
import {redirect} from 'next/navigation';
import {currentUser} from '../account';
import PeopleWorkspace from '../people-workspace';
import {googleConnection} from '@/lib/google-config';

export const dynamic='force-dynamic';
export default async function Atlas(){
 const user=await currentUser();
 if(!user)redirect('/login');
 const policies=accountPolicies();
 if(policies&&user.app_metadata?.atlas_policy_version!==policies.version)redirect('/account/policies');
 return <PeopleWorkspace unsplashEnabled={!!process.env.UNSPLASH_ACCESS_KEY?.trim()} accountDeletion={process.env.ATLAS_ACCOUNT_DELETION_ENABLED==='true'} signInHref="/login" tourScope={user.id} appGoogleClientId={googleConnection().googleClientId}/>;
}
