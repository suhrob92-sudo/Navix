'use client';

import { Bookmark, Briefcase, ClipboardList, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { VacancyCard } from '@/components/jobs/vacancy-card';
import { RecentRow } from '@/components/recent/recent-row';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import {
  SALARY_STEPS,
  activeJobFilterCount,
  describeJobFilters,
  salaryRangeError,
} from '@/config/job-filters';
import { formatCompactTiyin } from '@/lib/money';
import { useJobFilters } from '@/modules/job/use-job-filters';
import { cn } from '@/lib/utils';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  VACANCY_SORTS,
  type EmploymentTypeName,
  type ExperienceLevelName,
  type JobCategoriesResponse,
  type VacanciesResponse,
} from '@/modules/job/job.types';

const PAGE_SIZE = 20;

interface CitiesResponse {
  cities: string[];
}

/**
 * Ish qidirish — asosiy sahifa.
 *
 * ── Nima uchun filtrlar YASHIRIN ──────────────────────────────────────
 * Telefon ekrani tor. Beshta filtrni doim ko'rsatish e'lonlarni pastga
 * surib yuboradi va foydalanuvchi asosiy narsani — vakansiyalarni —
 * ko'rmaydi.
 *
 * Shuning uchun ochiladigan panel. Tanlangan filtrlar soni tugmada
 * ko'rinadi, ya'ni panel yopiq bo'lsa ham "nima yoqilganini" bilib
 * turadi.
 */
