import { ReceiptContent } from '@/app/(cabinet)/payments/receipt/[id]/receipt-content';

export const metadata = {
  title: 'Chek',
  description: "To'lov tafsilotlari.",
};

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ReceiptContent paymentId={id} />;
}
