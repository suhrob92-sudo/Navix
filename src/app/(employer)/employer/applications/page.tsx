import { EmployerApplicationsContent } from '@/app/(employer)/employer/applications/employer-applications-content';

export const metadata = {
  title: 'Nomzodlar',
  description: "Kelgan arizalarni ko'rib chiqish va javob berish.",
};

export default function EmployerApplicationsPage() {
  return <EmployerApplicationsContent />;
}
