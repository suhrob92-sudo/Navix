'use client';

import { Briefcase, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VARIANTS,
  canWithdraw,
  type JobApplicationsResponse,
} from '@/modules/job/job.types';

const FILTERS = [
  { id: 'ALL', label: 'Barchasi' },
  { id: 'ACTIVE', label: 'Javob kutilmoqda' },
  { id: 'INVITED', label: 'Taklif' },
  { id: 'REJECTED', label: 'Rad etilgan' },
] as const;

/**
 * Nomzodning arizalari.
 *
 * ── Nima uchun "javob kutilmoqda" alohida filtr ───────────────────────
 * Ish qidiruvchi o'nlab ariza yuboradi. Uni qiziqtiradigan asosiy
 * savol bitta: "qaysilariga hali javob kelmagan?". Shuning uchun bu
 * holat alohida tugmaga chiqarilgan.
 */
export function ApplicationsContent() {
  const request = useApiClient();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('ALL');
  const [withdrawId, setWithdrawId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error, reload } = useApiQuery<JobApplicationsResponse>(
    `/api/v1/jobs/applications?status=${filter}&pageSize=50`,
  );

  const applications = data?.applications ?? [];

  async function withdraw(applicationId: string) {
    setIsSaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/jobs/applications/${applicationId}/withdraw`, { method: 'POST' });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
      setWithdrawId(null);
    }
  }

  return (
    <>
      <AppHeader title="Mening arizalarim" showBack backHref="/jobs" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                filter === item.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Arizalarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && applications.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title={filter === 'ALL' ? "Hali ariza yubormagansiz" : 'Bu bo\'limda ariza yo\'q'}
            description="Vakansiyalarni ko'rib chiqing va mos kelganiga ariza yuboring."
            action={
              <Button asChild variant="outline">
                <Link href="/jobs">Vakansiyalarni ochish</Link>
              </Button>
            }
          />
        )}

        <ul className="space-y-2">
          {applications.map((application, index) => (
            <li
              key={application.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <Link href={`/jobs/v/${application.vacancy.slug}`} className="flex items-start gap-3">
                <ServiceIcon icon={Briefcase} color={application.vacancy.company.color} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug font-semibold text-balance">{application.vacancy.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {`${application.vacancy.company.name} · ${application.vacancy.city}`}
                  </p>
                </div>

                <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]} className="shrink-0">
                  {APPLICATION_STATUS_LABELS[application.status]}
                </Badge>
              </Link>

              {/* Ish beruvchining javobi — eng muhim matn */}
              {application.employerNote && (
                <p className="bg-secondary/60 mt-3 rounded-xl p-3 text-sm leading-relaxed">
                  {application.employerNote}
                </p>
              )}

              <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-muted-foreground text-xs">{formatRelativeUz(application.createdAt)}</span>

                {canWithdraw(application.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => setWithdrawId(application.id)}
                  >
                    Qaytarib olish
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={withdrawId !== null}
        title="Arizani qaytarib olish"
        description="Ariza ish beruvchi ro'yxatidan olib tashlanadi. Bu vakansiyaga qaytadan ariza yubora olmaysiz."
        confirmLabel="Qaytarib olaman"
        isDestructive
        isLoading={isSaving}
        onConfirm={() => {
          if (withdrawId) void withdraw(withdrawId);
        }}
        onCancel={() => setWithdrawId(null)}
      />
    </>
  );
}
