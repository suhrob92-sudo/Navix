'use client';

import { useState } from 'react';

import { FeedOnboarding } from '@/components/feed/feed-onboarding';
import { useApiQuery } from '@/hooks/use-api';
import type { FeedSettingsView } from '@/modules/feed/settings.types';

/**
 * Birinchi kirishda tanishtiruvni ko'rsatadi.
 *
 * ── Nima uchun QOLIP darajasida ───────────────────────────────────────
 * Odam Feed'ga faqat "Asosiy" orqali kirmaydi: havola bo'yicha
 * to'g'ridan-to'g'ri videoga yoki profilga tushishi mumkin. Tekshiruv
 * bitta sahifada tursa, u yo'llarda tanishtiruv o'tkazib yuborilardi.
 *
 * ── Nima uchun sahifa KUTMAYDI ────────────────────────────────────────
 * Sozlamalar so'rovi tugagunicha butun Feed'ni to'xtatib turish ham
 * mumkin edi. Lekin unda TAKRORIY kirishlarda ham (ya'ni deyarli
 * har doim) ekran bir soniya bo'sh turardi.
 *
 * Shuning uchun sahifa darhol chiziladi, tanishtiruv esa javob
 * kelgach ustiga ochiladi. Yangi odam buni sezmaydi — u baribir
 * bo'sh lentaga qarab turgan bo'lardi.
 */
export function FeedOnboardingGate() {
  const { data } = useApiQuery<{ settings: FeedSettingsView }>('/api/v1/feed/settings');

  /**
   * Tugagach oyna DARHOL yopiladi.
   *
   * Server javobini qayta so'rashni kutsak, tanishtiruv tugab,
   * video sahifasi ochilgach ham u bir zum ko'rinib turardi.
   */
  const [isDone, setIsDone] = useState(false);

  if (isDone || !data) return null;
  if (data.settings.feedOnboardedAt !== null) return null;

  return <FeedOnboarding onDone={() => setIsDone(true)} />;
}
