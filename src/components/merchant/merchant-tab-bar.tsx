'use client';

import type { LucideIcon } from 'lucide-react';
import { ClipboardList, LayoutGrid, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * Restoran kabinetining pastki navigatsiyasi.
 *
 * Uchtagina bo'lim: xodim kun davomida asosan "Buyurtmalar" da turadi,
 * qolganlariga kamdan-kam kiradi. Shuning uchun ortiqcha bo'lim
 * qo'shilmagan — menyu aynan restoran sahifasidan ochiladi.
 */
interface MerchantNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
}

const MERCHANT_NAV: readonly MerchantNavItem[] = [
  { href: '/merchant', label: 'Asosiy', icon: LayoutGrid, exact: true },
  { href: '/merchant/orders', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/dashboard', label: 'Ilovaga', icon: Store },
] as const;

export function MerchantTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-40 border-t"
      aria-label="Restoran kabineti navigatsiyasi"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2">
        {MERCHANT_NAV.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5.5" aria-hidden="true" />
                <span className="text-[0.625rem] leading-none font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
