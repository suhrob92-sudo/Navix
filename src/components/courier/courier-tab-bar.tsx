'use client';

import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, PackageSearch, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * Kuryer kabinetining pastki navigatsiyasi.
 *
 * Ikkita ish bo'limi bor va ular teng muhim: "Ishlarim" (qo'lidagi
 * topshiriqlar) va "Yangi ishlar" (umumiy ro'yxat). Kuryer kun
 * davomida ular orasida almashib turadi.
 */
interface CourierNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const COURIER_NAV: readonly CourierNavItem[] = [
  { href: '/courier', label: 'Ishlarim', icon: LayoutGrid, exact: true },
  { href: '/courier/available', label: 'Yangi ishlar', icon: PackageSearch },
  { href: '/dashboard', label: 'Ilovaga', icon: Store },
] as const;

export function CourierTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-40 border-t"
      aria-label="Kuryer kabineti navigatsiyasi"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2">
        {COURIER_NAV.map((item) => {
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
