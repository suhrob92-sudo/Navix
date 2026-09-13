'use client';

import type { LucideIcon } from 'lucide-react';
import { ClipboardList, LayoutGrid, RotateCcw, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TabBarShell } from '@/components/app/tab-bar-shell';
import { cn } from '@/lib/utils';

/**
 * Sotuvchi kabinetining pastki navigatsiyasi.
 *
 * Restoran kabinetidagi kabi uchtagina bo'lim: sotuvchi kun davomida
 * asosan "Buyurtmalar" da turadi. Mahsulotlar aynan do'kon
 * kartochkasidan ochiladi — do'kon tanlanmasdan mahsulot ro'yxatining
 * ma'nosi yo'q.
 */
interface SellerNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** `true` bo'lsa faqat aynan shu manzilda faol hisoblanadi. */
  exact?: boolean;
}

const SELLER_NAV: readonly SellerNavItem[] = [
  { href: '/seller', label: 'Asosiy', icon: LayoutGrid, exact: true },
  { href: '/seller/orders', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/seller/returns', label: 'Qaytarish', icon: RotateCcw },
  { href: '/dashboard', label: 'Ilovaga', icon: Store },
] as const;

export function SellerTabBar() {
  const pathname = usePathname();

  return (
    <TabBarShell label="Sotuvchi kabineti navigatsiyasi">
      {SELLER_NAV.map((item) => {
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
