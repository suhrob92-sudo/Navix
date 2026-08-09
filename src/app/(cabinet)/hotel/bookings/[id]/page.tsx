import { BookingDetailContent } from '@/app/(cabinet)/hotel/bookings/[id]/booking-detail-content';

export const metadata = {
  title: 'Bandlov',
  description: 'Bandlov tafsilotlari.',
};

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params;

  return <BookingDetailContent bookingId={id} />;
}
