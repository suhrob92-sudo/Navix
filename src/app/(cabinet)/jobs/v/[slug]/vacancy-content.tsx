'use client';

import { Briefcase, Building2, Check, MapPin, Users } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { LinkedPosts } from '@/components/feed/linked-posts';
import { ServiceIcon } from '@/components/app/service-icon';
import { VacancyCard } from '@/components/jobs/vacancy-card';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalary,
  type JobApplicationResponse,
  type VacancyResponse,
} from '@/modules/job/job.types';

export interface VacancyContentProps {
  slug: string;
}

/**
 * Vakansiya sahifasi.
 *
 * ── Nima uchun ariza oynasi ALOHIDA ochiladi ──────────────────────────
 * Ariza yuborish — qaytarib bo'lmaydigan amal emas, lekin baribir
 * qaror: telefon raqamingiz ish beruvchiga ochiladi. Bitta bosishda
 * yuborilib ketmasligi kerak.
 *
 * Shuning uchun avval oyna ochiladi, unda nima yuborilishi aniq
 * yoziladi va faqat shundan keyin tugma bosiladi.
 */
export function VacancyContent({ slug }: VacancyContentProps) {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<VacancyResponse>(`/api/v1/jobs/vacancies/${slug}`);

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const vacancy = data?.vacancy ?? null;
  const hasApplied = isSent || vacancy?.hasApplied === true;

  async function apply() {
    if (!vacancy) return;

    setIsSending(true);
    setActionError(null);

    try {
      await request<JobApplicationResponse>('/api/v1/jobs/applications', {
        method: 'POST',
        body: { vacancyId: vacancy.id, ...(coverNote.trim() ? { coverNote: coverNote.trim() } : {}) },
      });

      setIsSent(true);
      setIsApplyOpen(false);

      // Ro'yxat qayta so'ralmaydi — belgini shu yerda yangilaymiz.
      setData((current) => ({
        vacancy: { ...current!.vacancy, hasApplied: true },
        related: current?.related ?? [],
      }));
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setIsApplyOpen(false);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <AppHeader title="Vakansiya" showBack backHref="/jobs" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Vakansiyani yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {vacancy && (
          <>
            {/* Sarlavha va maosh */}
            <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Briefcase} color={vacancy.company.color} size="md" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg leading-snug font-semibold text-balance">{vacancy.title}</h1>
                  <p className="text-muted-foreground mt-0.5 text-sm">{vacancy.company.name}</p>
                </div>
              </div>

              <p className="mt-3 text-xl font-semibold tabular-nums">
                {formatSalary(vacancy.salaryMin, vacancy.salaryMax, formatTiyin)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{EMPLOYMENT_TYPE_LABELS[vacancy.employmentType]}</Badge>
                <Badge variant="secondary">{EXPERIENCE_LEVEL_LABELS[vacancy.experienceLevel]}</Badge>
                <Badge variant="secondary" className="gap-1">
                  <MapPin className="size-3" aria-hidden="true" />
                  {vacancy.city}
                </Badge>
              </div>

              {/*
                Nechta odam ariza yuborgan — nomzod raqobatni bilsin.
                Yashirish uni noaniqlikda qoldirardi.
              */}
              <p className="text-muted-foreground border-border/60 mt-3 flex items-center gap-1.5 border-t pt-3 text-xs">
                <Users className="size-3.5 shrink-0" aria-hidden="true" />
                {vacancy.applicationCount === 0
                  ? 'Hali hech kim ariza yubormagan — birinchi bo\'ling'
                  : `${vacancy.applicationCount} ta nomzod ariza yuborgan`}
              </p>
            </section>

            {/* Tavsif */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Ish haqida</h2>
              {/* `whitespace-pre-line` — matndagi qatorlar saqlanadi */}
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">{vacancy.description}</p>
            </section>

            {/* Kompaniya */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Building2 className="size-4" aria-hidden="true" />
                {vacancy.company.name}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{vacancy.company.description}</p>
              <p className="text-muted-foreground mt-2 text-xs">
                {`${vacancy.company.industry} · ${vacancy.company.city}`}
              </p>
            </section>

            {/* Ariza */}
            {hasApplied ? (
              <Alert variant="success" title="Ariza yuborilgan">
                Javobni &quot;Mening arizalarim&quot; bo&apos;limida kuzatib boring.
              </Alert>
            ) : (
              <Button fullWidth size="lg" onClick={() => setIsApplyOpen(true)}>
                Ariza yuborish
              </Button>
            )}

            <LinkedPosts kind="VACANCY" targetId={vacancy.id} />

            {/* O'xshash e'lonlar */}
            {(data?.related.length ?? 0) > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold">O&apos;xshash vakansiyalar</h2>
                <ul className="space-y-2">
                  {(data?.related ?? []).map((item, index) => (
                    <li key={item.id}>
                      <VacancyCard vacancy={item} index={index} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {/*
        Ariza oynasi.

        Matnda ANIQ yoziladi: telefon raqami ish beruvchiga ochiladi.
        Foydalanuvchi nima ulashayotganini bilib turishi kerak.
      */}
      {isApplyOpen && vacancy && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="bg-card animate-scale-in w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Ariza yuborish</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {`${vacancy.company.name} — "${vacancy.title}". Ish beruvchi ismingiz va telefon raqamingizni ko'radi.`}
            </p>

            <Field
              id="cover-note"
              label="Qisqa xat"
              hint="Ixtiyoriy. Nima uchun aynan siz mos kelasiz?"
              className="mt-4"
            >
              <Input
                id="cover-note"
                value={coverNote}
                onChange={(event) => setCoverNote(event.target.value)}
                placeholder="Masalan: 3 yil shu sohada ishlaganman"
                disabled={isSending}
              />
            </Field>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsApplyOpen(false)} disabled={isSending}>
                Bekor qilish
              </Button>
              <Button onClick={apply} isLoading={isSending} loadingText="Yuborilmoqda...">
                <Check className="size-4" aria-hidden="true" />
                Yuborish
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
