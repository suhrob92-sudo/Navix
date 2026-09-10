import { TrackContent } from '@/app/posilka/[token]/track-content';

/**
 * Posilkani kuzatish sahifasi — KIRISH TALAB QILINMAYDI.
 *
 * ── Nima uchun `(cabinet)` guruhida emas ──────────────────────────────
 * `(cabinet)` ichidagi hamma sahifa `RequireAuth` bilan o'ralgan.
 * Bu sahifa esa aynan kirmagan odam uchun: posilkani kutayotgan
 * qarindosh yoki mijoz ilovadan foydalanmasligi mumkin.
 *
 * `/posilka` manzili `protected-routes.ts` ro'yxatida ham YO'Q, ya'ni
 * proxy uni kirish sahifasiga yubormaydi.
 */
export const metadata = {
  title: 'Posilkani kuzatish',
  description: "Navix posilkasining holatini ko'ring.",
  /* Qidiruv tizimlari indekslamasin: havola shaxsiy. */
  robots: { index: false, follow: false },
};

export default async function TrackParcelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <TrackContent token={token} />;
}
