import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Bug,
  FileText,
  Flag,
  LayoutGrid,
  ListOrdered,
  Power,
  Receipt,
  ScrollText,
  Store,
  Users,
  Wrench,
} from 'lucide-react';

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

export interface AdminSection {
  href: string;
  label: string;
  /** Bir jumlalik izoh — kartochkada ko'rinadi. */
  description: string;
  icon: LucideIcon;
  permission: PermissionValue;
}

/**
 * Pastki panelga SIG'MAGAN bo'limlar — bosh sahifadagi kartochkalar.
 *
 * ── Nima uchun ro'yxat, JSX emas ──────────────────────────────────────
 * Avval har bir kartochka bosh sahifada qo'lda yozilgan edi: o'n besh
 * qatorlik JSX, ichida ruxsat tekshiruvi. Sakkizta bo'lim yig'ilganda
 * fayl o'qib bo'lmas holga keldi va yangi bo'lim qo'shish har safar
 * nusxa ko'chirishga aylandi — nusxada esa ruxsatni almashtirish
 * esdan chiqishi mumkin edi.
 *
 * Endi bo'lim shu ro'yxatga bitta yozuv sifatida qo'shiladi, ruxsat
 * esa uning YONIDA turadi — ular ajralib qololmaydi.
 *
 * Tartib — ishlatilish chastotasi bo'yicha: kundalik ishlar tepada,
 * kamdan-kam kerak bo'ladigani pastda.
 */
export const ADMIN_SECTIONS: readonly AdminSection[] = [
  {
    href: '/admin/transactions',
    label: 'Hamyon tranzaksiyalari',
    description: 'Barcha pul harakatlari — faqat tekshirish uchun',
    icon: ArrowLeftRight,
    permission: Permission.PLATFORM_TRANSACTION_READ,
  },
  {
    href: '/admin/reports',
    label: 'Shikoyatlar',
    description: 'Foydalanuvchilar yuborgan shikoyatlar',
    icon: Flag,
    permission: Permission.PLATFORM_REPORT_MANAGE,
  },
  {
    href: '/admin/content',
    label: 'Kontent',
    description: 'Mahsulot, taom, post va vakansiyani yashirish',
    icon: FileText,
    permission: Permission.PLATFORM_CONTENT_MANAGE,
  },
  {
    href: '/admin/businesses',
    label: 'Bizneslar',
    description: "Do'kon, restoran va mehmonxonani vaqtincha yopish",
    icon: Store,
    permission: Permission.PLATFORM_BUSINESS_MANAGE,
  },
  {
    href: '/admin/errors',
    label: 'Xatolar',
    description: 'Ilovada nima buzilayotgani',
    icon: Bug,
    permission: Permission.PLATFORM_AUDIT_READ,
  },
  {
    href: '/admin/waitlist',
    label: 'Navbat',
    description: "Ishga tushishdan oldin yozilganlar ro'yxati",
    icon: ListOrdered,
    permission: Permission.PLATFORM_WAITLIST_READ,
  },
  {
    href: '/admin/modules',
    label: "Bo'limlar",
    description: "Nosozlik chiqqanda bo'limni darhol yopish",
    icon: Power,
    permission: Permission.PLATFORM_MODULE_MANAGE,
  },
] as const;
