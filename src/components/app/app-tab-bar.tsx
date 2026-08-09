'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { APP_NAV, isNavItemActive } from '@/config/app-nav';
import { cn } from '@/lib/utils';

/**
 * Pastki navigatsiya paneli.
 *
 * Maketdagi kabi markazdagi AI tugmasi ko'tarilgan va rangli — u ilovaning
 * asosiy xususiyati bo'lgani uchun ataylab ajratib ko'rsatilgan.
 *
 * Panel ekranning pastida yopishib turadi: telefonda bosh barmoq aynan
 * shu yerga bemalol yetadi.
 */
export function AppTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-chrome fixed inset-x-0 bottom-0 z-40 border-t"
      aria-label="Asosiy navigatsiya"
      // iPhone'dagi pastki chiziq ustiga tushib qolmasligi uchun.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2">
        {APP_NAV.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(pathname, item);

          if (item.isCenter) {
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className="flex flex-col items-center"
                >
                  <span
                    className={cn(
                      // `brand-*` — mavzu bilan o'zgarmaydigan ranglar:
                      // tugma telefondagi ilova ikonkasining aynan o'zi
                      // bo'lib ko'rinishi kerak (izoh: globals.css).
                      'from-brand-from to-brand-to shadow-brand-from/35 -mt-5 inline-flex size-13 items-center justify-center rounded-full bg-gradient-to-br shadow-lg transition-transform',
                      active ? 'scale-105' : 'active:scale-95',
                    )}
                  >
                    {/*
                      Brend belgisi lucide ikonkalariga qaraganda 24×24
                      to'rning kamrog'ini egallaydi (atrofida bo'sh joy
                      bor), shuning uchun bir pog'ona kattaroq beriladi —
                      shundagina ko'zga bir xil o'lchamda ko'rinadi.
                    */}
                    <Icon className="text-brand-foreground size-7" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'pt-1 pb-2 text-[0.625rem] leading-none font-medium',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          }

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
