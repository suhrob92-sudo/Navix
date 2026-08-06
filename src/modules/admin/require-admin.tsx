'use client';

import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { hasPermission, type PermissionValue } from '@/config/rbac';
import { useAuthGate } from '@/modules/auth/auth-gate';

/**
 * Admin panelni faqat ruxsati borlarga ochadi.
 *
 * MUHIM: bu FAQAT qulaylik uchun. Brauzerdagi tekshiruvni chetlab
 * o'tish oson (JavaScript'ni tahrirlash mumkin), lekin bu hech narsa
 * bermaydi: ma'lumot baribir serverdan so'raladi va u yerda
 * `requirePermission()` ishlaydi. Ya'ni chetlab o'tgan odam bo'sh
 * sahifani ko'radi, xolos.
 *
 * `RequireAuth` dan farqi: bu yerda kirmagan odam login sahifasiga
 * yuboriladi, ruxsati YETMAGAN odam esa tushuntirish ko'radi. Ikkinchi
 * holatda login sahifasiga yuborish noto'g'ri bo'lardi — u allaqachon
 * kirgan, qayta kirish yordam bermaydi.
 */
export function RequireAdmin({
  permission,
  children,
}: {
  permission: PermissionValue;
  children: React.ReactNode;
}) {
  const { screen, user } = useAuthGate();

  // Kirish tekshiruvi tugamagan yoki aloqa yo'q — umumiy ekran.
  if (screen) return <>{screen}</>;

  if (!user || !hasPermission(user.roles, permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Bu bo'lim siz uchun yopiq"
        description="Admin panelga kirish uchun maxsus ruxsat kerak. Agar bu xato deb hisoblasangiz, platforma administratoriga murojaat qiling."
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
