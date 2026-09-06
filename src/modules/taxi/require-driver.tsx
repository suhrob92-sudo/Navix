'use client';

import { Car } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Permission, hasPermission } from '@/config/rbac';
import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Haydovchi kabinetini faqat ruxsati borlarga ochadi.
 *
 * `RequireCourier` bilan bir xil mantiq: bu FAQAT qulaylik, haqiqiy
 * himoya `/api/v1/taxi/driver/*` endpointlarida. Chetlab o'tgan odam
 * bo'sh ekranni ko'radi, chunki ma'lumot serverdan kelmaydi.
 *
 * ── Nima uchun `TAXI_RIDE_ACCEPT` ─────────────────────────────────────
 * Bu — kabinetning butun ma'nosi: buyurtmani o'ziga olish. Boshqa
 * ruxsat (masalan profil o'qish) hamma foydalanuvchida bor va u
 * chegara bo'la olmasdi.
 */
export function RequireDriver({ children }: { children: React.ReactNode }) {
  const { screen, user } = useAuthGate();

  // Kirish tekshiruvi tugamagan yoki aloqa yo'q — umumiy ekran.
  if (screen) return <>{screen}</>;

  if (!user || !hasPermission(user.roles, Permission.TAXI_RIDE_ACCEPT)) {
    return (
      <EmptyState
        icon={Car}
        title="Haydovchi kabineti siz uchun emas"
        description="Bu bo'lim taksi haydovchilari uchun. Haydovchi bo'lib ishlamoqchi bo'lsangiz, hujjatlaringiz bilan biz bilan bog'laning."
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
