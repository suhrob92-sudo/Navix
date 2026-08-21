'use client';

import { Briefcase, Plus, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import type { FieldErrors } from '@/lib/api/errors';
import { ApiClientError } from '@/lib/api-client';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  formatSalary,
  type EmploymentTypeName,
  type ExperienceLevelName,
} from '@/modules/job/job.types';
import type {
  EmployerOverviewResponse,
  EmployerVacanciesResponse,
  EmployerVacancy,
} from '@/modules/employer/employer.types';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Barchasi' },
  { value: 'ACTIVE', label: 'Ochiq' },
  { value: 'CLOSED', label: 'Yopiq' },
] as const;

/**
 * Ish beruvchining e'lonlari.
 *
 * ── Nima uchun e'lon O'CHIRILMAYDI, balki YOPILADI ────────────────────
 * O'chirish bilan birga arizalar ham yo'qolardi — nomzodlar esa
 * javob kutib turishibdi. Yopilgan e'lon katalogdan chiqadi, lekin
 * arizalar joyida qoladi va ularga javob berish mumkin.
 */
export function EmployerVacanciesContent() {
  const request = useApiClient();
  const companyIdFromUrl = useSearchParams().get('companyId') ?? '';

  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]['value']>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployerVacancy | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const companies = useApiQuery<EmployerOverviewResponse>('/api/v1/employer/companies');

  const params = useMemo(() => {
    const result = new URLSearchParams({ status, pageSize: '50' });

    if (companyIdFromUrl) result.set('companyId', companyIdFromUrl);

    return result.toString();
  }, [status, companyIdFromUrl]);

  const { data, isLoading, error, reload } = useApiQuery<EmployerVacanciesResponse>(
    `/api/v1/employer/vacancies?${params}`,
  );

  const vacancies = data?.vacancies ?? [];
  const categories = data?.categories ?? [];
  const companyOptions = companies.data?.companies ?? [];

  async function toggleActive(vacancy: EmployerVacancy, isActive: boolean) {
    setSavingId(vacancy.id);
    setActionError(null);

    try {
      await request(`/api/v1/employer/vacancies/${vacancy.id}`, { method: 'PATCH', body: { isActive } });

      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <AdminHeader title="E'lonlarim" />

      <div className="px-4 pt-4">
        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        <Button
          fullWidth
          onClick={() => {
            setEditing(null);
            setIsFormOpen(true);
          }}
          disabled={companyOptions.length === 0}
        >
          <Plus className="size-4" aria-hidden="true" />
          Yangi e&apos;lon
        </Button>

        {companyOptions.length === 0 && !companies.isLoading && (
          <Alert variant="info" className="mt-3">
            Sizga hali kompaniya biriktirilmagan — e&apos;lon joylay olmaysiz.
          </Alert>
        )}

        <div className="-mx-4 mt-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {STATUS_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={status === item.value}
              onClick={() => setStatus(item.value)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="E'lonlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && vacancies.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title={status === 'ALL' ? "Hali e'lon joylamagansiz" : "Bu bo'limda e'lon yo'q"}
            description="Yangi e'lon joylang — u darhol ish qidiruvchilarga ko'rinadi."
          />
        )}

        <ul className="space-y-2">
          {vacancies.map((vacancy, index) => (
            <li
              key={vacancy.id}
              className="bg-card border-border animate-fade-up rounded-2xl border p-4"
              style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                <ServiceIcon icon={Briefcase} color={vacancy.company.color} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="text-base leading-snug font-semibold text-balance">{vacancy.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {`${vacancy.company.name} · ${vacancy.city}`}
                  </p>
                </div>

                {vacancy.pendingCount > 0 && (
                  <Badge variant="warning" className="shrink-0 gap-1">
                    <Users className="size-3" aria-hidden="true" />
                    {vacancy.pendingCount}
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-lg font-semibold tabular-nums">
                {formatSalary(vacancy.salaryMin, vacancy.salaryMax, formatTiyin)}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-muted-foreground text-xs">
                  {EMPLOYMENT_TYPE_LABELS[vacancy.employmentType]}
                </span>
                <span className="text-muted-foreground text-xs">
                  {EXPERIENCE_LEVEL_LABELS[vacancy.experienceLevel]}
                </span>
                <span className="text-muted-foreground text-xs">{vacancy.category.name}</span>
              </div>

              <div className="border-border/60 mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-muted-foreground text-xs">
                  {`${vacancy.applicationCount} ta ariza · ${formatRelativeUz(vacancy.createdAt)}`}
                </span>

                {/*
                  "Ochiq" tugmasi — e'lonni katalogdan olib qo'yish.
                  O'chirish tugmasi ATAYLAB yo'q: u bilan birga
                  arizalar ham yo'qolardi.
                */}
                <Switch
                  checked={vacancy.isActive}
                  onCheckedChange={(next) => void toggleActive(vacancy, next)}
                  disabled={savingId === vacancy.id}
                  label={vacancy.isActive ? 'Ochiq' : 'Yopiq'}
                />
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setEditing(vacancy);
                    setIsFormOpen(true);
                  }}
                >
                  Tahrirlash
                </Button>
                <Button asChild variant="outline" size="sm" fullWidth>
                  <Link href={`/employer/applications?vacancyId=${vacancy.id}`}>Nomzodlar</Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isFormOpen && (
        <VacancyForm
          vacancy={editing}
          companies={companyOptions.map((company) => ({ id: company.id, name: company.name }))}
          categories={categories}
          defaultCompanyId={companyIdFromUrl || companyOptions[0]?.id}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
            reload();
          }}
        />
      )}
    </>
  );
}

