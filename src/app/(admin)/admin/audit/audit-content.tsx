'use client';

import { ScrollText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
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
import { AUDIT_FILTER_GROUPS, auditActionLabel, auditActionTone } from '@/modules/admin/audit-actions';
import type { AdminAuditItem, AdminAuditResponse } from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';

const PAGE_SIZE = 25;

/** Amal turiga qarab chap chetdagi rangli chiziq. */
const TONE_BARS = {
  money: 'bg-success',
  admin: 'bg-primary',
  danger: 'bg-destructive',
  neutral: 'bg-border',
} as const;

/**
 * Audit jurnali — nizolarni hal qilishning yagona ishonchli manbai.
 *
 * "Men bu to'lovni qilmaganman", "tarifni kim o'zgartirdi?", "nima uchun
 * hisobim bloklangan?" — bu savollarga javob faqat shu yerda.
 *
 * Yozuvlar o'zgarmas: tahrirlash yoki o'chirish tugmasi yo'q va
 * bo'lmaydi ham. Jurnalni o'zgartirish mumkin bo'lsa, uning butun
 * ma'nosi yo'qoladi.
 */
export function AdminAuditContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_AUDIT_READ}>
      <AuditBody />
    </RequireAdmin>
  );
}

function AuditBody() {
  const [group, setGroup] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const query = new URLSearchParams({ group, page: String(page), pageSize: String(PAGE_SIZE) });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error } = useApiQuery<AdminAuditResponse>(`/api/v1/admin/audit?${query.toString()}`);

  const entries = data?.entries ?? [];
  const hasMore = entries.length === PAGE_SIZE;

  return (
    <>
      <AdminHeader title="Audit jurnali" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Telefon raqami yoki obyekt ID"
          aria-label="Jurnalda qidirish"
        />

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {AUDIT_FILTER_GROUPS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setGroup(tab.value);
                setPage(1);
              }}
              aria-pressed={group === tab.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                group === tab.value
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
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Jurnalni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <EmptyState
            icon={ScrollText}
            title="Yozuv topilmadi"
            description="Filtrni yoki qidiruv so'zini o'zgartirib ko'ring."
          />
        )}

        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="bg-card border-border animate-fade-up flex gap-3 overflow-hidden rounded-2xl border p-3"
              style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
            >
              <span
                className={cn('-my-3 -ml-3 w-1 shrink-0', TONE_BARS[auditActionTone(entry.action)])}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{auditActionLabel(entry.action)}</p>

                <p className="text-muted-foreground truncate text-xs">
                  {entry.actor ? (
                    <Link href={`/admin/users/${entry.actor.id}`} className="hover:text-foreground">
                      {entry.actor.fullName ?? formatUzPhone(entry.actor.phone)}
                    </Link>
                  ) : (
                    'Tizim'
                  )}
                </p>

                <MetadataLine entry={entry} />

                <p className="text-muted-foreground mt-1 text-xs">
                  {`${formatUzDateTime(entry.createdAt)}${entry.ipAddress ? ` · ${entry.ipAddress}` : ''}`}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {!isLoading && !error && (page > 1 || hasMore) && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
              Oldingi
            </Button>

            <span className="text-muted-foreground text-sm tabular-nums">{`${page}-sahifa`}</span>

            <Button variant="outline" disabled={!hasMore} onClick={() => setPage((current) => current + 1)}>
              Keyingi
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Yozuvning eng muhim tafsiloti — bir qatorda.
 *
 * Butun `metadata` ni ko'rsatish ma'nosiz: u har amalda boshqacha va
 * ko'pincha uzun. Shuning uchun faqat odam qidiradigan qiymatlar
 * (summa, sabab, rol) chiqariladi.
 */
function MetadataLine({ entry }: { entry: AdminAuditItem }) {
  const meta = entry.metadata;
  if (!meta) return null;

  const parts: string[] = [];

  if (typeof meta.amountTiyin === 'string') {
    const amount = Number(meta.amountTiyin);
    if (Number.isSafeInteger(amount)) parts.push(formatTiyin(amount));
  }

  if (typeof meta.role === 'string') parts.push(meta.role);
  if (typeof meta.code === 'string') parts.push(meta.code);
  if (typeof meta.to === 'string') parts.push(`→ ${meta.to}`);
  if (typeof meta.receiptNumber === 'string') parts.push(meta.receiptNumber);
  if (typeof meta.reason === 'string' && meta.reason) parts.push(meta.reason);

  if (parts.length === 0) return null;

  return <p className="text-foreground/80 mt-0.5 truncate text-xs">{parts.join(' · ')}</p>;
}
