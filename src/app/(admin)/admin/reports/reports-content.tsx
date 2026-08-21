'use client';

import { Flag } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission, hasPermission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { RequireAdmin } from '@/modules/admin/require-admin';
import { useAuth } from '@/modules/auth/auth-context';
import {
  REPORT_STATUS_LABELS,
  reportReasonLabel,
  type AdminReportListResponse,
  type AdminReportView,
  type ReportPartyView,
  type ReportStatusName,
} from '@/modules/moderation/moderation.types';

const PAGE_SIZE = 20;

/** Filtr yorliqlari — moderator odatda faqat yangilar bilan ishlaydi. */
const STATUS_TABS = [
  { value: 'OPEN', label: 'Yangi' },
  { value: 'REVIEWED', label: "Chora ko'rildi" },
  { value: 'DISMISSED', label: 'Asossiz' },
  { value: 'ALL', label: 'Hammasi' },
] as const;

/**
 * Shikoyatlar — moderator ish o'rni.
 *
 * ── Nima uchun bu yerda "bloklash" tugmasi YO'Q ───────────────────────
 * Hisobni to'xtatish "Odamlar" bo'limida, foydalanuvchi kartochkasida
 * bajariladi va u yerda butun tarix ko'rinadi: qancha buyurtma,
 * qancha to'lov, qanday sessiyalar. Shikoyat ro'yxatidan turib
 * to'xtatish — kontekstsiz qaror qabul qilishga undardi.
 */
export function AdminReportsContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_REPORT_MANAGE}>
      <ReportsBody />
    </RequireAdmin>
  );
}

