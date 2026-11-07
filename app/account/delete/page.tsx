import { redirect } from 'next/navigation';
import { currentUser } from '../../account';
import DeleteAccountForm from './form';

export default async function DeleteAccountPage() {
  if (!await currentUser()) redirect('/login');
  if (process.env.ATLAS_ACCOUNT_DELETION_ENABLED !== 'true') redirect('/atlas');
  return <main className="sign-in-page"><section className="sign-in-card">
    <h1>Delete account</h1>
    <p>This permanently deletes your People Atlas sign-in, cloud profiles, notes, original files, photos, and preferences. Download any exports and originals you want to keep first.</p>
    <p>Copies on your device, guest data, and events sent to Google Calendar are managed separately.</p>
    <DeleteAccountForm />
    <a href="/atlas">Back to Atlas</a>
  </section></main>;
}
