'use client';

import { Bug, Check, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { RequireAdmin } from '@/modules/admin/require-admin';
import {
  ERROR_SOURCE_LABELS,
  formatErrorCount,
  type ErrorLogListResponse,
  type ErrorLogView,
} from '@/modules/error-log/error-log.types';

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: 'OPEN', label: 'Yangi' },
  { value: 'RESOLVED', label: "Ko'rildi" },
  { value: 'ALL', label: 'Hammasi' },
] as const;

/**
 * Xatolar jurnali — production'da nima buzilayotganini ko'rsatadi.
 *
 * ── Nima uchun bu bo'lim BOR ──────────────────────────────────────────
 * Ilova telefonlarda ishlaydi va u yerda nima bo'layotgani ko'rinmaydi.
 * Foydalanuvchi esa odatda shikoyat qilmaydi — shunchaki ilovani
 * yopadi va qaytmaydi.
 *
 * Tashqi xizmatlar (Sentry) O'zbekistondan har doim ham ochilmaydi,
 * shuning uchun jurnal shu yerda — hech kimga bog'liq emas.
 */
export function AdminErrorsContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_AUDIT_READ}>
      <ErrorsBody />
    </RequireAdmin>
  );
}

function ErrorsBody() {
  const request = useApiClient();

  const [status, setStatus] = useState<string>('OPEN');
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const query = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });

  const { data, isLoading, error, setData, reload } = useApiQuery<ErrorLogListResponse>(
    `/api/v1/admin/errors?${query.toString()}`,
    /**
     * Har 30 soniyada yangilanadi.
     *
     * Bu sahifa odatda "hozir nima bo'lyapti?" degan savol bilan
     * ochiladi — masalan yangi versiya chiqarilgandan keyin. Qo'lda
     * yangilashni kutish o'sha paytda noqulay.
     */
    { refreshIntervalMs: 30_000 },
  );

  const errors = data?.errors ?? [];
  const hasMore = errors.length === PAGE_SIZE;

  async function toggleResolved(item: ErrorLogView) {
    setPendingId(item.id);
    setActionError(null);

    try {
      await request(`/api/v1/admin/errors/${item.id}`, {
        method: 'PATCH',
        body: { isResolved: !item.isResolved },
      });

      setData((current) =>
        current
          ? {
              // "Yangi" bo'limida yopilgan xato ro'yxatdan chiqib ketadi.
              errors:
                status === 'OPEN'
                  ? current.errors.filter((row) => row.id !== item.id)
                  : current.errors.map((row) =>
                      row.id === item.id ? { ...row, isResolved: !row.isResolved } : row,
                    ),
              openCount: Math.max(0, current.openCount + (item.isResolved ? 1 : -1)),
            }
          : current!,
      );
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  async function clearResolved() {
    setIsClearing(true);
    setActionError(null);

    try {
      await request('/api/v1/admin/errors', { method: 'DELETE' });

      setIsClearOpen(false);
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <>
      <AdminHeader title="Xatolar" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              aria-pressed={status === tab.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                status === tab.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {tab.label}
              {tab.value === 'OPEN' && (data?.openCount ?? 0) > 0 && (
                <span className="ml-1.5 tabular-nums">{data?.openCount}</span>
              )}
            </button>
          ))}
        </div>

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Xatolarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && errors.length === 0 && (
          <EmptyState
            icon={Bug}
            title="Xato yo'q"
            description="Bu bo'limda hozircha hech narsa yo'q. Bu — yaxshi belgi."
          />
        )}

        <ul className="space-y-2">
          {errors.map((item, index) => (
            <li
              key={item.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
            >
              <ErrorCard
                item={item}
                isPending={pendingId === item.id}
                onToggle={() => void toggleResolved(item)}
              />
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

        {/*
          Tozalash faqat YOPILGAN xatolarni o'chiradi. "Hammasini
          tozalash" tugmasi tuzatilmagan muammoni ham ko'zdan
          yo'qotardi.
        */}
        {!isLoading && !error && errors.length > 0 && (
          <Button variant="ghost" fullWidth className="mt-4" onClick={() => setIsClearOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Ko&apos;rilganlarni tozalash
          </Button>
        )}

        <p className="text-muted-foreground mt-6 text-xs leading-relaxed">
          Xatolar 30 kun saqlanadi, keyin avtomatik o&apos;chiriladi. Bir xil xatolar bitta qatorga yig&apos;iladi
          — yonidagi son necha marta takrorlanganini bildiradi.
        </p>
      </div>

      <ConfirmDialog
        open={isClearOpen}
        title="Ko'rilgan xatolar o'chirilsinmi?"
        description="Faqat 'ko'rildi' deb belgilangan xatolar o'chiriladi. Tuzatilmagan xatolar joyida qoladi."
        confirmLabel="O'chirish"
        isDestructive
        isLoading={isClearing}
        onConfirm={() => void clearResolved()}
        onCancel={() => setIsClearOpen(false)}
      />
    </>
  );
}

interface ErrorCardProps {
  item: ErrorLogView;
  isPending: boolean;
  onToggle: () => void;
}

function ErrorCard({ item, isPending, onToggle }: ErrorCardProps) {
  const [isStackOpen, setIsStackOpen] = useState(false);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{item.kind}</p>
          <p className="text-muted-foreground mt-0.5 font-mono text-xs break-all">
            {item.method ? `${item.method} ` : ''}
            {item.path}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant={item.source === 'SERVER' ? 'default' : 'secondary'}>
            {ERROR_SOURCE_LABELS[item.source]}
          </Badge>

          {item.count > 1 && <Badge variant="destructive">{`${formatErrorCount(item.count)} marta`}</Badge>}
        </div>
      </div>

      <p className="bg-secondary/60 mt-3 rounded-lg p-3 font-mono text-xs leading-relaxed break-words">
        {item.message}
      </p>

      <p className="text-muted-foreground mt-2 text-xs">
        {`Oxirgi: ${formatUzDateTime(item.lastSeenAt)}`}
        {item.count > 1 && ` · Birinchi: ${formatUzDateTime(item.firstSeenAt)}`}
        {item.version && ` · ${item.version}`}
      </p>

      {item.stack && (
        <>
          <button
            type="button"
            onClick={() => setIsStackOpen((current) => !current)}
            className="text-muted-foreground hover:text-foreground mt-2 text-xs underline underline-offset-2"
          >
            {isStackOpen ? 'Izni yashirish' : "Xato izini ko'rsatish"}
          </button>

          {isStackOpen && (
            /*
              Iz `overflow-x-auto` ichida: qatorlari uzun bo'ladi va
              telefonda kartadan chiqib ketardi.
            */
            <pre className="bg-secondary/60 mt-2 max-h-64 overflow-auto rounded-lg p-3 font-mono text-[0.6875rem] leading-relaxed">
              {item.stack}
            </pre>
          )}
        </>
      )}

      <div className="mt-3">
        <Button variant={item.isResolved ? 'ghost' : 'outline'} size="sm" isLoading={isPending} onClick={onToggle}>
          {item.isResolved ? (
            <>
              <RotateCcw className="size-4" aria-hidden="true" />
              Qayta ochish
            </>
          ) : (
            <>
              <Check className="size-4" aria-hidden="true" />
              Ko&apos;rdim
            </>
          )}
        </Button>
      </div>
    </>
  );
}