function ReportsBody() {
  const request = useApiClient();
  const { user } = useAuth();

  const [status, setStatus] = useState<string>('OPEN');
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });

  const { data, isLoading, error, setData } = useApiQuery<AdminReportListResponse>(
    `/api/v1/admin/reports?${query.toString()}`,
  );

  /**
   * Yashirish tugmasi FAQAT ruxsati borlarga ko'rinadi.
   *
   * Moderator shikoyatlarni ko'ra oladi, lekin kontentni yashirish —
   * alohida ruxsat. Ishlamaydigan tugma ko'rsatish xatoga o'xshab
   * ko'rinardi.
   */
  const canHideContent = hasPermission(user?.roles ?? [], Permission.PLATFORM_CONTENT_MANAGE);

  const reports = data?.reports ?? [];
  const hasMore = reports.length === PAGE_SIZE;

  /**
   * Shikoyat qilingan postni YASHIRADI.
   *
   * Kontent moderatsiyasi bo'limidagi bilan bir xil amal — shu
   * yerdan bajarilishi moderatorni sahifadan sahifaga yugurtirmaydi.
   * Shikoyat esa AVTOMATIK yopilmaydi: chora ko'rish va shikoyatni
   * baholash ikki xil qaror.
   */
  async function hideContent(report: AdminReportView) {
    if (!report.content) return;

    setPendingId(report.id);
    setActionError(null);

    try {
      await request(`/api/v1/admin/content/${report.content.kind}/${report.content.id}`, {
        method: 'PATCH',
        body: { isVisible: false, reason: `Shikoyat: ${reportReasonLabel(report.reason)}` },
      });

      setData((current) =>
        current
          ? {
              reports: current.reports.map((item) =>
                item.id === report.id && item.content
                  ? { ...item, content: { ...item.content, isVisible: false } }
                  : item,
              ),
            }
          : current!,
      );
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  async function resolve(reportId: string, next: Exclude<ReportStatusName, 'OPEN'>) {
    setPendingId(reportId);
    setActionError(null);

    try {
      await request(`/api/v1/admin/reports/${reportId}`, { method: 'PATCH', body: { status: next } });

      /**
       * Ro'yxat DARHOL yangilanadi.
       *
       * "Yangi" filtrida yopilgan shikoyat ro'yxatdan chiqib ketishi
       * kerak — aks holda moderator uni qayta bosib, xato olardi.
       */
      setData((current) =>
        current
          ? {
              reports:
                status === 'OPEN'
                  ? current.reports.filter((item) => item.id !== reportId)
                  : current.reports.map((item) =>
                      item.id === reportId
                        ? { ...item, status: next, reviewedAt: new Date().toISOString() }
                        : item,
                    ),
            }
          : current!,
      );
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Shikoyatlar" showBack backHref="/admin" />

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
            </button>
          ))}
        </div>

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Shikoyatlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && reports.length === 0 && (
          <EmptyState
            icon={Flag}
            title="Shikoyat yo'q"
            description="Bu bo'limda hozircha hech narsa yo'q. Bu — yaxshi belgi."
          />
        )}

        <ul className="space-y-2">
          {reports.map((report, index) => (
            <li
              key={report.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
            >
              <ReportCard
                report={report}
                isPending={pendingId === report.id}
                onResolve={(next) => void resolve(report.id, next)}
                onHide={canHideContent ? () => void hideContent(report) : undefined}
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
      </div>
    </>
  );
}

/** Shikoyat tomonining nomi — profilga havola bilan. */
function PartyLink({ party }: { party: ReportPartyView }) {
  const label = party.fullName ?? (party.username ? `@${party.username}` : 'Foydalanuvchi');

  if (!party.username) {
    return <span>{label}</span>;
  }

  return (
    <Link href={`/u/${party.username}`} className="hover:text-foreground underline-offset-2 hover:underline">
      {label}
    </Link>
  );
}

interface ReportCardProps {
  report: AdminReportView;
  isPending: boolean;
  onResolve: (next: Exclude<ReportStatusName, 'OPEN'>) => void;
  /** Postni yashirish. Ruxsati yo'q moderatorga berilmaydi. */
  onHide?: () => void;
}

function ReportCard({ report, isPending, onResolve, onHide }: ReportCardProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{reportReasonLabel(report.reason)}</p>
          {/*
            Kim kim ekani ANIQ yozilgan. "A · B" ko'rinishida ikkalasi
            bir xil ismli bo'lsa (yoki ismsiz bo'lsa) moderator qaysi
            biri shikoyat qilganini ajrata olmasdi.
          */}
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {'Kim ustidan: '}
            <PartyLink party={report.target} />
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {'Kim yozdi: '}
            <PartyLink party={report.reporter} />
          </p>
        </div>

        {report.status === 'OPEN' ? (
          report.targetOpenReports > 1 && (
            <Badge variant="destructive">{`${report.targetOpenReports} ta shikoyat`}</Badge>
          )
        ) : (
          <Badge variant="secondary">{REPORT_STATUS_LABELS[report.status]}</Badge>
        )}
      </div>

      {/*
        Shikoyat qilingan YOZUV shu yerda ko'rinadi.
        
        Ilgari faqat "kim ustidan" yozilardi va moderator odamning
        yuzta postidan qaysi biri haqida ekanini topa olmasdi.
      */}
      {report.content && (
        <div className="border-border/60 bg-secondary/40 mt-3 rounded-lg border p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {report.content.kind === 'POST' ? 'Post' : 'Izoh'}
            </span>

            {!report.content.isVisible && <Badge variant="secondary">Yashirilgan</Badge>}
          </div>

          <p className="text-sm leading-relaxed break-words">{report.content.preview}</p>

          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={report.content.href}
              className="text-primary text-xs underline-offset-2 hover:underline"
            >
              Ochib ko&apos;rish
            </Link>

            {report.content.kind === 'POST' && report.content.isVisible && onHide && (
              <button
                type="button"
                disabled={isPending}
                onClick={onHide}
                className="text-destructive text-xs underline-offset-2 hover:underline disabled:opacity-60"
              >
                Postni yashirish
              </button>
            )}
          </div>
        </div>
      )}

      {report.note && (
        <p className="bg-secondary/60 mt-3 rounded-lg p-3 text-sm leading-relaxed break-words">{report.note}</p>
      )}

      <p className="text-muted-foreground mt-2 text-xs">
        {`${formatUzDateTime(report.createdAt)}${report.reviewedAt ? ` · yopilgan: ${formatUzDateTime(report.reviewedAt)}` : ''}`}
      </p>

      {report.status === 'OPEN' && (
        <div className="mt-3 flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            isLoading={isPending}
            onClick={() => onResolve('REVIEWED')}
          >
            Chora ko&apos;rildi
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={isPending}
            onClick={() => onResolve('DISMISSED')}
          >
            Asos yo&apos;q
          </Button>
        </div>
      )}
    </>
  );
}
