'use client';

import { ListOrdered } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDate } from '@/lib/date';
import { formatUzPhone } from '@/lib/phone';
import { RequireAdmin } from '@/modules/admin/require-admin';
import type { AdminWaitlistItem } from '@/modules/admin/waitlist.service';

interface WaitlistResponse {
  entries: AdminWaitlistItem[];
  bySource: { source: string; count: number }[];
}

/**
 * Navbat ro'yxati — ishga tushishdan oldin yozilganlar.
 *
 * Shu paytgacha bu ro'yxatni faqat bazaga kirib ko'rish mumkin edi,
 * ya'ni telefondan ishlayotgan odam uni umuman ko'ra olmasdi.
 *
 * Tahrirlash tugmasi ATAYLAB yo'q: navbatdagi o'rin — odamga
 * berilgan va'da. Uni qo'lda o'zgartirish mumkin bo'lsa, o'sha
 * va'daning ma'nosi qolmaydi.
 */
export function AdminWaitlistContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_WAITLIST_READ}>
      <WaitlistBody />
    </RequireAdmin>
  );
}

function WaitlistBody() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const query = new URLSearchParams({ page: String(page) });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error } = useApiQuery<WaitlistResponse>(`/api/v1/admin/waitlist?${query.toString()}`);

  const entries = data?.entries ?? [];
  const bySource = data?.bySource ?? [];
  const total = bySource.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <AdminHeader title="Navbat" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        {total > 0 && (
          <div className="bg-card border-border animate-fade-up mb-4 rounded-2xl border p-4">
            <p className="text-2xl font-semibold tabular-nums">{total}</p>
            <p className="text-muted-foreground text-xs">jami yozilgan</p>

            {/* Reklama qayerda ishlaganini ko'rsatadi. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {bySource.map((item) => (
                <Badge key={item.source} variant="outline">
                  {item.source}: {item.count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            // Qidiruv o'zgarganda birinchi sahifaga qaytamiz — aks holda
            // odam bo'sh 5-sahifani ko'rib "hech kim yo'q" deb o'ylardi.
            setPage(1);
          }}
          placeholder="Raqam, ism yoki shahar"
          aria-label="Navbatdan qidirish"
          className="mb-4"
        />

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <EmptyState icon={ListOrdered} title="Hech kim yo'q" description="Navbatga hali hech kim yozilmagan." />
        )}

        <ul className="space-y-2">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-3"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tabular-nums">
                {entry.position}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name ?? 'Ism qoldirilmagan'}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {formatUzPhone(entry.phone)}
                  {entry.city ? ` · ${entry.city}` : ''}
                  {entry.source ? ` · ${entry.source}` : ''}
                </p>
              </div>

              <span className="text-muted-foreground shrink-0 text-xs">{formatUzDate(entry.createdAt)}</span>
            </li>
          ))}
        </ul>

        {entries.length > 0 && (
          <div className="flex items-center justify-between gap-3 py-4">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
              Oldingi
            </Button>

            <span className="text-muted-foreground text-sm">{page}-sahifa</span>

            <Button
              size="sm"
              variant="outline"
              // Keyingi sahifa bor-yo'qligini bilish uchun to'liq sahifa
              // kelganini tekshiramiz: kam kelgan bo'lsa — bu oxirgisi.
              disabled={entries.length < 20}
              onClick={() => setPage((value) => value + 1)}
            >
              Keyingi
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
