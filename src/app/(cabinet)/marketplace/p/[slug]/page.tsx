import { ProductContent } from '@/app/(cabinet)/marketplace/p/[slug]/product-content';

export const metadata = { title: 'Mahsulot — Marketplace' };

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ProductContent slug={slug} />;
}
