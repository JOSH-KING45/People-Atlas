import { AccountPolicyDocuments } from '@/components/account-policy-documents';
import { redirect } from 'next/navigation';
import { currentUser } from '@/app/account';
import { AccountPolicyCheckbox } from '@/components/account-policy-checkbox';
import { accountPolicies } from '@/lib/account-policies';
import { logout } from '../../login/actions';
import { acceptPolicies } from './actions';

export default async function AccountPoliciesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const policies = accountPolicies();
  if (!policies || user.app_metadata?.atlas_policy_version === policies.version) redirect('/atlas');
  const { status } = await searchParams;
  return <main className="sign-in-page"><section className="sign-in-card">
    <h1>Review People Atlas policies</h1>
    <p>Read the Privacy Policy and Terms of Use before continuing to your workspace.</p>
    <AccountPolicyDocuments policies={policies} />
    {status && <p role="alert">Acceptance could not be saved. Check the box and try again.</p>}
    <form action={acceptPolicies}>
      <AccountPolicyCheckbox policies={policies} required />
      <button className="primary-button spaced">Continue to Atlas</button>
    </form>
    <form action={logout}><button className="text-button">Sign out</button></form>
    <a href="/account/delete">Delete account</a>
  </section></main>;
}
