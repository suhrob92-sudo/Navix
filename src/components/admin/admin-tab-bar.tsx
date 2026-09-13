'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TabBarShell } from '@/components/app/tab-bar-shell';
import { ADMIN_NAV, isAdminNavItemActive } from '@/config/admin-nav';
import { hasPermission } from '@/config/rbac';
import { cn } from '@/lib/utils';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * Admin panelning pastki navigatsiyasi.
 *
 * Ilovaning asosiy menyusidan farqi: bo'limlar RUXSATGA qarab
 * filtrlanadi. Qo'llab-quvvatlash xodimi kirganda "Xizmatlar"
 * bo'limi menyuda umuman ko'rinmaydi — bosib, keyin "ruxsat yo'q"
 * degan xabar olishdan ko'ra, umuman ko'rsatmagan yaxshi.
 */
export function AdminTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const roles = user?.roles ?? [];
  const items = ADMIN_NAV.filter((item) => hasPermission(roles, item.permission));

  if (items.length === 0) return null;

  return (
    <TabBarShell label="Admin navigatsiyasi">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isAdminNavItemActive(pathname, item);

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
              <span className="text-center text-[0.625rem] leading-none font-medium">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </TabBarShell>
  );
}
