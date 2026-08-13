import { TicketContent } from '@/app/(cabinet)/support/[id]/ticket-content';

export const metadata = {
  title: 'Murojaat',
  description: 'Murojaat va yozishma.',
};

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TicketContent ticketId={id} />;
}
