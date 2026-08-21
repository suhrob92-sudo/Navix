'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface FilterChipProps {
  /**
   * Tugmadagi yozuv.
   *
   * `ReactNode` — chunki ba'zi joyda yozuv yoniga son ham qo'yiladi
   * ("Ochiq 3"). Uni `string` qilib qo'ysak, o'sha joy yagona
   * komponentdan tashqarida qolib, yana nusxa ko'chirilardi.
   */
  label: ReactNode;
  active: boolean;
  onClick: () => void;
}

/**
 * Ro'yxatlar ustidagi filtr tugmasi ("chip").
 *
 * ── Nima uchun bu YAGONA komponent ────────────────────────────────────
 * Bu tugma ilovaning 22 ta joyida ishlatiladi: buyurtmalar,
 * xabarlar, qidiruv, ovqat, admin ro'yxatlari, sotuvchi va ish
 * beruvchi kabinetlari.
 *
 * Ilgari u faqat admin bo'limida komponent edi, qolgan joylarda esa
 * QO'LDA nusxa ko'chirilgan bir xil `<button>` turardi. Natijasi
 * 24-bosqichda ko'rindi: barmoq nishonini kattalashtirish uchun
 * yigirma ikkita faylni tahrirlash kerak bo'ldi va ulardan biri
 * unutilsa, hech kim sezmasdi.
 *
 * Endi o'zgarish bitta joyda.
 *
 * ── Nima uchun `min-h-11` ─────────────────────────────────────────────
 * Barmoq nishonining eng kam o'lchami — 44px (`config/touch.ts`).
 * Bu tugmalar suriladigan tasma ichida turadi, u yerda esa
 * ko'rinmas kengaytiruvchi qatlam KESILADI — shuning uchun
 * balandlik haqiqatdan 44px qilingan.
 *
 * `aria-pressed` — ekran o'quvchi uchun: u tugmaning bosilgan yoki
 * bosilmaganini rangdan bilmaydi.
 */
export function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary',
      )}
    >
      {label}
    </button>
  );
}
