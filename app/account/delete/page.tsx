import { redirect } from 'next/navigation';
import { currentUser } from '../../account';
import DeleteAccountForm from './form';

export default async function DeleteAccountPage() {
  if (!await currentUser()) redirect('/login');
  const selfService = process.env.ATLAS_ACCOUNT_DELETION_ENABLED === 'true';
  return <main className="sign-in-page"><section className="sign-in-card">
    <h1>Delete account</h1>
    {selfService ? <>
    <p>This permanently deletes your People Atlas sign-in, cloud profiles, notes, original files, photos, and preferences. Download any exports and originals you want to keep first.</p>
    <p>Copies on your device, guest data, and events sent to Google Calendar are managed separately.</p>
    <DeleteAccountForm />
      <p>Recent uploads may need time to expire. If prompted, return and confirm deletion again.</p>
    </> : <>
      <p>To request deletion, email <a className="text-button" href="mailto:josh.a.japhet@gmail.com?subject=People%20Atlas%20account%20deletion">josh.a.japhet@gmail.com</a> from the address you use to sign in to People Atlas.</p>
      <p>Download any exports and original files you want to keep before requesting deletion.</p>
    </>}
    {selfService && <p>Need help? Email <a className="text-button" href="mailto:josh.a.japhet@gmail.com">josh.a.japhet@gmail.com</a>.</p>}
    <a href="/atlas">Back to Atlas</a>
  </section></main>;
}
