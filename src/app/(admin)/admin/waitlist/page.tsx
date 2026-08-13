import { AdminWaitlistContent } from '@/app/(admin)/admin/waitlist/waitlist-content';

export const metadata = {
  title: 'Navbat — Admin',
  description: "Ishga tushishdan oldin navbatga yozilganlar ro'yxati.",
};

export default function AdminWaitlistPage() {
  return <AdminWaitlistContent />;
}
