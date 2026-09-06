import { DriverTabBar } from '@/components/driver/driver-tab-bar';
import { RequireDriver } from '@/modules/taxi/require-driver';

/**
 * Haydovchi kabineti qolipi.
 *
 * Alohida guruh: haydovchiga mijoz menyusi (Ovqat, Marketplace, AI)
 * kerak emas — u faqat buyurtmalar bilan ishlaydi.
 *
 * Qo'riqchi QOLIPDA, har sahifada emas — kuryer kabinetidagi bilan
 * bir xil sabab: qolipda uni unutib bo'lmaydi, sahifada esa ertaga
 * yangi ekran qo'shilib, qo'riqchi tushib qolishi mumkin.
 *
 * MUHIM: bu FAQAT qulaylik. Haqiqiy himoya — `/api/v1/taxi/driver/*`
 * dagi `requirePermission()`.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireDriver>
      <div className="pb-tabbar mx-auto w-full max-w-lg flex-1">{children}</div>

      <DriverTabBar />
    </RequireDriver>
  );
}
