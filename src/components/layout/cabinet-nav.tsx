'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { CABINET_NAV } from '@/config/cabinet-nav';
import { cn } from '@/lib/utils';

/**
 * Kabinet navigatsiyasi.
 *
 * Kompyuterda — chap tomonda yon menyu.
 * Telefonda — pastda yopishib turadigan panel (barmoq bilan yetib borish oson).
 */

/** Bo'lim faolmi? */
function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Kompyuter uchun yon menyu. */
export function CabinetSidebar() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:block" aria-label="Kabinet navigatsiyasi">
      <ul className="space-y-1">
        {CABINET_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.exact);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-start gap-3 rounded-xl px-3 py-3 transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="text-muted-foreground block text-xs leading-snug">{item.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Telefon uchun pastki panel. */
export function CabinetTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 lg:hidden"
      aria-label="Kabinet navigatsiyasi"
      // iPhone'dagi pastki "chiziq" ustiga tushib qolmasligi uchun.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {CABINET_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.exact);

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {/* Qisqa nom — bir qatorga sig'ishi uchun. To'liq nomi ekran o'quvchiga qoladi. */}
                <span className="text-[0.625rem] leading-none font-medium">{item.shortLabel}</span>
                <span className="sr-only">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
