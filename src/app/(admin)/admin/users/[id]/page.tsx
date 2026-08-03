import { AdminUserDetailContent } from '@/app/(admin)/admin/users/[id]/user-detail-content';

export const metadata = {
  title: 'Foydalanuvchi — Admin',
  description: "Foydalanuvchi ma'lumotlari va hisob holati.",
};

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <AdminUserDetailContent userId={id} />;
}
