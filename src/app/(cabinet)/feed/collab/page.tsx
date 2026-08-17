import type { Metadata } from 'next';

import { CollabContent } from '@/app/(cabinet)/feed/collab/collab-content';

export const metadata: Metadata = {
  title: 'Hamkorlik',
  description: 'Hamkorlik takliflari — kelgan va yuborilgan.',
};

export default function CollabPage() {
  return <CollabContent />;
}
