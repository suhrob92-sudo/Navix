'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { favoritePath, type FavoriteTarget } from '@/config/favorite';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { emptyFavoriteIds, type FavoriteIdsResponse } from '@/modules/favorite/favorite.types';

/**
 * Sevimlilar holati — butun ilova uchun BITTA joyda.
 *
 * ── Nima uchun qolipda, kartochkada emas ──────────────────────────────
 * Yurakcha katalogdagi HAR BIR kartochkada turadi. Agar har biri
 * o'zi "bu sevimlimi?" deb so'rasa, 40 mahsulotli sahifa 40 ta
 * so'rov yuborardi va mobil internetda u ochilmay qolardi.
 *
 * Bu yerda esa so'rov BITTA: ilova ochilganda saqlangan ID'lar bir
 * marta olinadi va barcha yurakchalar shu ro'yxatdan bo'yaladi.
 *
 * ── Nima uchun DARHOL bo'yaladi ───────────────────────────────────────
 * Yurakcha bosilganda javob kutilmaydi — belgi darhol o'zgaradi.
 * Mobil internetda javob 300-800 ms keladi va shuncha vaqt
 * qimirlamagan tugma "ishlamadi" degan taassurot qoldiradi.
 *
 * Server rad etsa, belgi ORQAGA qaytariladi.
 */

export interface FavoritesContextValue {
  /** Ro'yxat yuklandimi. Yuklanmaguncha yurakchalar bo'sh turadi. */
  isReady: boolean;
  isFavorite: (target: FavoriteTarget, targetId: string) => boolean;
  /** Holatni almashtiradi. Xato bo'lsa matn qaytadi. */
  toggle: (target: FavoriteTarget, targetId: string) => Promise<string | null>;
  /** Shu turdagi saqlanganlar soni. */
  countOf: (target: FavoriteTarget) => number;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const request = useApiClient();

  const { data, setData } = useApiQuery<FavoriteIdsResponse>('/api/v1/favorites/ids');

  /**
   * Ro'yxat TO'PLAMGA aylantiriladi.
   *
   * Massivda qidirish har bir kartochka uchun butun ro'yxatni
   * ko'zdan kechirardi: 40 kartochka × 200 yozuv = 8000 taqqoslash,
   * va bu har bir qayta chizishda takrorlanardi.
   */
  const sets = useMemo(() => {
    const ids = data?.ids ?? emptyFavoriteIds();

    return {
      PRODUCT: new Set(ids.PRODUCT),
      MENU_ITEM: new Set(ids.MENU_ITEM),
      RESTAURANT: new Set(ids.RESTAURANT),
      HOTEL: new Set(ids.HOTEL),
      VACANCY: new Set(ids.VACANCY),
    } satisfies Record<FavoriteTarget, Set<string>>;
  }, [data]);

  /**
   * Hozir yuborilayotgan so'rovlar.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Odam yurakchani tez ikki marta bossa, ikkita so'rov ketardi va
   * ular teskari tartibda kelishi mumkin edi. Natijada belgi
   * haqiqatga zid holatda qolardi.
   */
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  const isFavorite = useCallback(
    (target: FavoriteTarget, targetId: string) => sets[target].has(targetId),
    [sets],
  );

  const countOf = useCallback((target: FavoriteTarget) => sets[target].size, [sets]);

  const toggle = useCallback(
    async (target: FavoriteTarget, targetId: string): Promise<string | null> => {
      const key = `${target}:${targetId}`;

      if (pending.has(key)) return null;

      const wasFavorite = sets[target].has(targetId);

      /** Belgi DARHOL o'zgaradi — javob kutilmaydi. */
      const apply = (isFavoriteNow: boolean) => {
        setData((current) => {
          const ids = current?.ids ?? emptyFavoriteIds();
          const list = ids[target];

          return {
            ids: {
              ...ids,
              [target]: isFavoriteNow
                ? [...new Set([...list, targetId])]
                : list.filter((id) => id !== targetId),
            },
          };
        });
      };

      apply(!wasFavorite);
      setPending((current) => new Set(current).add(key));

      try {
        await request(favoritePath(target, targetId), {
          method: wasFavorite ? 'DELETE' : 'POST',
        });

        return null;
      } catch (caught) {
        // Server rad etdi — belgi ORQAGA qaytariladi.
        apply(wasFavorite);

        return toUserMessage(caught);
      } finally {
        setPending((current) => {
          const next = new Set(current);

          next.delete(key);

          return next;
        });
      }
    },
    [pending, request, sets, setData],
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({ isReady: data !== null, isFavorite, toggle, countOf }),
    [countOf, data, isFavorite, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

/**
 * Sevimlilar holatini o'qiydi.
 *
 * ── Nima uchun xato TASHLAMAYDI ───────────────────────────────────────
 * Yurakcha kirmagan odam ko'radigan sahifada ham chizilishi mumkin
 * (masalan ochiq mahsulot sahifasida). U yerda qolip bo'lmaydi va
 * xato tashlansa butun sahifa qulardi.
 *
 * `null` esa "sevimlilar mavjud emas" degani va tugma o'zini
 * shunga qarab tutadi.
 */
export function useFavorites(): FavoritesContextValue | null {
  return useContext(FavoritesContext);
}
