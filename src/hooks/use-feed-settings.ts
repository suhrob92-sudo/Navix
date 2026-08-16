'use client';

import { useCallback, useEffect, useState } from 'react';

import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import type { FeedSettingsInput } from '@/modules/feed/settings.schemas';
import { DEFAULT_FEED_SETTINGS, type FeedSettingsView } from '@/modules/feed/settings.types';

export interface FeedSettingsState {
  settings: FeedSettingsView;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  /** Bitta yoki bir nechta sozlamani o'zgartiradi. */
  save: (patch: FeedSettingsInput) => Promise<void>;
  /** Tavsiyalarni noldan boshlaydi. */
  reset: () => Promise<void>;
}

/**
 * Feed sozlamalari — beshta ekran uchun umumiy.
 *
 * ── Nima uchun alohida hook ───────────────────────────────────────────
 * Sozlamalar beshta sahifaga bo'lingan va hammasida ketma-ketlik bir
 * xil: o'qi → tugmani bos → yubor → xatoni ko'rsat.
 *
 * Har sahifada qayta yozilsa, ertaga "saqlanmoqda" ko'rsatkichi
 * qo'shilganda beshta joyni tahrirlash kerak bo'lardi va bittasi
 * albatta unutilardi.
 *
 * ── Nima uchun "saqlash" tugmasi YO'Q ─────────────────────────────────
 * Sozlama tugmasi bosilishi bilan yuboriladi. "Saqlash" tugmasi
 * bo'lsa, odam uni bosmasdan chiqib ketardi va o'zgarishi yo'qolardi —
 * telefonda bu juda tez-tez uchraydi.
 */
export function useFeedSettings(): FeedSettingsState {
  const request = useApiClient();

  const [settings, setSettings] = useState<FeedSettingsView>(DEFAULT_FEED_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    request<{ settings: FeedSettingsView }>('/api/v1/feed/settings')
      .then((result) => {
        if (isActive) setSettings(result.settings);
      })
      .catch((caught) => {
        if (isActive) setError(toUserMessage(caught));
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [request]);

  const save = useCallback(
    async (patch: FeedSettingsInput) => {
      /**
       * Ekran DARHOL o'zgaradi.
       *
       * Server javobini kutsak, sekin internetda tugma bir soniya jim
       * turardi va odam uni ikkinchi marta bosardi.
       */
      const previous = settings;

      setSettings((current) => ({ ...current, ...patch }) as FeedSettingsView);
      setIsSaving(true);
      setError(null);

      try {
        const result = await request<{ settings: FeedSettingsView }>('/api/v1/feed/settings', {
          method: 'PATCH',
          body: patch,
        });

        // Server javobi USTUN: u qoidalarni qo'llagan bo'lishi mumkin
        // (masalan "qizig'i emas" ga qo'shilgan bo'lim qiziqishlardan
        // olib tashlanadi).
        setSettings(result.settings);
      } catch (caught) {
        setSettings(previous);
        setError(toUserMessage(caught));
      } finally {
        setIsSaving(false);
      }
    },
    [request, settings],
  );

  const reset = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await request<{ settings: FeedSettingsView }>('/api/v1/feed/settings/reset', {
        method: 'POST',
        body: {},
      });

      setSettings(result.settings);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }, [request]);

  return { settings, isLoading, isSaving, error, save, reset };
}
