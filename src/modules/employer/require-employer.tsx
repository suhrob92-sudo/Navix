'use client';

import { Briefcase } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Permission, hasPermission } from '@/config/rbac';
import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Ish beruvchi kabinetini faqat ruxsati borlarga ochadi.
 *
 * `RequireSeller` bilan bir xil mantiq: bu FAQAT qulaylik, haqiqiy
 * himoya `/api/v1/employer/*` endpointlarida va `company.ownerId`
 * tekshiruvida. Chetlab o'tgan odam bo'sh ekranni ko'radi, chunki
 * ma'lumot serverdan kelmaydi.
 */
export function RequireEmployer({ children }: { children: React.ReactNode }) {
  const { screen, user } = useAuthGate();

  // Kirish tekshiruvi tugamagan yoki aloqa yo'q — umumiy ekran.
  if (screen) return <>{screen}</>;

  if (!user || !hasPermission(user.roles, Permission.EMPLOYER_DASHBOARD_ACCESS)) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Ish beruvchi kabineti siz uchun emas"
        description="Bu bo'lim vakansiya joylaydigan kompaniyalar uchun. Agar kompaniyangiz bo'lsa va odam yollamoqchi bo'lsangiz, biz bilan bog'laning."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Bosh sahifaga qaytish</Link>
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
