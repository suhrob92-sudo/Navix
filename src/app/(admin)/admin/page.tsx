import { AdminDashboardContent } from '@/app/(admin)/admin/admin-dashboard-content';

export const metadata = {
  title: 'Admin panel',
  description: "Platforma ko'rsatkichlari va boshqaruv.",
};

export default function AdminPage() {
  return <AdminDashboardContent />;
}
