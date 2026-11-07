import { LegalPage } from '@/components/legal-page';
import { privacySections } from '@/lib/legal-content';

export const metadata = { title: 'Privacy Policy | People Atlas' };

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" sections={privacySections} />;
}
