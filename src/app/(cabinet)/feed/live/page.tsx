import type { Metadata } from 'next';

import { LiveContent } from '@/app/(cabinet)/feed/live/live-content';

export const metadata: Metadata = {
  title: 'Jonli efirlar',
  description: "Rejalashtirilgan efirlar — eslatib qo'ying va o'tkazib yubormang.",
};

export default function LivePage() {
  return <LiveContent />;
}
