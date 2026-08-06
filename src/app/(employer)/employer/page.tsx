import { EmployerDashboardContent } from '@/app/(employer)/employer/employer-dashboard-content';

export const metadata = {
  title: 'Ish beruvchi kabineti',
  description: "Vakansiyalar, nomzodlar va ko'rsatkichlar.",
};

export default function EmployerPage() {
  return <EmployerDashboardContent />;
}
