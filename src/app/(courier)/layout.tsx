import { CourierTabBar } from '@/components/courier/courier-tab-bar';

/**
 * Kuryer kabineti qolipi.
 *
 * Alohida guruh: kuryerga mijoz menyusi (Ovqat, Marketplace, AI)
 * kerak emas — u faqat topshiriqlar bilan ishlaydi.
 */
export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-lg flex-1 pb-tabbar">{children}</div>

      <CourierTabBar />
    </>
  );
}
