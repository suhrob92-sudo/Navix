'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError, apiRequest, toUserMessage } from '@/lib/api-client';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * Himoyalangan API'ga murojaat qilish uchun hook'lar.
 *
 * Nima uchun kerak: har bir sahifada token qo'shish, 401 xatoligida
 * token yangilash va qayta urinish kodini yozib chiqish o'rniga
 * shu yerda bir marta yozamiz.
 */

/** Token bilan so'rov yuboruvchi funksiyani qaytaradi. */
export function useApiClient() {
  const { accessToken, refresh } = useAuth();

  /**
   * So'rov yuboradi. Agar token eskirgan bo'lsa (401), uni yangilab
   * BIR MARTA qayta urinadi — foydalanuvchi buni sezmaydi ham.
   */
  return useCallback(
    async <TData>(path: string, options: Omit<Parameters<typeof apiRequest>[1], 'accessToken'> = {}) => {
      try {
        return await apiRequest<TData>(path, { ...options, accessToken });
      } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
          const freshToken = await refresh();

          if (freshToken) {
            return apiRequest<TData>(path, { ...options, accessToken: freshToken });
          }
        }

        throw error;
      }
    },
    [accessToken, refresh],
  );
}

export interface QueryState<TData> {
  data: TData | null;
  isLoading: boolean;
  error: string | null;
  /** Ma'lumotni qaytadan yuklaydi. */
  reload: () => void;
  /** Ma'lumotni serverga murojaat qilmasdan yangilaydi (optimistik yangilash). */
  setData: (updater: TData | ((current: TData | null) => TData)) => void;
}

export interface QueryOptions {
  /**
   * Shuncha millisekunddan keyin ma'lumot avtomatik yangilanadi.
   *
   * Faqat kerak bo'lgan joyda yoqing: har bir so'rov mobil internetda
   * trafik va batareya sarflaydi. Masalan o'qilmagan xabarlar soni uchun
   * mos, lekin uzun ro'yxatlar uchun emas.
   */
  refreshIntervalMs?: number;
}

/**
 * Sahifa ochilganda ma'lumot yuklaydigan hook.
 *
 * @param path API manzili. `null` bo'lsa so'rov yuborilmaydi
 *             (masalan foydalanuvchi hali aniqlanmagan bo'lsa).
 * @param options Qo'shimcha sozlamalar (avtomatik yangilash).
 */
export function useApiQuery<TData>(path: string | null, options: QueryOptions = {}): QueryState<TData> {
  const request = useApiClient();
  const { isLoading: isAuthLoading } = useAuth();

  const [data, setDataState] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // Komponent yopilgandan keyin holat yangilanmasligi uchun.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Autentifikatsiya tekshiruvi tugamaguncha kutamiz.
    if (isAuthLoading || !path) return;

    let cancelled = false;

    async function load() {
      try {
        const result = await request<TData>(path!);
        if (!cancelled && isMountedRef.current) {
          setDataState(result);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled && isMountedRef.current) {
          setError(toUserMessage(caught));
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [path, request, reloadCount, isAuthLoading]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setReloadCount((count) => count + 1);
  }, []);

  /**
   * Davriy yangilash.
   *
   * `reload` dan farqi: `isLoading` yoqilmaydi — aks holda har safar
   * skeletonlar miltillab, ekran bezovta qilardi.
   */
  const { refreshIntervalMs } = options;

  useEffect(() => {
    if (!refreshIntervalMs || !path) return;

    const timer = setInterval(() => setReloadCount((count) => count + 1), refreshIntervalMs);

    return () => clearInterval(timer);
  }, [refreshIntervalMs, path]);

  const setData = useCallback((updater: TData | ((current: TData | null) => TData)) => {
    setDataState((current) =>
      typeof updater === 'function' ? (updater as (c: TData | null) => TData)(current) : updater,
    );
  }, []);

  return { data, isLoading, error, reload, setData };
}
