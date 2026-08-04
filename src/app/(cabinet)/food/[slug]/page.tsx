import { RestaurantContent } from '@/app/(cabinet)/food/[slug]/restaurant-content';

export const metadata = {
  title: 'Restoran',
  description: 'Menyu va buyurtma berish.',
};

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <RestaurantContent slug={slug} />;
}
