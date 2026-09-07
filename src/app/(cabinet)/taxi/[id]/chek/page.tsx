import { TaxiReceiptContent } from '@/app/(cabinet)/taxi/[id]/chek/receipt-content';

export const metadata = {
  title: 'Safar cheki',
  description: "Safar raqami, sana, masofa va to'langan summa.",
};

export default async function TaxiReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TaxiReceiptContent rideId={id} />;
}
