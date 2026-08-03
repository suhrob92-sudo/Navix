import { ProviderEditContent } from '@/app/(admin)/admin/providers/[id]/provider-edit-content';

export const metadata = {
  title: 'Xizmatni tahrirlash — Admin',
  description: "To'lov xizmatining sozlamalarini o'zgartirish.",
};

export default async function ProviderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProviderEditContent providerId={id} />;
}
