import { TripDetailContent } from '@/app/(cabinet)/travel/[scheduleId]/trip-detail-content';

export const metadata = {
  title: 'Reys',
  description: 'Reys tafsilotlari va chipta olish.',
};

interface TripPageProps {
  params: Promise<{ scheduleId: string }>;
}

export default async function TripPage({ params }: TripPageProps) {
  const { scheduleId } = await params;

  return <TripDetailContent scheduleId={scheduleId} />;
}
