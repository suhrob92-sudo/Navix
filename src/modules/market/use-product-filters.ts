'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  emptyFilters,
  filtersToParams,
  paramsToFilters,
  type FilterKey,
  type ProductFilters,
} from '@/config/product-filter';

/**
 * Katalog filtrlari — MANZIL bilan bog'langan holat.
 *
 * ── Nima uchun `useState` EMAS ────────────────────────────────────────
 * Oddiy holat kod jihatidan soddaroq bo'lardi, lekin:
 *
 *   1. mahsulotni ochib, ORQAGA qaytgan odam filtrlarini
 *      yo'qotardi va hammasini qaytadan tanlardi;
 *   2. "shu havolani ko'r" deb do'stiga yuborib bo'lmasdi;
 *   3. sahifa yangilanganda hammasi tozalanardi.
 *
 * Manzil esa bularning uchalasini ham bepul hal qiladi va
 * brauzerning o'z tugmalari ishlab ketadi.
 *
 * ── Nima uchun `replace`, `push` EMAS ─────────────────────────────────
 * Har bir filtr bosilganda tarixga yangi yozuv qo'shilsa, odam
 * "orqaga" tugmasini o'n marta bosishi kerak bo'lardi — u esa
 * mahsulotdan katalogga qaytishni kutayotgan bo'ladi.
 *
 * `replace` bilan tarixda bitta yozuv qoladi va "orqaga" o'sha
 * kutilgan joyga olib boradi.
 */

export interface ProductFiltersState {
  filters: ProductFilters;
  /** Bir nechta maydonni birga o'zgartiradi. */
  update: (patch: Partial<ProductFilters>) => void;
  /** Bitta filtrni olib tashlaydi. */
  clearOne: (key: keyof ProductFilters) => void;
  /** Saralashdan tashqari hammasini tozalaydi. */
  clearAll: () => void;
  /** So'rov satri — API manzilini yasash uchun. */
  queryString: string;
  /**
   * O'ZGARMAYDIGAN maydonlar.
   *
   * Ularni sanash va ularga "olib tashlash" belgisi chizish xato
   * bo'lardi — sabab `FilterKey` izohida.
   */
  fixedKeys: readonly FilterKey[];
}

export interface UseProductFiltersOptions {
  /**
   * Manzildan O'ZGARMAYDIGAN qiymatlar.
   *
   * Toifa sahifasida toifa manzilning o'zida turadi
   * (`/marketplace/c/telefon`) va uni filtr sifatida
   * o'zgartirib bo'lmaydi.
   */
  fixed?: Partial<ProductFilters>;
}

export function useProductFilters(options: UseProductFiltersOptions = {}): ProductFiltersState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fixed = options.fixed;

  const filters = useMemo<ProductFilters>(() => {
    const parsed = paramsToFilters(new URLSearchParams(searchParams.toString()));

    return { ...parsed, ...fixed };
  }, [searchParams, fixed]);

  const write = useCallback(
    (next: ProductFilters) => {
      const params = filtersToParams(next);

      /**
       * O'ZGARMAYDIGAN qiymatlar manzilga yozilmaydi.
       *
       * Toifa allaqachon manzil yo'lida bor
       * (`/marketplace/c/telefon`) va uni yana `?category=telefon`
       * deb takrorlash manzilni chalkash qilardi.
       */
      for (const key of Object.keys(fixed ?? {})) params.delete(key);

      const search = params.toString();

      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [fixed, pathname, router],
  );

  const update = useCallback(
    (patch: Partial<ProductFilters>) => {
      write({ ...filters, ...patch });
    },
    [filters, write],
  );

  const clearOne = useCallback(
    (key: keyof ProductFilters) => {
      const next = { ...filters };

      /**
       * Saralashni "tozalash" — uni boshlang'ich holatga
       * qaytarish demak: tartibsiz ro'yxat degan narsa yo'q.
       */
      if (key === 'sort') {
        next.sort = 'popular';
      } else {
        delete next[key];
      }

      write(next);
    },
    [filters, write],
  );

  const clearAll = useCallback(() => {
    /**
     * Saralash SAQLANADI.
     *
     * "Tozalash" tugmasi filtrlarni olib tashlaydi, lekin odam
     * tanlagan tartibni buzmaydi — u alohida qaror.
     */
    write({ ...emptyFilters(), sort: filters.sort, ...fixed });
  }, [filters.sort, fixed, write]);

  const queryString = useMemo(() => filtersToParams(filters).toString(), [filters]);

  /**
   * Faqat FILTR bo'la oladigan maydonlar qoladi.
   *
   * `search` va `category` bu ro'yxatda yo'q: ular hech qachon
   * sanalmaydi va ularga belgi ham chizilmaydi.
   */
  const fixedKeys = useMemo<readonly FilterKey[]>(
    () => Object.keys(fixed ?? {}).filter(isFilterKey),
    [fixed],
  );

  return { filters, update, clearOne, clearAll, queryString, fixedKeys };
}

const FILTER_KEYS: readonly string[] = [
  'minPriceSom',
  'maxPriceSom',
  'shop',
  'inStock',
  'hasDiscount',
  'minRating',
];

function isFilterKey(key: string): key is FilterKey {
  return FILTER_KEYS.includes(key);
}
