import type { LucideIcon } from 'lucide-react';
import { ArrowLeftRight, LayoutGrid, Users, Wrench } from 'lucide-react';

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
  label: string;
  icon: LucideIcon;
  /** Shu bo'limni ko'rish uchun kerakli ruxsat. */
  permission: PermissionValue;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  {
    href: '/admin',
    label: "Ko'rsatkichlar",
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
    href: '/admin/users',
    label: 'Foydalanuvchilar',
    icon: Users,
    permission: Permission.PLATFORM_USER_READ,
  },
  {
    href: '/admin/transactions',
    label: 'Tranzaksiyalar',
    icon: ArrowLeftRight,
    permission: Permission.PLATFORM_TRANSACTION_READ,
  },
] as const;

/** Bo'lim joriy manzilga mos keladimi? */
export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
