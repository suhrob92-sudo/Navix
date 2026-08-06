'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Permission, hasPermission } from '@/config/rbac';
import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Sotuvchi kabinetini faqat ruxsati borlarga ochadi.
 *
 * `RequireMerchant` bilan bir xil mantiq: bu FAQAT qulaylik, haqiqiy
 * himoya `/api/v1/seller/*` endpointlarida va `shop.ownerId`
 * tekshiruvida. Chetlab o'tgan odam bo'sh ekranni ko'radi, chunki
 * ma'lumot serverdan kelmaydi.
 */
export function RequireSeller({ children }: { children: React.ReactNode }) {
  const { screen, user } = useAuthGate();

  // Kirish tekshiruvi tugamagan yoki aloqa yo'q — umumiy ekran.
  if (screen) return <>{screen}</>;

  if (!user || !hasPermission(user.roles, Permission.SELLER_DASHBOARD_ACCESS)) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Sotuvchi kabineti siz uchun emas"
        description="Bu bo'lim Marketplace do'kon egalari uchun. Agar sizda do'kon bo'lsa va uni Navix'ga qo'shmoqchi bo'lsangiz, biz bilan bog'laning."
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
