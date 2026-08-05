import { ShopContent } from '@/app/(cabinet)/marketplace/s/[slug]/shop-content';

export const metadata = { title: "Do'kon — Marketplace" };

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ShopContent slug={slug} />;
}
