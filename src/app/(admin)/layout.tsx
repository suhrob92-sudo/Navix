import { AdminTabBar } from '@/components/admin/admin-tab-bar';

/**
 * Admin panel qolipi.
 *
 * Nima uchun `(cabinet)` ichida emas, alohida guruh: admin panelda
 * boshqa navigatsiya kerak. Foydalanuvchi menyusi (Bosh sahifa,
 * Qidiruv, AI, Buyurtmalar, Profil) bu yerda ma'nosiz — admin
 * bo'limlari butunlay boshqa.
 *
 * Ruxsat tekshiruvi bu yerda EMAS, har bir sahifada alohida:
 * bo'limlar har xil ruxsat talab qiladi (masalan tranzaksiyalarni
 * qo'llab-quvvatlash xodimi ko'radi, xizmatlarni esa yo'q).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-lg flex-1 pb-24">{children}</div>

      <AdminTabBar />
    </>
  );
}
