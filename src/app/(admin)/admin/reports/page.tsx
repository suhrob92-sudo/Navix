import { AdminReportsContent } from '@/app/(admin)/admin/reports/reports-content';

export const metadata = {
  title: 'Shikoyatlar — Admin',
  description: "Foydalanuvchilar shikoyatlari va ular bo'yicha qarorlar.",
};

export default function AdminReportsPage() {
  return <AdminReportsContent />;
}
