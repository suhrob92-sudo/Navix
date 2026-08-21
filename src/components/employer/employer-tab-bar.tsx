'use client';

import type { LucideIcon } from 'lucide-react';
import { Briefcase, LayoutGrid, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/**
 * Ish beruvchi kabinetining pastki navigatsiyasi.
 *
 * Uchtagina bo'lim, sotuvchi kabinetidagi kabi. Ish beruvchi kun
 * davomida asosan "Nomzodlar" da turadi — shuning uchun u o'rtada,
 * eng qulay joyda.
 */
interface EmployerNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
}

const EMPLOYER_NAV: readonly EmployerNavItem[] = [
  { href: '/employer', label: 'Asosiy', icon: LayoutGrid, exact: true },
  { href: '/employer/applications', label: 'Nomzodlar', icon: Users },
  { href: '/employer/vacancies', label: "E'lonlar", icon: Briefcase },
] as const;

export function EmployerTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass-chrome pb-safe fixed inset-x-0 bottom-0 z-40 border-t"
      aria-label="Ish beruvchi kabineti navigatsiyasi"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2">
        {EMPLOYER_NAV.map((item) => {
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
