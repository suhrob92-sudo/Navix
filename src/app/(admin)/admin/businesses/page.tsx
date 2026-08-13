import { AdminBusinessesContent } from '@/app/(admin)/admin/businesses/businesses-content';

export const metadata = {
  title: 'Bizneslar — Admin',
  description: "Do'kon, restoran va mehmonxonalarni boshqarish.",
};

export default function AdminBusinessesPage() {
  return <AdminBusinessesContent />;
}