export function JobsContent() {
  const { filters, update, clearOne, clearAll, queryString } = useJobFilters();

  const [search, setSearch] = useState(filters.search ?? '');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [minText, setMinText] = useState(
    filters.minSalarySom === undefined ? '' : String(filters.minSalarySom),
  );
  const [maxText, setMaxText] = useState(
    filters.maxSalarySom === undefined ? '' : String(filters.maxSalarySom),
  );

  const categories = useApiQuery<JobCategoriesResponse>('/api/v1/jobs/categories');
  const cities = useApiQuery<CitiesResponse>('/api/v1/jobs/cities');

  const params = useMemo(() => {
    const result = new URLSearchParams(queryString);

    result.set('pageSize', String(PAGE_SIZE));

    return result.toString();
  }, [queryString]);

  const { data, isLoading, error } = useApiQuery<VacanciesResponse>(`/api/v1/jobs/vacancies?${params}`);

  const vacancies = data?.vacancies ?? [];
  const activeFilters = activeJobFilterCount(filters);
  const rangeError = salaryRangeError(filters);
  const chips = describeJobFilters(filters, (value) => formatCompactTiyin(value * 100));

  /** Matn maydonidan songa — bo'sh yoki yaroqsiz bo'lsa `undefined`. */
  const toNumber = (value: string): number | undefined => {
    const trimmed = value.trim();

    if (trimmed === '') return undefined;

    const parsed = Number(trimmed);

    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };

  /*
    ── Maosh maydoni FOKUSDAN chiqqanda qo'llanadi ─────────────────────
    Har bosilgan raqamda so'rov yuborilsa, "5000000" yozayotgan odam
    yettita so'rov yuborardi va ro'yxat har safar miltillardi.
  */
  const applySalary = () => {
    update({ minSalarySom: toNumber(minText), maxSalarySom: toNumber(maxText) });
  };

  function resetFilters() {
    setMinText('');
    setMaxText('');
    clearAll();
  }

  return (
    <>
      <AppHeader title="Ish qidirish" />

      <div className="px-4 pt-4">
        {/* Qidiruv */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: search.trim() || undefined });
          }}
          className="relative"
        >
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Lavozim yoki kompaniya"
            aria-label="Vakansiya qidirish"
            className="pl-10"
          />
        </form>

        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFilterOpen((current) => !current)}
            aria-expanded={isFilterOpen}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtr
            {activeFilters > 0 && (
              <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 text-xs tabular-nums">
                {activeFilters}
              </span>
            )}
          </Button>

          <div className="ml-auto flex gap-1">
            {VACANCY_SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ sort: option.value })}
                aria-pressed={filters.sort === option.value}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  filters.sort === option.value ? 'border-primary text-primary' : 'border-border text-muted-foreground',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {isFilterOpen && (
          <div className="bg-card border-border animate-fade-up mt-3 space-y-3 rounded-2xl border p-4">
            <Select
              aria-label="Yo'nalish"
              value={filters.category ?? ''}
              onChange={(event) => update({ category: event.target.value || undefined })}
              placeholder="Barcha yo'nalishlar"
              options={(categories.data?.categories ?? []).map((item) => ({
                value: item.slug,
                label: `${item.name} (${item.vacancyCount})`,
              }))}
            />

            <Select
              aria-label="Shahar"
              value={filters.city ?? ''}
              onChange={(event) => update({ city: event.target.value || undefined })}
              placeholder="Barcha shaharlar"
              options={(cities.data?.cities ?? []).map((item) => ({ value: item, label: item }))}
            />

            <Select
              aria-label="Bandlik turi"
              value={filters.employmentType ?? ''}
              onChange={(event) => update({ employmentType: event.target.value || undefined })}
              placeholder="Har qanday bandlik"
              options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({
                value: value as EmploymentTypeName,
                label,
              }))}
            />

            <Select
              aria-label="Tajriba"
              value={filters.experienceLevel ?? ''}
              onChange={(event) => update({ experienceLevel: event.target.value || undefined })}
              placeholder="Har qanday tajriba"
              options={Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => ({
                value: value as ExperienceLevelName,
                label,
              }))}
            />

            {/*
              ── Maosh ────────────────────────────────────────────────
              Ish qidirayotgan odamning BIRINCHI savoli shu. Server
              tomonida filtr allaqachon bor edi, lekin ekranda yo'q
              edi — ya'ni imkoniyat bor, foydalanuvchi esa undan
              xabarsiz.
            */}
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">Maosh (so&apos;m)</p>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  inputMode="numeric"
                  aria-label="Eng kam maosh"
                  placeholder="Eng kam"
                  value={minText}
                  onChange={(event) => setMinText(event.target.value.replace(/\D/g, ''))}
                  onBlur={applySalary}
                  hasError={rangeError !== null}
                />

                <Input
                  inputMode="numeric"
                  aria-label="Eng ko'p maosh"
                  placeholder="Eng ko'p"
                  value={maxText}
                  onChange={(event) => setMaxText(event.target.value.replace(/\D/g, ''))}
                  onBlur={applySalary}
                  hasError={rangeError !== null}
                />
              </div>

              {rangeError && (
                <Alert variant="warning" className="mt-2">
                  {rangeError}
                </Alert>
              )}

              {/*
                ── Tayyor tugmalar ────────────────────────────────────
                Yetti xonali sonni telefonda terish uzoq ish. Tayyor
                chegara — bitta bosish.
              */}
              <div className="mt-2 flex flex-wrap gap-2">
                {SALARY_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      setMinText(String(step));
                      update({ minSalarySom: step });
                    }}
                    aria-pressed={filters.minSalarySom === step}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      filters.minSalarySom === step
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {`${formatCompactTiyin(step * 100)} dan`}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" fullWidth onClick={resetFilters}>
                <X className="size-4" aria-hidden="true" />
                Filtrlarni tozalash
              </Button>
            )}
          </div>
        )}

        {/*
          ── Yoqilgan filtrlar qatori ────────────────────────────────
          Tugmadagi son "uchtasi yoqilgan" deydi, lekin QAYSILARI
          ekanini aytmaydi. Odam esa odatda bittasini olib
          tashlamoqchi bo'ladi.
        */}
        {chips.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  if (chip.key === 'minSalarySom') setMinText('');
                  if (chip.key === 'maxSalarySom') setMaxText('');
                  clearOne(chip.key);
                }}
                aria-label={`${chip.label} — filtrni olib tashlash`}
                className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              >
                {chip.label}
                <X className="size-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href="/jobs/applications"
            className="bg-card border-border flex items-center gap-2.5 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]"
          >
            <span className="bg-primary/10 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              <ClipboardList className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm leading-tight font-medium">Arizalarim</span>
          </Link>

          {/*
            ── Saqlangan vakansiyalar ──────────────────────────────
            Saqlash imkoniyati allaqachon bor edi (har kartochkada
            yurakcha), lekin saqlanganlarni KO'RISH uchun umumiy
            "Sevimlilar" sahifasini topish kerak edi.

            Ish qidirayotgan odam esa vakansiyani aynan keyinroq
            qaytib ko'rish uchun saqlaydi — havola shu yerda
            turishi kerak.
          */}
          <Link
            href="/favorites"
            className="bg-card border-border flex items-center gap-2.5 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]"
          >
            <span className="bg-primary/10 text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Bookmark className="size-4.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm leading-tight font-medium">Saqlanganlar</span>
          </Link>
        </div>

        {/* Ro'yxat */}
        <div className="mt-4">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-40 rounded-2xl" />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <Alert variant="error" title="Vakansiyalarni yuklab bo'lmadi">
              {error}
            </Alert>
          )}

          {!isLoading && !error && vacancies.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title="Vakansiya topilmadi"
              description={
                filters.search || activeFilters > 0
                  ? "Shartlarni yumshatib ko'ring — filtrni tozalang yoki boshqa so'z yozing."
                  : "Hozircha e'lon yo'q. Tez orada yangilari qo'shiladi."
              }
            />
          )}

          <RecentRow target="VACANCY" className="mb-5" />

          {!isLoading && !error && vacancies.length > 0 && (
            <>
              <p className="text-muted-foreground mb-3 text-sm">{`${data?.total ?? vacancies.length} ta vakansiya`}</p>

              <ul className="space-y-2">
                {vacancies.map((vacancy, index) => (
                  <li key={vacancy.id}>
                    <VacancyCard vacancy={vacancy} index={index} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
