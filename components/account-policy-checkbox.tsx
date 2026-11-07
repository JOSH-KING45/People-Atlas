import type { accountPolicies } from '@/lib/account-policies';

export function AccountPolicyCheckbox({ policies, required = false }: {
  policies: NonNullable<ReturnType<typeof accountPolicies>>;
  required?: boolean;
}) {
  return <label className="account-policy-check">
    <input name="policyVersion" type="checkbox" value={policies.version} required={required} />
    <span>I agree to the <a href={policies.terms} target="_blank" rel="noreferrer">Terms of Use</a> and acknowledge the <a href={policies.privacy} target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
  </label>;
}
