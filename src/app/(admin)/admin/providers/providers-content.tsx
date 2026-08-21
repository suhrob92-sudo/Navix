'use client';

import { ChevronRight, Plus, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { FilterChip } from '@/components/ui/filter-chip';
import { ProviderIcon } from '@/components/payments/provider-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission, hasPermission } from '@/config/rbac';
import { SERVICE_CATEGORIES } from '@/config/service-providers';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { AdminProvidersResponse } from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';
import { useAuth } from '@/modules/auth/auth-context';

const CATEGORY_TABS = [{ value: 'ALL', label: 'Hammasi' }, ...SERVICE_CATEGORIES] as const;

const STATUS_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'INACTIVE', label: "O'chirilgan" },
] as const;

/**
 * Xizmatlar ro'yxati.
 *
 * Foydalanuvchi ko'radigan ro'yxatdan farqi: bu yerda O'CHIRILGAN
 * xizmatlar ham ko'rinadi va har birida to'lovlar soni yozilgan —
 * xizmatni o'chirishdan oldin u qanchalik ishlatilayotganini bilish kerak.
 */
export function AdminProvidersContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_ADMIN_ACCESS}>
      <ProvidersBody />
    </RequireAdmin>
  );
}

function ProvidersBody() {
  const { user } = useAuth();
  const canManage = hasPermission(user?.roles ?? [], Permission.PLATFORM_PROVIDER_MANAGE);

  const [category, setCategory] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const query = new URLSearchParams({ category, status });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error } = useApiQuery<AdminProvidersResponse>(
    `/api/v1/admin/providers?${query.toString()}`,
  );

  const providers = data?.providers ?? [];

  return (
    <>
      <AdminHeader
        title="Xizmatlar"
        showBack
        backHref="/admin"
        action={
          canManage ? (
            <Button asChild size="sm" className="mr-1">
              <Link href="/admin/providers/new">
                <Plus className="size-4" aria-hidden="true" />
                Qo&apos;shish
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nomi yoki kodi bo'yicha qidirish"
          aria-label="Xizmat qidirish"
        />

        <div className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {CATEGORY_TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={category === tab.value}
              onClick={() => setCategory(tab.value)}
            />
          ))}
        </div>

        <div className="-mx-4 mt-2 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={status === tab.value}
              onClick={() => setStatus(tab.value)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-18 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Xizmatlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && providers.length === 0 && (
          <EmptyState
            icon={Wrench}
            title="Xizmat topilmadi"
            description="Filtrni o'zgartiring yoki yangi xizmat qo'shing."
          />
        )}

        <ul className="space-y-2">
          {providers.map((provider, index) => (
            <li key={provider.id}>
              <Link
                href={`/admin/providers/${provider.id}`}
                className={cn(
                  'bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]',
                  !provider.isActive && 'opacity-60',
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <ProviderIcon provider={provider} size="sm" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{provider.name}</p>
                    {!provider.isActive && (
                      <Badge variant="secondary" className="shrink-0">
                        O&apos;chirilgan
                      </Badge>
                    )}
                  </div>

                  <p className="text-muted-foreground truncate text-xs">
                    {`${provider.code} · ${provider.paymentCount} ta to'lov`}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {formatTiyin(provider.minAmountSom * 100)} — {formatTiyin(provider.maxAmountSom * 100)}
                  </p>
                </div>

                <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
