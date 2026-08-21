'use client';

import { Briefcase, Eye, EyeOff, FileText, Package, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CONTENT_REMOVAL_REASONS,
  CONTENT_REMOVAL_REASON_CONFIG,
  REMOVAL_NOTE_MAX_LENGTH,
  REMOVAL_NOTE_MIN_LENGTH,
  type ContentRemovalReasonName,
} from '@/config/moderation-reasons';
import { Permission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { RequireAdmin } from '@/modules/admin/require-admin';
import type { AdminContentItem, ContentKind } from '@/modules/admin/content.service';

interface ContentResponse {
  items: AdminContentItem[];
}

const KIND_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'PRODUCT', label: 'Mahsulot' },
  { value: 'DISH', label: 'Taom' },
  { value: 'POST', label: 'Post' },
  { value: 'VACANCY', label: 'Vakansiya' },
] as const;

const STATUS_TABS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'VISIBLE', label: "Ko'rinadi" },
  { value: 'HIDDEN', label: 'Yashirilgan' },
] as const;

const KIND_ICONS: Record<ContentKind, typeof Package> = {
  PRODUCT: Package,
  DISH: UtensilsCrossed,
  POST: FileText,
  VACANCY: Briefcase,
};

const KIND_LABELS: Record<ContentKind, string> = {
  PRODUCT: 'Mahsulot',
  DISH: 'Taom',
  POST: 'Post',
  VACANCY: 'Vakansiya',
};

/**
 * Kontent moderatsiyasi.
 *
 * ── Nima uchun biznesni yopishdan alohida ─────────────────────────────
 * Do'konda mingta mahsulot bo'lib, ulardan bittasi qoidaga zid bo'lsa,
 * butun do'konni yopish qolgan 999 tasini ham va sotuvchining butun
 * daromadini ham to'xtatadi. Bu — bolg'a bilan soat tuzatish.
 *
 * Bu sahifa aniq bitta yozuvni yashirishga imkon beradi.
 */
export function AdminContentModerationContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_CONTENT_MANAGE}>
      <ContentBody />
    </RequireAdmin>
  );
}

function ContentBody() {
  const request = useApiClient();

  const [kind, setKind] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const query = new URLSearchParams({ kind, status });
  if (search.trim()) query.set('search', search.trim());

  const { data, isLoading, error, reload } = useApiQuery<ContentResponse>(
    `/api/v1/admin/content?${query.toString()}`,
  );

  const [hidingId, setHidingId] = useState<string | null>(null);
  const [reason, setReason] = useState<ContentRemovalReasonName | ''>('');
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const items = data?.items ?? [];

  async function apply(item: AdminContentItem, isVisible: boolean) {
    setBusyId(item.id);
    setActionError(null);

    try {
      await request(`/api/v1/admin/content/${item.kind}/${item.id}`, {
        method: 'PATCH',
        body: {
          isVisible,
          ...(isVisible ? {} : { reason }),
          ...(!isVisible && note.trim() ? { note: note.trim() } : {}),
        },
      });

      setHidingId(null);
      setReason('');
      setNote('');
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Kontent" showBack backHref="/admin" />

      <div className="px-4 pt-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nomi yoki matni bo'yicha qidirish"
          aria-label="Kontent qidirish"
        />

        <div className="-mx-4 mt-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {KIND_TABS.map((tab) => (
            <FilterChip
              key={tab.value}
              label={tab.label}
              active={kind === tab.value}
              onClick={() => setKind(tab.value)}
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

        {actionError && (
          <Alert variant="error" title="Bajarilmadi" className="mb-4">
            {actionError}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            icon={FileText}
            title="Hech narsa topilmadi"
            description="Filtrni yoki qidiruv so'zini o'zgartiring."
          />
        )}

        <ul className="space-y-2 pb-4">
          {items.map((item, index) => {
            const Icon = KIND_ICONS[item.kind];
            const isBusy = busyId === item.id;
            const isHiding = hidingId === item.id;

            return (
              <li
                key={`${item.kind}-${item.id}`}
                className={cn(
                  'bg-card border-border animate-fade-up rounded-2xl border p-3',
                  !item.isVisible && 'border-destructive/40 bg-destructive/5',
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      item.isVisible ? 'bg-secondary text-muted-foreground' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/*
                        Post matni uzun bo'lishi mumkin — u ikki qatorga
                        kesiladi. `truncate` bitta qatorga siqib, gapning
                        ma'nosini yo'qotardi.
                      */}
                      <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                      {!item.isVisible && <Badge variant="destructive">Yashirilgan</Badge>}
                    </div>

                    <p className="text-muted-foreground truncate text-xs">
                      {`${KIND_LABELS[item.kind]} · ${item.owner} · ${formatUzDate(item.createdAt)}`}
                    </p>
                  </div>
                </div>

                {isHiding ? (
                  <div className="mt-3 space-y-3">
                    {/*
                      Sabab RO'YXATDAN tanlanadi.

                      Ilgari bu erkin matn edi va faqat jurnalga
                      tushardi. Endi u MUALLIFGA ko'rsatiladi — ya'ni
                      har safar bir xil va tushunarli bo'lishi kerak.
                    */}
                    <Field
                      id={`reason-${item.id}`}
                      label="Yashirish sababi"
                      hint="Muallif shu sababni ko'radi"
                      required
                    >
                      <Select
                        id={`reason-${item.id}`}
                        value={reason}
                        placeholder="Sababni tanlang"
                        onChange={(event) => setReason(event.target.value as ContentRemovalReasonName)}
                        options={CONTENT_REMOVAL_REASONS.map((value) => ({
                          value,
                          label: CONTENT_REMOVAL_REASON_CONFIG[value].label,
                        }))}
                      />
                    </Field>

                    {reason !== '' && (
                      <>
                        {/* Muallif ko'radigan matn — moderator uni oldindan o'qiydi. */}
                        <p className="text-muted-foreground bg-secondary rounded-xl p-3 text-xs leading-relaxed">
                          {CONTENT_REMOVAL_REASON_CONFIG[reason].notice}
                        </p>

                        <Field
                          id={`note-${item.id}`}
                          label="Qo'shimcha izoh"
                          hint={
                            CONTENT_REMOVAL_REASON_CONFIG[reason].needsNote
                              ? 'Bu sabab uchun izoh majburiy'
                              : "Ixtiyoriy — u ham muallifga ko'rinadi"
                          }
                          required={CONTENT_REMOVAL_REASON_CONFIG[reason].needsNote}
                        >
                          <Textarea
                            id={`note-${item.id}`}
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="Masalan: rasmda boshqa do'konning logotipi bor"
                            rows={2}
                            maxLength={REMOVAL_NOTE_MAX_LENGTH}
                          />
                        </Field>
                      </>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={isBusy}
                        disabled={
                          reason === '' ||
                          (CONTENT_REMOVAL_REASON_CONFIG[reason].needsNote &&
                            note.trim().length < REMOVAL_NOTE_MIN_LENGTH)
                        }
                        onClick={() => void apply(item, false)}
                      >
                        Yashirish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setHidingId(null);
                          setReason('');
                          setNote('');
                        }}
                      >
                        Bekor qilish
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    {item.isVisible ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setHidingId(item.id);
                          setReason('');
                          setActionError(null);
                        }}
                      >
                        <EyeOff className="size-4" aria-hidden="true" />
                        Yashirish
                      </Button>
                    ) : (
                      <Button size="sm" isLoading={isBusy} onClick={() => void apply(item, true)}>
                        <Eye className="size-4" aria-hidden="true" />
                        Qaytarish
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
