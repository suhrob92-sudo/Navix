import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Home, Search, Sparkles, User } from 'lucide-react';

/**
 * Ilovaning asosiy navigatsiyasi — pastki menyu.
 *
 * Maketdagi kabi 5 ta bo'lim, markazda AI tugmasi ko'tarilgan holda turadi.
 * Beshtadan ortiq bo'lsa barmoq bilan aniq bosish qiyinlashadi, shuning uchun
 * qolgan bo'limlar (manzillar, qurilmalar, xavfsizlik) Profil ichiga joylashgan.
 */

export interface AppNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
  /** Markazdagi ko'tarilgan tugma (AI yordamchi). */
  isCenter?: boolean;
}

export const APP_NAV: readonly AppNavItem[] = [
  { href: '/dashboard', label: 'Bosh sahifa', icon: Home, exact: true },
  { href: '/search', label: 'Qidiruv', icon: Search },
  { href: '/assistant', label: 'AI', icon: Sparkles, isCenter: true },
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
  icon: string;
}

export const PROFILE_MENU: readonly ProfileMenuItem[] = [
  { href: '/orders', label: 'Mening buyurtmalarim', description: 'Barcha modullardagi buyurtmalar', icon: 'orders' },
  { href: '/addresses', label: 'Manzillarim', description: 'Uy, ish va boshqa manzillar', icon: 'addresses' },
  { href: '/notifications', label: 'Bildirishnomalar', description: 'Kelgan xabarlar', icon: 'notifications' },
  { href: '/devices', label: 'Qurilmalarim', description: 'Tizimga kirgan qurilmalar', icon: 'devices' },
  { href: '/security', label: 'Xavfsizlik', description: 'Parol va himoya sozlamalari', icon: 'security' },
  { href: '/profile/settings', label: 'Sozlamalar', description: 'Til, mavzu va shaxsiy maʼlumotlar', icon: 'settings' },
] as const;
