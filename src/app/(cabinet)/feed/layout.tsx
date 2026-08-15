import { FeedCreateProvider } from '@/components/feed/feed-create-provider';
import { FeedTabBar } from '@/components/feed/feed-tab-bar';

/**
 * Feed moduli qolipi.
 *
 * ── Nima uchun Feed'ning alohida qolipi bor ───────────────────────────
 * Feed endi ko'p sahifali mustaqil modul: lenta, video oqimi, qidiruv,
 * yaratish va shaxsiy profil. Xuddi telefondagi alohida ilova kabi —
 * ichkariga kirilganda o'z navigatsiyasi ishlaydi.
 *
 * Qolip ikki narsani beradi:
 *   1. Feed'ning o'z pastki paneli (ilovaniki shu vaqtda yashiriladi);
 *   2. "Yaratish" boshqaruvi — u BARCHA Feed sahifalarida bir xil
 *      ishlashi kerak, faqat lentada emas.
 *
 * Qolip almashganda qayta chizilmaydi: sahifadan sahifaga o'tganda
 * yozib qo'yilgan post matni yo'qolmaydi.
 */
export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeedCreateProvider>
      {children}

      <FeedTabBar />
    </FeedCreateProvider>
  );
}
