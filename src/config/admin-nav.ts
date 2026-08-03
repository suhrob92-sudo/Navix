import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Receipt, ScrollText, Users, Wrench } from 'lucide-react';

import { Permission, type PermissionValue } from '@/config/rbac';

/**
 * Admin panelning bo'limlari.
 *
 * Har bir bo'lim o'ziga kerakli RUXSATNI e'lon qiladi. Menyu shu
 * ro'yxatdan quriladi, ya'ni qo'llab-quvvatlash xodimi kirganda
 * unga tegishli bo'lmagan bo'limlar umuman ko'rinmaydi.
 *
 * Bu — qulaylik uchun. Haqiqiy himoya serverda: bo'limni menyudan
 * yashirish yetarli emas, chunki manzilni qo'lda yozish mumkin.
 */

export interface AdminNavItem {
  href: string;
  /**
   * Pastki paneldagi yozuv — QISQA bo'lishi shart.
   *
   * Telefon ekranida beshta bo'lim yonma-yon turadi; "Foydalanuvchilar"
   * kabi uzun so'z ikki qatorga bo'linib, panelni buzadi. Sahifaning
   * to'liq nomi yuqori panelda (`AdminHeader`) ko'rsatiladi.
   */
  label: string;
  icon: LucideIcon;
  /** Shu bo'limni ko'rish uchun kerakli ruxsat. */
  permission: PermissionValue;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
}

/**
 * Beshta bo'lim — bu chegara.
 *
 * Oltinchisi qo'shilsa barmoq bilan aniq bosish qiyinlashadi. Shuning
 * uchun "Tranzaksiyalar" panelda emas, bosh sahifadagi karta orqali
 * ochiladi: u kundalik ish emas, faqat tekshiruv uchun kerak bo'ladi.
 */
export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    href: '/admin',
    label: 'Asosiy',
    icon: LayoutGrid,
    permission: Permission.PLATFORM_ADMIN_ACCESS,
    exact: true,
  },
  {
    href: '/admin/providers',
    label: 'Xizmatlar',
    icon: Wrench,
    permission: Permission.PLATFORM_ADMIN_ACCESS,
  },
  {
    href: '/admin/payments',
    label: "To'lovlar",
    icon: Receipt,
    permission: Permission.PLATFORM_TRANSACTION_READ,
  },
  {
    href: '/admin/users',
    label: 'Odamlar',
    icon: Users,
    permission: Permission.PLATFORM_USER_READ,
  },
  {
    href: '/admin/audit',
    label: 'Jurnal',
    icon: ScrollText,
    permission: Permission.PLATFORM_AUDIT_READ,
  },
] as const;

/** Bo'lim joriy manzilga mos keladimi? */
export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
