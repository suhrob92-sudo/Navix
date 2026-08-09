import { ThreadContent } from '@/app/(cabinet)/messages/[id]/thread-content';

export const metadata = {
  title: 'Suhbat',
  description: 'Xabar almashish.',
};

interface ThreadPageProps {
  params: Promise<{ id: string }>;
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;

  return <ThreadContent conversationId={id} />;
}
