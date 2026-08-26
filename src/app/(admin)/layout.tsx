import { AdminTabBar } from '@/components/admin/admin-tab-bar';
import { Permission } from '@/config/rbac';
import { RequireAdmin } from '@/modules/admin/require-admin';

/**
 * Admin panel qolipi.
 *
 * Nima uchun `(cabinet)` ichida emas, alohida guruh: admin panelda
 * boshqa navigatsiya kerak. Foydalanuvchi menyusi (Bosh sahifa,
 * Qidiruv, AI, Buyurtmalar, Profil) bu yerda ma'nosiz — admin
 * bo'limlari butunlay boshqa.
 *
 * ── Ruxsat IKKI qavatda tekshiriladi ─────────────────────────────────
 * Qolipda — panelga KIRISH huquqi (`PLATFORM_ADMIN_ACCESS`). U
 * admin, super-admin va qo'llab-quvvatlash xodimida bor.
 *
 * Sahifalarda — o'sha bo'limning O'Z huquqi: tranzaksiyalarni
 * qo'llab-quvvatlash xodimi ko'radi, xizmatlarni esa yo'q.
 *
 * Ilgari faqat ikkinchi qavat bor edi va u ESLAB QOLISHGA tayanardi:
 * yangi sahifada qo'riqchi unutilsa, admin paneli ekrani hamma
 * uchun ochilib qolardi.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin permission={Permission.PLATFORM_ADMIN_ACCESS}>
      <div className="pb-tabbar mx-auto w-full max-w-lg flex-1">{children}</div>

      <AdminTabBar />
    </RequireAdmin>
  );
}
