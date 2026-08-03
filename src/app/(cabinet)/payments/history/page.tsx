import { PaymentHistoryContent } from '@/app/(cabinet)/payments/history/history-content';

export const metadata = {
  title: "To'lovlar tarixi",
  description: "Barcha xizmat to'lovlari va cheklar.",
};

export default function PaymentHistoryPage() {
  return <PaymentHistoryContent />;
}
