import { JobsContent } from '@/app/(cabinet)/jobs/jobs-content';

export const metadata = {
  title: 'Ish qidirish',
  description: "Vakansiyalar, yo'nalishlar va tezkor ariza.",
};

export default function JobsPage() {
  return <JobsContent />;
}
