import { OrderDetailContent } from '@/app/(cabinet)/orders/[id]/order-detail-content';

export const metadata = {
  title: 'Buyurtma',
  description: 'Buyurtma holati va tarkibi.',
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <OrderDetailContent orderId={id} />;
}
