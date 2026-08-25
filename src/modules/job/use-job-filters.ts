'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  clearJobFilter,
  emptyJobFilters,
  jobFiltersToParams,
  paramsToJobFilters,
  type JobFilterKey,
  type JobFilters,
} from '@/config/job-filters';

/**
 * Vakansiya filtrlari — MANZIL bilan bog'langan holat.
 *
 * ── Nima uchun `useState` EMAS ────────────────────────────────────────
 * Ish qidirish bir kunda tugamaydi. Odam o'nlab e'lonni ochib,
 * ORQAGA qaytib solishtiradi va ertaga yana qaytadi.
 *
 * Oddiy holat bilan har safar filtrlar tozalanardi va u yettita
 * shartni qaytadan tanlashi kerak bo'lardi. Ikki-uch martadan
 * keyin odam qidiruvni tashlab yuboradi.
 *
 * Manzil esa buni bepul hal qiladi: havolani saqlab qo'yish ham,
 * do'stga yuborish ham mumkin.
 */

export interface JobFiltersState {
  filters: JobFilters;
  /** Butun to'plamni almashtiradi. */
  apply: (next: JobFilters) => void;
  /** Bir nechta maydonni birga o'zgartiradi. */
  update: (patch: Partial<JobFilters>) => void;
  clearOne: (key: JobFilterKey) => void;
  /** Saralash va qidiruvdan tashqari hammasini tozalaydi. */
  clearAll: () => void;
  /** So'rov satri — API manzilini yasash uchun. */
  queryString: string;
}

export function useJobFilters(): JobFiltersState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<JobFilters>(
    () => paramsToJobFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  /*
    `replace`, `push` emas: har bir filtr bosilganda tarixga yozuv
    qo'shilsa, odam "orqaga" tugmasini o'n marta bosishi kerak
    bo'lardi — u esa vakansiyadan ro'yxatga qaytishni kutayotgan
    bo'ladi.
  */
  const write = useCallback(
    (next: JobFilters) => {
      const search = jobFiltersToParams(next).toString();

      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const apply = useCallback((next: JobFilters) => write(next), [write]);

  const update = useCallback(
    (patch: Partial<JobFilters>) => write({ ...filters, ...patch }),
    [filters, write],
  );

  const clearOne = useCallback(
    (key: JobFilterKey) => write(clearJobFilter(filters, key)),
    [filters, write],
  );

  const clearAll = useCallback(() => {
    /*
      Saralash va QIDIRUV so'zi saqlanadi: odam yozgan so'zni
      o'chirib yuborsak, u nimani izlayotganini qaytadan yozishi
      kerak bo'lardi.
    */
    write({ ...emptyJobFilters(), sort: filters.sort, search: filters.search });
  }, [filters.search, filters.sort, write]);

  const queryString = useMemo(() => jobFiltersToParams(filters).toString(), [filters]);

  return { filters, apply, update, clearOne, clearAll, queryString };
}
