import { LegalPage } from '@/components/legal-page';
import { termsSections } from '@/lib/legal-content';

export const metadata = { title: 'Terms of Use | People Atlas' };

export default function TermsPage() {
  return <LegalPage title="Terms of Use" sections={termsSections} />;
}
