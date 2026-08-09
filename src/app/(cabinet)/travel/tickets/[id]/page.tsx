import { TicketDetailContent } from '@/app/(cabinet)/travel/tickets/[id]/ticket-detail-content';

export const metadata = {
  title: 'Chipta',
  description: 'Chipta tafsilotlari.',
};

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  return <TicketDetailContent ticketId={id} />;
}
