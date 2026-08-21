import { SellerProductsContent } from '@/app/(seller)/seller/products/[id]/seller-products-content';

export const metadata = {
  title: "Ombor — Do'kon",
  description: 'Mahsulotlar, narx va zaxirani boshqarish.',
};

export default async function SellerProductsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <SellerProductsContent shopId={id} />;
}
