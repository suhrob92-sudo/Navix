import type { Metadata } from 'next';

import { FavoritesContent } from '@/app/(cabinet)/favorites/favorites-content';

export const metadata: Metadata = {
  title: 'Sevimlilar',
  description: "Saqlab qo'ygan mahsulot, taom, mehmonxona va vakansiyalaringiz.",
};

export default function FavoritesPage() {
  return <FavoritesContent />;
}
