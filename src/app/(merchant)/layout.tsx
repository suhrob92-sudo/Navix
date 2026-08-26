import { RequireMerchant } from '@/modules/merchant/require-merchant';
import { MerchantTabBar } from '@/components/merchant/merchant-tab-bar';

/**
 * Restoran kabineti qolipi.
 *
 * Alohida guruh: restoran xodimiga mijoz menyusi (Bosh sahifa, AI,
 * Profil) kerak emas — u faqat buyurtmalar bilan ishlaydi.
 */
export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  /*
    ── Qo'riqchi QOLIPDA, har sahifada emas ──────────────────────────
    Ilgari har bir sahifa `RequireMerchant` ni o'zi chaqirardi va hozirgi
    sahifalarning hammasi buni to'g'ri qilgan.

    Lekin bu ESLAB QOLISHGA tayanadi: ertaga yangi sahifa qo'shilib,
    qo'riqchi unutilsa, restoran xodimi kabinetining bir ekrani hamma uchun
    ochilib qolardi.

    Qolipda esa unutib bo'lmaydi — u barcha sahifalarni o'raydi.
    Sahifalardagi qo'riqchilar qoldirildi: ular zarar qilmaydi
    (tekshiruv xotiradan o'qiladi, so'rov yubormaydi) va fayl
    o'zi-o'zidan tushunarli bo'lib qoladi.

    MUHIM: bu FAQAT qulaylik. Haqiqiy himoya — `/api/v1/merchant/*`
    dagi `requirePermission()`.
  */
  return (
    <RequireMerchant>
      <div className="pb-tabbar mx-auto w-full max-w-lg flex-1">{children}</div>

      <MerchantTabBar />
    </RequireMerchant>
  );
}
