import { EmployerTabBar } from '@/components/employer/employer-tab-bar';
import { RequireEmployer } from '@/modules/employer/require-employer';

/**
 * Ish beruvchi kabineti qolipi.
 *
 * Alohida guruh: kompaniya xodimiga mijoz menyusi (Bosh sahifa, AI,
 * Profil) kerak emas — u faqat e'lonlar va nomzodlar bilan ishlaydi.
 */
export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireEmployer>
      <div className="mx-auto w-full max-w-lg flex-1 pb-24">{children}</div>

      <EmployerTabBar />
    </RequireEmployer>
  );
}
