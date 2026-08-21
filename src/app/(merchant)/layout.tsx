import { MerchantTabBar } from '@/components/merchant/merchant-tab-bar';

/**
 * Restoran kabineti qolipi.
 *
 * Alohida guruh: restoran xodimiga mijoz menyusi (Bosh sahifa, AI,
 * Profil) kerak emas — u faqat buyurtmalar bilan ishlaydi.
 */
export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-tabbar mx-auto w-full max-w-lg flex-1">{children}</div>

      <MerchantTabBar />
    </>
  );
}
