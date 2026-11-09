import { LegalPage } from '@/components/legal-page';
import { termsSections } from '@/lib/legal-content';

export const metadata = { title: 'Terms of Use | People Atlas', description: 'Read the terms for using the People Atlas contact notebook and its account features.', alternates: { canonical: '/terms' } };

export default function TermsPage() {
  return <LegalPage title="Terms of Use" sections={termsSections} />;
}
