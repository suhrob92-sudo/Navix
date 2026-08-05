import { MarketOrderDetailContent } from '@/app/(cabinet)/marketplace/orders/[id]/market-order-detail-content';

export const metadata = { title: 'Buyurtma — Marketplace' };

export default async function MarketOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MarketOrderDetailContent orderId={id} />;
}
