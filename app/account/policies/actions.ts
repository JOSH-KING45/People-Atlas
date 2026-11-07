'use server';

import { redirect } from 'next/navigation';
import { currentUser } from '@/app/account';
import { accountPolicies } from '@/lib/account-policies';
import { adminClient } from '@/lib/supabase';

export async function acceptPolicies(form: FormData) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const policies = accountPolicies();
  if (!policies || user.app_metadata?.atlas_policy_version === policies.version) redirect('/atlas');
  if (form.get('policyVersion') !== policies.version) redirect('/account/policies?status=required');
  const { error } = await adminClient().auth.admin.updateUserById(user.id, {
    app_metadata: { atlas_policy_version: policies.version, atlas_policy_accepted_at: new Date().toISOString() },
  });
  if (error) redirect('/account/policies?status=retry');
  redirect('/atlas');
}
