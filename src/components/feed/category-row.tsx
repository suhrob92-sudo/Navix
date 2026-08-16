'use client';

import { FEED_CATEGORIES, type FeedFilterValue } from '@/config/feed-nav';
import { cn } from '@/lib/utils';

export interface CategoryRowProps {
  value: FeedFilterValue;
  onChange: (value: FeedFilterValue) => void;
}

/**
 * Feed tepasidagi kategoriyalar qatori.
 *
 * ── Nima uchun GORIZONTAL surish ──────────────────────────────────────
 * O'n ikkita doira telefon ekraniga sig'maydi. Ularni ikki qatorga
 * yoysak, lentaning uchdan biri yo'qolardi — aynan shundan shikoyat
 * bo'lgan edi.
 *
 * Gorizontal qator esa bitta chiziqda qoladi va barmoq bilan
 * surilib ko'riladi.
 *
 * ── Nima uchun BELGI (emoji) bor ──────────────────────────────────────
 * Odam tez surayotganda matnni o'qimaydi — rangli belgini payqaydi.
 * Belgi bir qarashda "bu ovqat", "bu ish" deb aytadi.
 *
 * ── Nima uchun tanlangani KATTA farq bilan ajratiladi ─────────────────
 * Surilib turgan qatorda qaysi biri tanlangani ko'rinmasa, odam
 * lentada nima ko'rayotganini tushunmaydi.
 */
export function CategoryRow({ value, onChange }: CategoryRowProps) {
  return (
    <div
      role="tablist"
      /*
        Nom ANIQ: "Feed bo'limlari" nomi menyu tugmasida ham bor edi.
        Ekran o'quvchi ikkalasini bir xil o'qib, odam qaysi biri
        ekanini ajrata olmasdi.
      */
      aria-label="Kategoriyalar"
      className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {FEED_CATEGORIES.map((item) => {
        const isActive = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={cn(
              /*
                Doiralar KATTAROQ va yumshoqroq — maketdagi kabi.

                Telefonda barmoq bilan aniq bosish uchun balandlik
                44 pikseldan kam bo'lmasligi kerak (Apple va Google
                tavsiyasi). Ilgari u 36 edi va tez surayotgan odam
                yonidagi doirani bosib qo'yardi.
              */
              'flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm whitespace-nowrap transition-all active:scale-95',
              isActive
                ? /*
                    Tanlangani GRADIENT — oddiy to'ldirishdan ko'ra
                    ko'zga tashlanadi va ilovaning brend rangi bilan
                    bir xil tilda gapiradi.
                  */
                  'from-brand-from to-brand-to text-brand-foreground shadow-brand-from/25 border-transparent bg-gradient-to-r font-semibold shadow-md'
                : 'border-border hover:bg-secondary text-foreground',
            )}
          >
            <span className="text-base" aria-hidden="true">{item.emoji}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
