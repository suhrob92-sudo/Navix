import { PayContent } from '@/app/(cabinet)/payments/[providerId]/pay-content';

export const metadata = {
  title: "To'lov",
  description: "Xizmat uchun to'lov qilish.",
};

export default async function PayPage({ params }: { params: Promise<{ providerId: string }> }) {
  const { providerId } = await params;

  return <PayContent providerId={providerId} />;
}
