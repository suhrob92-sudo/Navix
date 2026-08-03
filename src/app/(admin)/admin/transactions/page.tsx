import { AdminTransactionsContent } from '@/app/(admin)/admin/transactions/transactions-content';

export const metadata = {
  title: 'Tranzaksiyalar — Admin',
  description: 'Barcha hamyon amallarini kuzatish.',
};

export default function AdminTransactionsPage() {
  return <AdminTransactionsContent />;
}
