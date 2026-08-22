import { GroupInfoContent } from '@/app/(cabinet)/messages/[id]/info/group-info-content';

export const metadata = {
  title: "Guruh ma'lumoti",
  description: "Guruh nomi, rasmi va a'zolari.",
};

export default async function GroupInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <GroupInfoContent conversationId={id} />;
}
