import type { accountPolicies } from '@/lib/account-policies';
import { privacySections, termsSections } from '@/lib/legal-content';
import { LegalSections } from './legal-page';

export function AccountPolicyDocuments({ policies }: {
  policies: NonNullable<ReturnType<typeof accountPolicies>>;
}) {
  const documents = [
    { title: 'Privacy Policy', path: '/privacy', href: policies.privacy, sections: privacySections },
    { title: 'Terms of Use', path: '/terms', href: policies.terms, sections: termsSections },
  ];

  return <div className="account-policy-documents" aria-label="Policy documents">
    {documents.map(({ title, path, href, sections }) => href === path ?
      <details key={title}>
        <summary>Read the {title}</summary>
        <div className="account-policy-body">
          <a href={href} target="_blank" rel="noreferrer">Open {title} in a new tab</a>
          <LegalSections sections={sections} heading="h3" />
        </div>
      </details> :
      <a key={title} href={href} target="_blank" rel="noreferrer">Read the {title} (opens in a new tab)</a>
    )}
  </div>;
}
