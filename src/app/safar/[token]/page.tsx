import { ShareContent } from '@/app/safar/[token]/share-content';

/**
 * Ulashilgan safar sahifasi — KIRISH TALAB QILINMAYDI.
 *
 * ── Nima uchun `(cabinet)` guruhida emas ──────────────────────────────
 * `(cabinet)` ichidagi hamma sahifa `RequireAuth` bilan o'ralgan.
 * Bu sahifa esa aynan kirmagan odam uchun: safarni kuzatayotgan
 * qarindosh ilovadan foydalanmasligi mumkin.
 *
 * `/safar` manzili `protected-routes.ts` ro'yxatida ham yo'q, ya'ni
 * proxy uni kirish sahifasiga yubormaydi.
 */
export const metadata = {
  title: 'Safarni kuzatish',
  description: 'Navix safarini jonli kuzating.',
  /* Qidiruv tizimlari indekslamasin: havola shaxsiy. */
  robots: { index: false, follow: false },
};

export default async function SharedRidePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <ShareContent token={token} />;
}
