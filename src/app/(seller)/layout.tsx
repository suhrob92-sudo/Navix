import { RequireSeller } from '@/modules/seller/require-seller';
import { SellerTabBar } from '@/components/seller/seller-tab-bar';

/**
 * Sotuvchi kabineti qolipi.
 *
 * Alohida guruh: do'kon xodimiga mijoz menyusi (Bosh sahifa, AI,
 * Profil) kerak emas — u faqat buyurtma va ombor bilan ishlaydi.
 */
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  /*
    ── Qo'riqchi QOLIPDA, har sahifada emas ──────────────────────────
    Ilgari har bir sahifa `RequireSeller` ni o'zi chaqirardi va hozirgi
    sahifalarning hammasi buni to'g'ri qilgan.

    Lekin bu ESLAB QOLISHGA tayanadi: ertaga yangi sahifa qo'shilib,
    qo'riqchi unutilsa, sotuvchi kabinetining bir ekrani hamma uchun
    ochilib qolardi.

    Qolipda esa unutib bo'lmaydi — u barcha sahifalarni o'raydi.
    Sahifalardagi qo'riqchilar qoldirildi: ular zarar qilmaydi
    (tekshiruv xotiradan o'qiladi, so'rov yubormaydi) va fayl
    o'zi-o'zidan tushunarli bo'lib qoladi.

    MUHIM: bu FAQAT qulaylik. Haqiqiy himoya — `/api/v1/seller/*`
    dagi `requirePermission()`.
  */
  return (
    <RequireSeller>
      <div className="pb-tabbar mx-auto w-full max-w-lg flex-1">{children}</div>

      <SellerTabBar />
    </RequireSeller>
  );
}
