'use client';

import { Check, Phone, Users, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_VARIANTS } from '@/modules/job/job.types';
import {
  EMPLOYER_APPLICATION_FILTERS,
  candidateName,
  type EmployerApplication,
  type EmployerApplicationFilter,
  type EmployerApplicationsResponse,
} from '@/modules/employer/employer.types';

/**
 * Kelgan arizalar — kabinetdagi asosiy ish joyi.
 *
 * ── Telefon raqami darhol ko'rinadi ───────────────────────────────────
 * Uni "ko'rsatish" tugmasi ortiga yashirish mumkin edi, lekin bu
 * faqat noqulaylik tug'dirardi: ish beruvchi baribir bosadi va
 * raqamni ko'radi.
 *
 * Haqiqiy himoya boshqa joyda: raqamni FAQAT e'lon egasi ko'radi
 * (`company.ownerId` tekshiruvi) va har bir qaror AUDITGA yoziladi.
 */
export function EmployerApplicationsContent() {
  const request = useApiClient();
  const searchParams = useSearchParams();
  const vacancyId = searchParams.get('vacancyId') ?? '';
  const companyId = searchParams.get('companyId') ?? '';

  const [status, setStatus] = useState<EmployerApplicationFilter>('PENDING');
  const [deciding, setDeciding] = useState<{ application: EmployerApplication; next: 'INVITED' | 'REJECTED' } | null>(
    null,
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const params = useMemo(() => {
    const result = new URLSearchParams({ status, pageSize: '50' });

    if (vacancyId) result.set('vacancyId', vacancyId);
    if (companyId) result.set('companyId', companyId);

    return result.toString();
  }, [status, vacancyId, companyId]);

  const { data, isLoading, error, reload } = useApiQuery<EmployerApplicationsResponse>(
    `/api/v1/employer/applications?${params}`,
    { refreshIntervalMs: 60_000 },
  );

  const applications = data?.applications ?? [];

  async function decide(application: EmployerApplication, next: string, note?: string) {
    setSavingId(application.id);
    setActionError(null);

    try {
      await request(`/api/v1/employer/applications/${application.id}`, {
        method: 'PATCH',
        body: { status: next, ...(note?.trim() ? { note: note.trim() } : {}) },
      });

      setDeciding(null);
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setDeciding(null);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Nomzodlar" />

      <div className="px-4 pt-4">
        <div className="-mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {EMPLOYER_APPLICATION_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              aria-pressed={status === item.value}
              className={cn(
                'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                status === item.value
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
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-2xl" />
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
            icon={Users}
            title={status === 'PENDING' ? 'Javob kutayotgan nomzod yo\'q' : "Bu bo'limda ariza yo'q"}
            description="Yangi ariza kelganda u shu yerda paydo bo'ladi."
          />
        )}

        <ul className="space-y-2">
          {applications.map((application, index) => (
            <li
              key={application.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base leading-snug font-semibold">{candidateName(application.candidate)}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {`${application.vacancy.title} · ${application.vacancy.city}`}
                  </p>
                </div>

                <Badge variant={APPLICATION_STATUS_VARIANTS[application.status]} className="shrink-0">
                  {APPLICATION_STATUS_LABELS[application.status]}
                </Badge>
              </div>

              {/*
                Telefon — bosiladigan havola.
                Telefonda bosilganda darhol qo'ng'iroq oynasi ochiladi.
              */}
              <a
                href={`tel:${application.candidate.phone}`}
                className="bg-secondary/60 mt-3 flex items-center gap-2 rounded-xl p-3 text-sm font-medium tabular-nums transition-colors active:scale-[0.99]"
              >
                <Phone className="size-4 shrink-0" aria-hidden="true" />
                {application.candidate.phone}
              </a>

              {application.coverNote && (
                <p className="mt-3 text-sm leading-relaxed">{application.coverNote}</p>
              )}

              {application.employerNote && (
                <p className="border-border/60 text-muted-foreground mt-3 border-l-2 pl-3 text-sm leading-relaxed">
                  {`Javobingiz: ${application.employerNote}`}
                </p>
              )}

              <div className="border-border/60 mt-3 border-t pt-3">
                <span className="text-muted-foreground text-xs">{formatRelativeUz(application.createdAt)}</span>

                {/*
                  Tugmalar faqat javob berilmagan arizada.
                  Qaror qabul qilingandan keyin uni o'zgartirib
                  bo'lmaydi — nomzod allaqachon xabar olgan.
                */}
                {(application.status === 'SENT' || application.status === 'VIEWED') && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      disabled={savingId === application.id}
                      onClick={() => setDeciding({ application, next: 'REJECTED' })}
                    >
                      <X className="size-4" aria-hidden="true" />
                      Rad etish
                    </Button>
                    <Button
                      size="sm"
                      fullWidth
                      disabled={savingId === application.id}
                      onClick={() => setDeciding({ application, next: 'INVITED' })}
                    >
                      <Check className="size-4" aria-hidden="true" />
                      Suhbatga
                    </Button>
                  </div>
                )}

                {application.status === 'SENT' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    className="mt-2"
                    disabled={savingId === application.id}
                    onClick={() => void decide(application, 'VIEWED')}
                  >
                    Keyinroq qaraymen — belgilab qo&apos;yish
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {deciding && (
        <DecisionDialog
          application={deciding.application}
          next={deciding.next}
          isSaving={savingId === deciding.application.id}
          onCancel={() => setDeciding(null)}
          onConfirm={(note) => void decide(deciding.application, deciding.next, note)}
        />
      )}
    </>
  );
}

interface DecisionDialogProps {
  application: EmployerApplication;
  next: 'INVITED' | 'REJECTED';
  isSaving: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

/**
 * Qaror oynasi.
 *
 * ── Nima uchun izoh maydoni bor ───────────────────────────────────────
 * Suhbatga taklifda eng kerakli ma'lumot — QACHON va QAYERGA kelish.
 * Uni yozadigan joy bo'lmasa, ish beruvchi baribir qo'ng'iroq qilishi
 * kerak bo'lardi va taklif ma'nosini yo'qotardi.
 *
 * Rad javobida esa izoh ixtiyoriy: sabab yozish majburiy qilinsa,
 * ko'pchilik umuman javob bermay qo'yardi — jimlik esa eng yomon
 * javob.
 */
function DecisionDialog({ application, next, isSaving, onCancel, onConfirm }: DecisionDialogProps) {
  const isInvite = next === 'INVITED';
  const [note, setNote] = useState(isInvite ? '' : '');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="bg-card animate-scale-in w-full max-w-md rounded-2xl p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {isInvite ? 'Suhbatga taklif qilish' : 'Rad etish'}
        </h2>

        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {`${candidateName(application.candidate)} — "${application.vacancy.title}". Nomzod xabarnoma oladi va bu qarorni keyin o'zgartirib bo'lmaydi.`}
        </p>

        <Field
          id="employer-note"
          label={isInvite ? 'Qachon va qayerga kelsin?' : 'Izoh'}
          hint={isInvite ? 'Bu matn nomzodga xabarnomada ko\'rinadi' : 'Ixtiyoriy'}
          className="mt-4"
        >
          <Textarea
            id="employer-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              isInvite
                ? "Masalan: Ertaga soat 10:00 da Amir Temur ko'chasi 15-uyga keling"
                : 'Masalan: Tajribangiz talabga to\'liq mos kelmadi'
            }
            disabled={isSaving}
          />
        </Field>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Bekor qilish
          </Button>
          <Button
            variant={isInvite ? 'primary' : 'destructive'}
            onClick={() => onConfirm(note)}
            isLoading={isSaving}
            loadingText="Yuborilmoqda..."
          >
            {isInvite ? 'Taklif yuborish' : 'Rad etish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
