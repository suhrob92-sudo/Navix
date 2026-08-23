'use client';

import { useEffect, useRef } from 'react';

import { recentPath, type RecentTarget } from '@/config/recent';
import { useApiClient } from '@/hooks/use-api';
import { useAuth } from '@/modules/auth/auth-context';

/**
 * "Bu sahifa ko'rildi" deb belgilaydi.
 *
 * ── Nima uchun ko'rinmas komponent ────────────────────────────────────
 * Bu narsa ekranda hech narsa chizmaydi — u faqat sahifa ochilganini
 * serverga aytadi. Uni har bir sahifaning kodiga qo'lda yozish
 * mumkin edi, lekin unda beshta joyda bir xil kod turardi va
 * bittasida `useRef` qo'riqchisi unutilardi.
 *
 * ── Nima uchun `useRef` QO'RIQCHISI ───────────────────────────────────
 * React ishlab chiqish rejimida komponentni ATAYLAB ikki marta
 * chizadi (xatolarni topish uchun). Qo'riqchisiz har bir sahifa
 * ochilishi ikkita so'rov yuborardi.
 *
 * Bundan tashqari sahifa qayta chizilganda ham so'rov
 * takrorlanmaydi.
 *
 * ── Nima uchun xato YUTILADI ──────────────────────────────────────────
 * Bu so'rov foydalanuvchi uchun EMAS — u hech narsa kutmaydi va
 * natijani ko'rmaydi. Internet uzilgan bo'lsa yoki chegara
 * ishlagan bo'lsa, unga xato ko'rsatish faqat xalaqit berardi.
 *
 * Mahsulot sahifasi baribir ochilgan va ishlayapti.
 */

export interface RecentTrackerProps {
  target: RecentTarget;
  /** Narsa hali yuklanmagan bo'lsa `null` — so'rov yuborilmaydi. */
  targetId: string | null | undefined;
}

export function RecentTracker({ target, targetId }: RecentTrackerProps) {
  const request = useApiClient();
  const { isAuthenticated } = useAuth();

  /** Qaysi narsa uchun so'rov allaqachon yuborilgan. */
  const sentForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !targetId) return;

    const key = `${target}:${targetId}`;

    if (sentForRef.current === key) return;

    sentForRef.current = key;

    void request(recentPath(target, targetId), { method: 'POST' }).catch(() => {
      /*
        Jimgina o'tkazib yuboriladi.

        Xato bo'lsa qayta urinilmaydi ham: odam sahifani yana
        ochsa, u baribir belgilanadi.
      */
    });
  }, [isAuthenticated, request, target, targetId]);

  return null;
}
