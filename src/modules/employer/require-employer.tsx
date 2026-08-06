'use client';

import { Briefcase } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission, hasPermission } from '@/config/rbac';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * Ish beruvchi kabinetini faqat ruxsati borlarga ochadi.
 *
 * `RequireSeller` bilan bir xil mantiq: bu FAQAT qulaylik, haqiqiy
 * himoya `/api/v1/employer/*` endpointlarida va `company.ownerId`
 * tekshiruvida. Chetlab o'tgan odam bo'sh ekranni ko'radi, chunki
 * ma'lumot serverdan kelmaydi.
 */
export function RequireEmployer({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || isAuthenticated) return;

    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="space-y-3 px-4 pt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

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
