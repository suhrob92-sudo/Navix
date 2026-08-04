import { MerchantMenuContent } from '@/app/(merchant)/merchant/menu/[id]/merchant-menu-content';

export const metadata = {
  title: 'Menyu — Restoran',
  description: 'Taomlar mavjudligi va narxlari.',
};

export default async function MerchantMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <MerchantMenuContent restaurantId={id} />;
}
