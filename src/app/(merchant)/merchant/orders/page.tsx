import { MerchantOrdersContent } from '@/app/(merchant)/merchant/orders/merchant-orders-content';

export const metadata = {
  title: 'Buyurtmalar — Restoran',
  description: 'Kelgan buyurtmalar va ularning holati.',
};

export default function MerchantOrdersPage() {
  return <MerchantOrdersContent />;
}
