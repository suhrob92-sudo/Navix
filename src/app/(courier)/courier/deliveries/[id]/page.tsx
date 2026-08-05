import { DeliveryDetailContent } from '@/app/(courier)/courier/deliveries/[id]/delivery-detail-content';

export const metadata = {
  title: 'Topshiriq — Kuryer',
  description: 'Yetkazish tafsilotlari va bosqichlari.',
};

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <DeliveryDetailContent deliveryId={id} />;
}