interface VacancyFormProps {
  vacancy: EmployerVacancy | null;
  companies: { id: string; name: string }[];
  categories: { id: string; slug: string; name: string }[];
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * E'lon yaratish va tahrirlash oynasi.
 *
 * ── Maosh nima uchun bo'sh qolishi mumkin ─────────────────────────────
 * Ko'p kompaniya maoshni e'londa yozmaydi va uni majburiy qilish
 * ularni yolg'on raqam yozishga majbur qilardi. Bo'sh qoldirilsa
 * e'londa "Kelishilgan" deb chiqadi — bu ham halol javob.
 */
function VacancyForm({ vacancy, companies, categories, defaultCompanyId, onClose, onSaved }: VacancyFormProps) {
  const request = useApiClient();
  const isEdit = vacancy !== null;

  const [companyId, setCompanyId] = useState(vacancy?.company.id ?? defaultCompanyId ?? '');
  const [categoryId, setCategoryId] = useState(vacancy?.category.id ?? '');
  const [title, setTitle] = useState(vacancy?.title ?? '');
  const [description, setDescription] = useState(vacancy?.description ?? '');
  const [city, setCity] = useState(vacancy?.city ?? '');
  const [employmentType, setEmploymentType] = useState<EmploymentTypeName>(vacancy?.employmentType ?? 'FULL_TIME');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevelName>(vacancy?.experienceLevel ?? 'NONE');
  // Maosh SO'MDA kiritiladi — tiyin foydalanuvchi uchun tushunarsiz.
  const [salaryMin, setSalaryMin] = useState(vacancy?.salaryMin ? String(vacancy.salaryMin / 100) : '');
  const [salaryMax, setSalaryMax] = useState(vacancy?.salaryMax ? String(vacancy.salaryMax / 100) : '');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function toSom(value: string): number | null {
    const digits = value.replace(/\D/g, '');

    return digits === '' ? null : Number(digits);
  }

  async function save() {
    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});

    const min = toSom(salaryMin);
    const max = toSom(salaryMax);

