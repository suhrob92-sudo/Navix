'use client';

import { Bike } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Permission, hasPermission } from '@/config/rbac';
import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Kuryer kabinetini faqat ruxsati borlarga ochadi.
 *
 * `RequireMerchant` va `RequireSeller` bilan bir xil mantiq: bu FAQAT
 * qulaylik, haqiqiy himoya `/api/v1/courier/*` endpointlarida. Chetlab
 * o'tgan odam bo'sh ekranni ko'radi, chunki ma'lumot serverdan kelmaydi.
 */
export function RequireCourier({ children }: { children: React.ReactNode }) {
  const { screen, user } = useAuthGate();

  // Kirish tekshiruvi tugamagan yoki aloqa yo'q — umumiy ekran.
  if (screen) return <>{screen}</>;

  if (!user || !hasPermission(user.roles, Permission.COURIER_DASHBOARD_ACCESS)) {
    return (
      <EmptyState
        icon={Bike}
        title="Kuryer kabineti siz uchun emas"
        description="Bu bo'lim kuryerlar uchun. Agar kuryer bo'lib ishlamoqchi bo'lsangiz, biz bilan bog'laning."
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
