import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  ClipboardList,
  Home,
  MapPin,
  Search,
  Settings,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  User,
  Receipt,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';

import { NavixMark } from '@/components/brand/navix-mark';

/**
 * Ilovaning asosiy navigatsiyasi — pastki menyu.
 *
 * Maketdagi kabi 5 ta bo'lim, markazda AI tugmasi ko'tarilgan holda turadi.
 * Beshtadan ortiq bo'lsa barmoq bilan aniq bosish qiyinlashadi, shuning uchun
 * qolgan bo'limlar (manzillar, qurilmalar, xavfsizlik) Profil ichiga joylashgan.
 */

/**
 * Ikonka turi ataylab `LucideIcon` dan kengroq.
 *
 * Markazdagi tugmada lucide ikonkasi emas, brend belgisi (`NavixMark`)
 * turadi. Tur tor bo'lganda panelda "agar markaz bo'lsa boshqacha chiz"
 * degan shart yozishga to'g'ri kelardi va ro'yxat yagona manba bo'lmay
 * qolardi. Lucide ikonkalari ham shu turga to'g'ri keladi.
 */
export type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

export interface AppNavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
  /** Markazdagi ko'tarilgan tugma (AI yordamchi). */
  isCenter?: boolean;
}

export const APP_NAV: readonly AppNavItem[] = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: Home, exact: true },
  { href: '/search', label: 'Qidiruv', icon: Search },
  { href: '/assistant', label: 'AI', icon: NavixMark, isCenter: true },
  { href: '/orders', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/profile', label: 'Profil', icon: User },
] as const;

/** Bo'lim joriy manzilga mos keladimi? */
export function isNavItemActive(pathname: string, item: AppNavItem): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Profil sahifasidagi menyu — pastki panelga sig'magan bo'limlar.
 * Maketdagi 11-ekranga mos.
 */
export interface ProfileMenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Hamyon bu ro'yxatda YO'Q — u profil sahifasida alohida, balansi
 * ko'rinadigan karta sifatida chiqadi. Ikki joyda takrorlanmasligi uchun.
 */
export const PROFILE_MENU: readonly ProfileMenuItem[] = [
  {
    href: '/wallet/history',
    label: 'Amallar tarixi',
    description: "Barcha to'lovlar va o'tkazmalar",
    icon: Receipt,
  },
  {
    href: '/orders',
    label: 'Mening buyurtmalarim',
    description: 'Barcha modullardagi buyurtmalar',
    icon: ClipboardList,
  },
  { href: '/addresses', label: 'Manzillarim', description: 'Uy, ish va boshqa manzillar', icon: MapPin },
  { href: '/notifications', label: 'Bildirishnomalar', description: 'Kelgan xabarlar', icon: Bell },
  { href: '/devices', label: 'Qurilmalarim', description: 'Tizimga kirgan qurilmalar', icon: Smartphone },
  { href: '/security', label: 'Xavfsizlik', description: 'Parol va himoya', icon: ShieldCheck },
  {
    href: '/profile/blocked',
    label: 'Bloklanganlar',
    description: 'Siz bloklagan foydalanuvchilar',
    icon: ShieldOff,
  },
  {
    href: '/profile/settings',
    label: 'Sozlamalar',
    description: "Til, mavzu va shaxsiy ma'lumotlar",
    icon: Settings,
  },
] as const;
