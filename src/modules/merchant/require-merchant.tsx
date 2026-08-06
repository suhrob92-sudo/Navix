'use client';

import { Store } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Permission, hasPermission } from '@/config/rbac';
import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Restoran kabinetini faqat MERCHANT roliga ochadi.
 *
 * `RequireAdmin` bilan bir xil mantiq: bu FAQAT qulaylik, haqiqiy
 * himoya `/api/v1/merchant/*` endpointlarida. Chetlab o'tgan odam
 * bo'sh ekranni ko'radi, chunki ma'lumot serverdan kelmaydi.
 */
export function RequireMerchant({ children }: { children: React.ReactNode }) {
  const { screen, user } = useAuthGate();

  // Kirish tekshiruvi tugamagan yoki aloqa yo'q — umumiy ekran.
  if (screen) return <>{screen}</>;

  if (!user || !hasPermission(user.roles, Permission.MERCHANT_DASHBOARD_ACCESS)) {
    return (
      <EmptyState
        icon={Store}
        title="Restoran kabineti siz uchun emas"
        description="Bu bo'lim restoran egalari uchun. Agar sizda restoran bo'lsa va uni Navix'ga qo'shmoqchi bo'lsangiz, biz bilan bog'laning."
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
