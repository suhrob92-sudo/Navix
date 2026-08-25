'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  clearHotelFilter,
  emptyHotelFilters,
  hotelFiltersToParams,
  paramsToHotelFilters,
  type HotelFilterKey,
  type HotelFilters,
} from '@/config/hotel-filters';

/**
 * Mehmonxona filtrlari — MANZIL bilan bog'langan holat.
 *
 * ── Nima uchun `useState` EMAS ────────────────────────────────────────
 * Sabab `use-product-filters.ts` dagi bilan bir xil va mehmonxonada
 * u yanada og'irroq: odam odatda uch-to'rt mehmonxonani ochib,
 * ORQAGA qaytib solishtiradi. Har safar filtr yo'qolsa, u yettita
 * shartni qaytadan tanlashi kerak bo'lardi.
 *
 * ── Nima uchun SANALAR bu yerda emas ──────────────────────────────────
 * Kirish va chiqish sanalari ham manzilda yuradi, lekin ular
 * FILTR emas: ular narxni va bo'sh joyni hisoblash uchun kerak
 * va ularsiz sahifa ma'nosini yo'qotadi.
 *
 * Ularni filtrlar qatoriga qo'shish "sanani olib tashlash" degan
 * tugma yasardi — bunday amal yo'q.
 */

export interface HotelFiltersState {
  filters: HotelFilters;
  /** Butun filtrlar to'plamini almashtiradi (oyna "Ko'rsatish" tugmasi). */
  apply: (next: HotelFilters) => void;
  /** Bir nechta maydonni birga o'zgartiradi. */
  update: (patch: Partial<HotelFilters>) => void;
  /** Bitta filtrni olib tashlaydi. Qulaylik uchun `value` beriladi. */
  clearOne: (key: HotelFilterKey, value?: string) => void;
  /** Saralashdan tashqari hammasini tozalaydi. */
  clearAll: () => void;
  /** So'rov satri — API manzilini yasash uchun. */
  queryString: string;
}

export function useHotelFilters(): HotelFiltersState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo<HotelFilters>(
    () => paramsToHotelFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  /*
    ── Nima uchun `replace`, `push` EMAS ───────────────────────────────
    Har bir filtr bosilganda tarixga yozuv qo'shilsa, odam "orqaga"
    tugmasini o'n marta bosishi kerak bo'lardi — u esa mehmonxona
    sahifasidan ro'yxatga qaytishni kutayotgan bo'ladi.
  */
  const write = useCallback(
    (next: HotelFilters) => {
      const search = hotelFiltersToParams(next).toString();

      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const apply = useCallback((next: HotelFilters) => write(next), [write]);

  const update = useCallback(
    (patch: Partial<HotelFilters>) => write({ ...filters, ...patch }),
    [filters, write],
  );

  const clearOne = useCallback(
    (key: HotelFilterKey, value?: string) => write(clearHotelFilter(filters, key, value)),
    [filters, write],
  );

  const clearAll = useCallback(() => {
    /*
      Saralash va QIDIRUV saqlanadi.

      "Tozalash" tugmasi shartlarni olib tashlaydi, lekin odam
      yozgan so'zni ham o'chirib yuborsa, u nimani izlayotganini
      qaytadan yozishi kerak bo'lardi.
    */
    write({ ...emptyHotelFilters(), sort: filters.sort, search: filters.search });
  }, [filters.search, filters.sort, write]);

  const queryString = useMemo(() => hotelFiltersToParams(filters).toString(), [filters]);

  return { filters, apply, update, clearOne, clearAll, queryString };
}
