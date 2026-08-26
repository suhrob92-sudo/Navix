import { RequireCourier } from '@/modules/courier/require-courier';
import { CourierTabBar } from '@/components/courier/courier-tab-bar';

/**
 * Kuryer kabineti qolipi.
 *
 * Alohida guruh: kuryerga mijoz menyusi (Ovqat, Marketplace, AI)
 * kerak emas — u faqat topshiriqlar bilan ishlaydi.
 */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  /*
    ── Qo'riqchi QOLIPDA, har sahifada emas ──────────────────────────
    Ilgari har bir sahifa `RequireCourier` ni o'zi chaqirardi va hozirgi
    sahifalarning hammasi buni to'g'ri qilgan.

    Lekin bu ESLAB QOLISHGA tayanadi: ertaga yangi sahifa qo'shilib,
    qo'riqchi unutilsa, kuryer kabinetining bir ekrani hamma uchun
    ochilib qolardi.

    Qolipda esa unutib bo'lmaydi — u barcha sahifalarni o'raydi.
    Sahifalardagi qo'riqchilar qoldirildi: ular zarar qilmaydi
    (tekshiruv xotiradan o'qiladi, so'rov yubormaydi) va fayl
    o'zi-o'zidan tushunarli bo'lib qoladi.

    MUHIM: bu FAQAT qulaylik. Haqiqiy himoya — `/api/v1/courier/*`
    dagi `requirePermission()`.
  */
  return (
    <RequireCourier>
      <div className="pb-tabbar mx-auto w-full max-w-lg flex-1">{children}</div>

      <CourierTabBar />
    </RequireCourier>
  );
}
