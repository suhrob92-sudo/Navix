import type { LucideIcon } from 'lucide-react';
import { Bell, LayoutGrid, MapPin, ShieldCheck, Smartphone, User } from 'lucide-react';

/**
 * Shaxsiy kabinet navigatsiyasi — yagona manba.
 * Yon menyu, telefon menyusi va sahifa sarlavhalari shu ro'yxatdan oziqlanadi.
 */

export interface CabinetNavItem {
  href: string;
  label: string;
  /** Telefondagi pastki panel uchun qisqa nom — bir qatorga sig'ishi kerak. */
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
}

export const CABINET_NAV: readonly CabinetNavItem[] = [
  {
    href: '/dashboard',
    label: 'Bosh sahifa',
    shortLabel: 'Bosh',
    description: "Xizmatlar va qisqacha ma'lumot",
    icon: LayoutGrid,
    exact: true,
  },
  {
    href: '/profile',
    label: 'Profilim',
    shortLabel: 'Profil',
    description: "Shaxsiy ma'lumotlar va sozlamalar",
    icon: User,
  },
  {
    href: '/addresses',
    label: 'Manzillarim',
    shortLabel: 'Manzil',
    description: 'Uy, ish va boshqa manzillar',
    icon: MapPin,
  },
  {
    href: '/notifications',
    label: 'Bildirishnomalar',
    shortLabel: 'Xabar',
    description: 'Barcha modullardan kelgan xabarlar',
    icon: Bell,
  },
  {
    href: '/devices',
    label: 'Qurilmalarim',
    shortLabel: 'Qurilma',
    description: 'Tizimga kirgan qurilmalar',
    icon: Smartphone,
  },
  {
    href: '/security',
    label: 'Xavfsizlik',
    shortLabel: 'Himoya',
    description: 'Parol va himoya sozlamalari',
    icon: ShieldCheck,
  },
] as const;

/** Joriy manzil bo'yicha faol bo'limni topadi. */
export function findActiveNavItem(pathname: string): CabinetNavItem | undefined {
  return CABINET_NAV.find((item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
