'use client';

import { ChevronRight, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import { USER_STATUS_LABELS, USER_STATUS_VARIANTS, type AdminUsersResponse } from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';

const STATUS_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'PENDING_VERIFICATION', label: 'Tasdiqlanmagan' },
  { value: 'SUSPENDED', label: 'Bloklangan' },
  { value: 'DEACTIVATED', label: 'Yopilgan' },
] as const;

const PAGE_SIZE = 20;

/**
 * Foydalanuvchilar ro'yxati.
 *
 * Qidiruv telefon raqami bo'yicha ishlaydi — murojaat kelganda
 * xodim aynan shu raqamni biladi. Ism bo'yicha ham topiladi, lekin
 * O'zbekistonda bir xil ismlar ko'p, shuning uchun raqam asosiy.
 */
export function AdminUsersContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_USER_READ}>
      <UsersBody />
    </RequireAdmin>
  );
}

function UsersBody() {
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error } = useApiQuery<AdminUsersResponse>(`/api/v1/admin/users?${query.toString()}`);

  const users = data?.users ?? [];
  const hasMore = users.length === PAGE_SIZE;

  /** Filtr o'zgarganda birinchi sahifaga qaytamiz. */
  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <>
      <AdminHeader title="Foydalanuvchilar" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Telefon, ism yoki email"
          aria-label="Foydalanuvchi qidirish"
        />

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => changeStatus(tab.value)}
              aria-pressed={status === tab.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                status === tab.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-18 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Foydalanuvchilarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && users.length === 0 && (
          <EmptyState
            icon={Users}
            title="Foydalanuvchi topilmadi"
            description="Qidiruv so'zini yoki filtrni o'zgartirib ko'ring."
          />
        )}

        <ul className="space-y-2">
          {users.map((user, index) => {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;

            return (
              <li key={user.id}>
                <Link
                  href={`/admin/users/${user.id}`}
                  className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3 transition-transform active:scale-[0.99]"
                  style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
                >
                  <Avatar src={null} name={fullName ?? user.phone} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{fullName ?? 'Ism kiritilmagan'}</p>
                      <Badge variant={USER_STATUS_VARIANTS[user.status]} className="shrink-0">
                        {USER_STATUS_LABELS[user.status]}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground truncate text-xs">{formatUzPhone(user.phone)}</p>

                    {user.walletBalance !== null && (
                      <p className="text-muted-foreground truncate text-xs tabular-nums">
                        {formatTiyin(user.walletBalance)}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sahifalash — telefonda ikkita katta tugma qulayroq */}
        {!isLoading && !error && (page > 1 || hasMore) && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              Oldingi
            </Button>

            <span className="text-muted-foreground text-sm tabular-nums">{page}-sahifa</span>

            <Button variant="outline" disabled={!hasMore} onClick={() => setPage((current) => current + 1)}>
              Keyingi
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
