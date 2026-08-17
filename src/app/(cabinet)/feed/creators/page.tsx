import type { Metadata } from 'next';

import { CreatorsContent } from '@/app/(cabinet)/feed/creators/creators-content';

export const metadata: Metadata = {
  title: 'Ijodkorlar',
  description: 'Hamkorlikka ochiq blogerlar va ijodkorlar katalogi.',
};

export default function CreatorsPage() {
  return <CreatorsContent />;
}
