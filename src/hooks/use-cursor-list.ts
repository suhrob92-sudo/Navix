'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { toUserMessage } from '@/lib/api-client';
import { useApiClient } from '@/hooks/use-api';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * Belgi (cursor) bilan sahifalanadigan ro'yxatlar uchun hook.
 *
 * ── Nima uchun `useApiQuery` yetarli emas ─────────────────────────────
 * `useApiQuery` manzil o'zgarganda ma'lumotni ALMASHTIRADI. Lentada
 * esa keyingi sahifa oldingisining USTIGA qo'shilishi kerak — aks
 * holda "yana yuklash" bosilganda ekran boshidan boshlanardi.
 */
export interface CursorListState<TItem> {
  items: TItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
  /** Ro'yxatni serverga murojaat qilmasdan o'zgartiradi. */
  setItems: (updater: (current: TItem[]) => TItem[]) => void;
}

/**
 * Yuklangan holat — MANZIL bilan birga saqlanadi.
 *
 * ── Nima uchun `key` ham holatda ─────────────────────────────────────
 * Bo'lim almashganda eski ro'yxat ekranda qolmasligi kerak: odam bir
 * zumga boshqa ro'yxatni ko'rgandek bo'lardi.
 *
 * Buni "manzil o'zgardi → ro'yxatni tozala" degan effekt bilan qilish
 * mumkin edi, lekin u ortiqcha qayta chizishga olib keladi (React
 * buni ataylab man qiladi). Manzil holat ichida turganda esa
 * "yuklanmoqda" holati HISOBLANADI: saqlangan manzil so'ralayotgan
 * manzilga teng bo'lmasa — demak hali yuklanmoqda.
 */
interface LoadedState<TItem> {
  key: string | null;
  items: TItem[];
  cursor: string | null;
  error: string | null;
}

/**
 * @param basePath Manzil belgisiz. `null` bo'lsa so'rov yuborilmaydi.
 * @param field Javobdagi ro'yxat maydonining nomi ("posts", "comments").
 */
export function useCursorList<TItem>(basePath: string | null, field: string): CursorListState<TItem> {
  const request = useApiClient();
  const { isLoading: isAuthLoading } = useAuth();

  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<LoadedState<TItem>>({
    key: null,
    items: [],
    cursor: null,
    error: null,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // `reload` bir xil manzilni qayta so'rashi uchun kalitga son qo'shiladi.
  const key = basePath ? `${basePath}#${reloadCount}` : null;
  const isSettled = state.key === key && key !== null;

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading || !basePath || !key) return;

    let cancelled = false;

    async function load() {
      try {
        const result = await request<Record<string, unknown>>(basePath!);

        if (cancelled || !isMountedRef.current) return;

        setState({
          key,
          items: (result[field] as TItem[]) ?? [],
          cursor: (result.nextCursor as string | null) ?? null,
          error: null,
        });
      } catch (caught) {
        if (cancelled || !isMountedRef.current) return;

        setState({ key, items: [], cursor: null, error: toUserMessage(caught) });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [basePath, key, field, request, isAuthLoading]);

  const loadMore = useCallback(() => {
    if (!basePath || !isSettled || !state.cursor || isLoadingMore) return;

    const separator = basePath.includes('?') ? '&' : '?';
    const path = `${basePath}${separator}cursor=${encodeURIComponent(state.cursor)}`;

    setIsLoadingMore(true);

    void (async () => {
      try {
        const result = await request<Record<string, unknown>>(path);

        if (!isMountedRef.current) return;

        const incoming = (result[field] as (TItem & { id: string })[]) ?? [];
        const nextCursor = (result.nextCursor as string | null) ?? null;

        setState((current) => {
          /**
           * Nusxalar tashlab yuboriladi.
           *
           * Ikkinchi sahifa yuklanayotgan payt yangi post qo'shilsa,
           * u ikkala sahifada ham bo'lishi mumkin. React esa bir xil
           * `key` uchun ogohlantirish beradi va ro'yxat buziladi.
           */
          const seen = new Set((current.items as (TItem & { id: string })[]).map((item) => item.id));

          return {
            ...current,
            items: [...current.items, ...incoming.filter((item) => !seen.has(item.id))] as TItem[],
            cursor: nextCursor,
            error: null,
          };
        });
      } catch (caught) {
        if (isMountedRef.current) {
          setState((current) => ({ ...current, error: toUserMessage(caught) }));
        }
      } finally {
        if (isMountedRef.current) setIsLoadingMore(false);
      }
    })();
  }, [basePath, field, isLoadingMore, isSettled, request, state.cursor]);

  const reload = useCallback(() => {
    setReloadCount((current) => current + 1);
  }, []);

  const setItems = useCallback((updater: (current: TItem[]) => TItem[]) => {
    setState((current) => ({ ...current, items: updater(current.items) }));
  }, []);

  return {
    items: isSettled ? state.items : [],
    isLoading: !isSettled && key !== null,
    isLoadingMore,
    error: isSettled ? state.error : null,
    hasMore: isSettled && state.cursor !== null,
    loadMore,
    reload,
    setItems,
  };
}
