import { RideContent } from '@/app/(cabinet)/taxi/[id]/ride-content';

export const metadata = {
  title: 'Safar',
  description: "Haydovchini xaritada kuzating va safar holatini ko'ring.",
};

export default async function RidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <RideContent rideId={id} />;
}
