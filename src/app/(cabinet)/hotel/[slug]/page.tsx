import { HotelDetailContent } from '@/app/(cabinet)/hotel/[slug]/hotel-detail-content';

export const metadata = {
  title: 'Mehmonxona',
  description: "Xonalar, narxlar va bo'sh joylar.",
};

export default async function HotelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <HotelDetailContent slug={slug} />;
}