    try {
      if (isEdit) {
        await request(`/api/v1/employer/vacancies/${vacancy.id}`, {
          method: 'PATCH',
          body: {
            categoryId,
            title: title.trim(),
            description: description.trim(),
            city: city.trim(),
            employmentType,
            experienceLevel,
            // `null` — "maoshni olib tashla" degani.
            salaryMinSom: min,
            salaryMaxSom: max,
          },
        });
      } else {
        await request('/api/v1/employer/vacancies', {
          method: 'POST',
          body: {
            companyId,
            categoryId,
            title: title.trim(),
            description: description.trim(),
            city: city.trim(),
            employmentType,
            experienceLevel,
            ...(min === null ? {} : { salaryMinSom: min }),
            ...(max === null ? {} : { salaryMaxSom: max }),
          },
        });
      }

      onSaved();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="bg-card animate-scale-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{isEdit ? "E'lonni tahrirlash" : "Yangi e'lon"}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Yopish">
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {formError && (
          <Alert variant="error" className="mb-4">
            {formError}
          </Alert>
        )}

        <div className="space-y-4">
          {!isEdit && (
            <Field id="companyId" label="Kompaniya" required errors={fieldErrors.companyId}>
              <Select
                id="companyId"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                options={companies.map((company) => ({ value: company.id, label: company.name }))}
                disabled={isSaving}
              />
            </Field>
          )}

          <Field id="title" label="Lavozim" required errors={fieldErrors.title}>
            <Input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Masalan: Sotuvchi-konsultant"
              hasError={Boolean(fieldErrors.title)}
              disabled={isSaving}
            />
          </Field>

          <Field id="categoryId" label="Yo'nalish" required errors={fieldErrors.categoryId}>
            <Select
              id="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              placeholder="Tanlang"
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
              hasError={Boolean(fieldErrors.categoryId)}
              disabled={isSaving}
            />
          </Field>

          <Field
            id="description"
            label="Ish haqida"
            required
            hint="Nima qilish kerak, qanday talablar bor — kamida 30 belgi"
            errors={fieldErrors.description}
          >
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Vazifalar, talablar va sharoitlar"
              hasError={Boolean(fieldErrors.description)}
              disabled={isSaving}
            />
          </Field>

          <Field id="city" label="Shahar" required errors={fieldErrors.city}>
            <Input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Toshkent"
              hasError={Boolean(fieldErrors.city)}
              disabled={isSaving}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="employmentType" label="Bandlik">
              <Select
                id="employmentType"
                value={employmentType}
                onChange={(event) => setEmploymentType(event.target.value as EmploymentTypeName)}
                options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                disabled={isSaving}
              />
            </Field>

            <Field id="experienceLevel" label="Tajriba">
              <Select
                id="experienceLevel"
                value={experienceLevel}
                onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevelName)}
                options={Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => ({ value, label }))}
                disabled={isSaving}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="salaryMin" label="Maosh (dan)" errors={fieldErrors.salaryMinSom}>
              <Input
                id="salaryMin"
                inputMode="numeric"
                value={salaryMin}
                onChange={(event) => setSalaryMin(event.target.value)}
                placeholder="so'm"
                hasError={Boolean(fieldErrors.salaryMinSom)}
                disabled={isSaving}
              />
            </Field>

            <Field id="salaryMax" label="Maosh (gacha)" errors={fieldErrors.salaryMaxSom}>
              <Input
                id="salaryMax"
                inputMode="numeric"
                value={salaryMax}
                onChange={(event) => setSalaryMax(event.target.value)}
                placeholder="so'm"
                hasError={Boolean(fieldErrors.salaryMaxSom)}
                disabled={isSaving}
              />
            </Field>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Maoshni bo&apos;sh qoldirsangiz, e&apos;londa &quot;Kelishilgan&quot; deb ko&apos;rinadi.
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Bekor qilish
          </Button>
          <Button onClick={save} isLoading={isSaving} loadingText="Saqlanmoqda...">
            {isEdit ? 'Saqlash' : 'Joylash'}
          </Button>
        </div>
      </div>
    </div>
  );
}
