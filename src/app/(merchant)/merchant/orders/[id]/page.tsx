import { MerchantOrderDetailContent } from '@/app/(merchant)/merchant/orders/[id]/merchant-order-detail-content';

export const metadata = {
  title: 'Buyurtma — Restoran',
  description: 'Buyurtma tarkibi va holatini boshqarish.',
};

export default async function MerchantOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MerchantOrderDetailContent orderId={id} />;
}
