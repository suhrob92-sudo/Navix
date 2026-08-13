'use client';

import { cn } from '@/lib/utils';

export interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

/**
 * Admin ro'yxatlaridagi filtr tugmasi.
 *
 * Alohida fayl: bir xil tugma to'rtta sahifada kerak bo'ladi va har
 * birida nusxa ko'chirilsa, ular vaqt o'tib bir-biridan farq qila
 * boshlardi (biri yumaloq, biri burchakli).
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
        'shrink-0 snap-start rounded-full border px-4 py-2 text-sm font-medium transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-secondary',
      )}
    >
      {label}
    </button>
  );
}
