export function accountPolicies() {
  const version = process.env.ATLAS_POLICY_VERSION?.trim();
  const privacy = process.env.ATLAS_PRIVACY_URL?.trim();
  const terms = process.env.ATLAS_TERMS_URL?.trim();
  if (!version || !privacy || !terms) return null;
  if (![privacy, terms].every(value => URL.canParse(value) && new URL(value).protocol === 'https:')) return null;
  return { version, privacy, terms };
}
