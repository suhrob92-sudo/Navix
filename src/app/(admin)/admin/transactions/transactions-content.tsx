'use client';

import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import {
  TRANSACTION_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type AdminTransactionsResponse,
} from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';

const TYPE_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'TOP_UP', label: "To'ldirish" },
  { value: 'PAYMENT', label: "To'lov" },
  { value: 'TRANSFER', label: "O'tkazma" },
  { value: 'REFUND', label: 'Qaytarish' },
] as const;

const PAGE_SIZE = 20;

/**
 * Barcha foydalanuvchilarning hamyon amallari.
 *
 * Nima uchun kerak: "pulim yechilgan, lekin to'lov o'tmagan" degan
 * murojaat kelganda xodim bazaga kirmasdan tekshirishi kerak. Har bir
 * yozuvda amaldan keyingi balans ham ko'rsatilgan — shunda hisobning
 * qayerda "sirg'alib" ketgani darhol ko'rinadi.
 *
 * Bu bo'lim FAQAT O'QISH uchun: tahrirlash yoki o'chirish tugmasi yo'q.
 */
export function AdminTransactionsContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_TRANSACTION_READ}>
      <TransactionsBody />
    </RequireAdmin>
  );
}

function TransactionsBody() {
  const [type, setType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ type, page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error } = useApiQuery<AdminTransactionsResponse>(
    `/api/v1/admin/transactions?${query.toString()}`,
  );

  const transactions = data?.transactions ?? [];
  const hasMore = transactions.length === PAGE_SIZE;

  return (
    <>
      <AdminHeader title="Tranzaksiyalar" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Telefon raqami yoki izoh"
          aria-label="Tranzaksiya qidirish"
        />

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {TYPE_TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={type === tab.value}
              onClick={() => {
                setType(tab.value);
                setPage(1);
              }}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Tranzaksiyalarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && transactions.length === 0 && (
          <EmptyState
            icon={ArrowLeftRight}
            title="Tranzaksiya topilmadi"
            description="Filtrni yoki qidiruv so'zini o'zgartirib ko'ring."
          />
        )}

        <ul className="space-y-2">
          {transactions.map((transaction, index) => {
            const isIncoming = transaction.direction === 'IN';

            return (
              <li
                key={transaction.id}
                className="bg-card border-border animate-fade-up rounded-2xl border p-3"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                      isIncoming ? 'bg-success/12 text-success' : 'bg-secondary text-muted-foreground',
                    )}
                    aria-hidden="true"
                  >
                    {isIncoming ? <ArrowDownLeft className="size-4.5" /> : <ArrowUpRight className="size-4.5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {transaction.description ?? TRANSACTION_TYPE_LABELS[transaction.type]}
                    </p>

                    <Link
                      href={`/admin/users/${transaction.user.id}`}
                      className="text-muted-foreground hover:text-foreground truncate text-xs transition-colors"
                    >
                      {transaction.user.fullName ?? formatUzPhone(transaction.user.phone)}
                    </Link>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        'text-sm font-semibold tabular-nums',
                        isIncoming ? 'text-success' : 'text-foreground',
                      )}
                    >
                      {isIncoming ? '+' : '−'}
                      {formatTiyin(transaction.amount)}
                    </p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {formatTiyin(transaction.balanceAfter)}
                    </p>
                  </div>
                </div>

                <div className="border-border/60 mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
                  <Badge variant="outline">{TRANSACTION_TYPE_LABELS[transaction.type]}</Badge>

                  <Badge variant={transaction.status === 'COMPLETED' ? 'success' : 'warning'}>
                    {TRANSACTION_STATUS_LABELS[transaction.status]}
                  </Badge>

                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatUzDateTime(transaction.createdAt)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

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
