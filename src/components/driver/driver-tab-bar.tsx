'use client';

import type { LucideIcon } from 'lucide-react';
import { Car, ListChecks, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TabBarShell } from '@/components/app/tab-bar-shell';
import { cn } from '@/lib/utils';

/**
 * Haydovchi kabinetining pastki navigatsiyasi.
 *
 * Kuryernikidan farqi ATIGI nomlarda: ish shakli bir xil — qo'lidagi
 * ish va umumiy ro'yxat orasida almashib turish.
 *
 * ── Nima uchun umumiy komponent yasalmadi ─────────────────────────────
 * Ikkita menyu bir-biriga o'xshaydi, lekin ular BOSHQA ishga tegishli
 * va kelajakda boshqacha o'zgaradi: haydovchiga "smena" tugmasi
 * kerak bo'lishi mumkin, kuryerga esa "sumkam to'ldi".
 *
 * Umumiy komponent yasab, uni sozlamalar bilan boshqarish o'sha
 * farqlar paydo bo'lganda shartlar to'plamiga aylanardi. Ikki
 * qisqa fayl bittasidan tushunarliroq.
 */
interface DriverNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const DRIVER_NAV: readonly DriverNavItem[] = [
  { href: '/driver', label: 'Safarim', icon: Car, exact: true },
  { href: '/driver/offers', label: 'Buyurtmalar', icon: ListChecks },
  { href: '/dashboard', label: 'Ilovaga', icon: Store },
] as const;

export function DriverTabBar() {
  const pathname = usePathname();

  return (
    <TabBarShell label="Haydovchi kabineti navigatsiyasi">
      {DRIVER_NAV.map((item) => {
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
    </TabBarShell>
  );
}
