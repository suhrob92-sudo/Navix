'use client';

import { Briefcase, ClipboardList, Search, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { VacancyCard } from '@/components/jobs/vacancy-card';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import {
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  VACANCY_SORTS,
  type EmploymentTypeName,
  type ExperienceLevelName,
  type JobCategoriesResponse,
  type VacanciesResponse,
  type VacancySort,
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
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [sort, setSort] = useState<VacancySort>('new');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const categories = useApiQuery<JobCategoriesResponse>('/api/v1/jobs/categories');
  const cities = useApiQuery<CitiesResponse>('/api/v1/jobs/cities');

  const params = useMemo(() => {
    const result = new URLSearchParams({ pageSize: String(PAGE_SIZE), sort });

    if (query) result.set('search', query);
    if (category) result.set('category', category);
    if (city) result.set('city', city);
    if (employmentType) result.set('employmentType', employmentType);
    if (experienceLevel) result.set('experienceLevel', experienceLevel);

    return result.toString();
  }, [query, category, city, employmentType, experienceLevel, sort]);

  const { data, isLoading, error } = useApiQuery<VacanciesResponse>(`/api/v1/jobs/vacancies?${params}`);

  const vacancies = data?.vacancies ?? [];
  const activeFilters = [category, city, employmentType, experienceLevel].filter(Boolean).length;

  function resetFilters() {
    setCategory('');
    setCity('');
    setEmploymentType('');
    setExperienceLevel('');
  }

  return (
    <>
      <AppHeader title="Ish qidirish" />

      <div className="px-4 pt-4">
        {/* Qidiruv */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
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
                onClick={() => setSort(option.value)}
                aria-pressed={sort === option.value}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  sort === option.value ? 'border-primary text-primary' : 'border-border text-muted-foreground',
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
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Barcha yo'nalishlar"
              options={(categories.data?.categories ?? []).map((item) => ({
                value: item.slug,
                label: `${item.name} (${item.vacancyCount})`,
              }))}
            />

            <Select
              aria-label="Shahar"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Barcha shaharlar"
              options={(cities.data?.cities ?? []).map((item) => ({ value: item, label: item }))}
            />

            <Select
              aria-label="Bandlik turi"
              value={employmentType}
              onChange={(event) => setEmploymentType(event.target.value)}
              placeholder="Har qanday bandlik"
              options={Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => ({
                value: value as EmploymentTypeName,
                label,
              }))}
            />

            <Select
              aria-label="Tajriba"
              value={experienceLevel}
              onChange={(event) => setExperienceLevel(event.target.value)}
              placeholder="Har qanday tajriba"
              options={Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => ({
                value: value as ExperienceLevelName,
                label,
              }))}
            />

            {activeFilters > 0 && (
              <Button variant="ghost" size="sm" fullWidth onClick={resetFilters}>
                <X className="size-4" aria-hidden="true" />
                Filtrlarni tozalash
              </Button>
            )}
          </div>
        )}

        {/* Arizalarim */}
        <Link
          href="/jobs/applications"
          className="bg-card border-border mt-4 flex items-center gap-3 rounded-2xl border p-3.5 transition-transform active:scale-[0.99]"
        >
          <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
            <ClipboardList className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium">Mening arizalarim</span>
        </Link>

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
                query || activeFilters > 0
                  ? "Shartlarni yumshatib ko'ring — filtrni tozalang yoki boshqa so'z yozing."
                  : "Hozircha e'lon yo'q. Tez orada yangilari qo'shiladi."
              }
            />
          )}

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
