import { SellerOrderDetailContent } from '@/app/(seller)/seller/orders/[id]/seller-order-detail-content';

export const metadata = {
  title: "Buyurtma — Do'kon",
  description: 'Buyurtma tarkibi va holatini boshqarish.',
};

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <SellerOrderDetailContent orderId={id} />;
}
