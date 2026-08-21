import { SellerTabBar } from '@/components/seller/seller-tab-bar';

/**
 * Sotuvchi kabineti qolipi.
 *
 * Alohida guruh: do'kon xodimiga mijoz menyusi (Bosh sahifa, AI,
 * Profil) kerak emas — u faqat buyurtma va ombor bilan ishlaydi.
 */
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto w-full max-w-lg flex-1 pb-tabbar">{children}</div>

      <SellerTabBar />
    </>
  );
}
