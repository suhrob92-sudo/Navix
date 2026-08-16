import { ContentSettingsContent } from '@/app/(cabinet)/feed/settings/content/content-settings';

export const metadata = {
  title: 'Kontent sozlamalari',
  description: "Qiziqish mavzulari va hassos kontent filtri.",
};

export default function ContentSettingsPage() {
  return <ContentSettingsContent />;
}
