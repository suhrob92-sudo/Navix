import { AdminUsersContent } from '@/app/(admin)/admin/users/users-content';

export const metadata = {
  title: 'Foydalanuvchilar — Admin',
  description: 'Foydalanuvchilarni qidirish va boshqarish.',
};

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
