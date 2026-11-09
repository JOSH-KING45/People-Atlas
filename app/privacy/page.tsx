import { LegalPage } from '@/components/legal-page';
import { privacySections } from '@/lib/legal-content';

export const metadata = { title: 'Privacy Policy | People Atlas', description: 'Learn how People Atlas handles contact information, account data, and Google integrations.', alternates: { canonical: '/privacy' } };

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" sections={privacySections} />;
}
