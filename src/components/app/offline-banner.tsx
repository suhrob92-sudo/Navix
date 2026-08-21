'use client';

import { WifiOff } from 'lucide-react';

import { useIsOnline } from '@/lib/network-state';

/**
 * "Internet yo'q" tasmasi — ilovaning istalgan sahifasida.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Internet uzilganda ilova o'zi ochiq qoladi (kod keshda), lekin
 * yangi ma'lumot kelmaydi. Tugmalar bosiladi, hech narsa bo'lmaydi.
 *
 * Sababi aytilmasa, odam ILOVANI ayblaydi: "buzilib qoldi". Bir
 * qatorlik yozuv esa buni darhol hal qiladi.
 *
 * ── Nima uchun TEPADA, pastda emas ────────────────────────────────────
 * Pastda menyu, savat paneli va yozish maydoni turadi — u yer
 * allaqachon band. Tepa qismi esa bo'sh va ogohlantirish u yerda
 * mazmunni bosib qolmaydi.
 *
 * ── Nima uchun uni YOPIB bo'lmaydi ────────────────────────────────────
 * Bu xabar emas, HOLAT. U aloqa tiklanganda o'zi yo'qoladi.
 * Yopish tugmasi bo'lsa, odam uni yopib qo'yib, keyin nima uchun
 * hech narsa ishlamayotganini yana tushunmasdi.
 */
export function OfflineBanner() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning/15 text-foreground animate-fade-in fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium backdrop-blur-sm"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      Internet yo&apos;q — yangi ma&apos;lumot kelmayapti
    </div>
  );
}
