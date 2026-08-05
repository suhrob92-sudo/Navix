import { CategoryContent } from '@/app/(cabinet)/marketplace/c/[slug]/category-content';

export const metadata = { title: 'Toifa — Marketplace' };

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <CategoryContent slug={slug} />;
}
