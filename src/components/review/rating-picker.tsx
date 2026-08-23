'use client';

import { Star } from 'lucide-react';

import { MAX_RATING, MIN_RATING, RATING_LABEL } from '@/config/review';
import { cn } from '@/lib/utils';

/**
 * Baho tanlash — yulduzlarni bosish.
 *
 * ── Nima uchun bu ALOHIDA komponent ───────────────────────────────────
 * `RatingStars` faqat chizadi va u server tomonida ishlaydi. Tanlash
 * esa bosishni talab qiladi, ya'ni brauzer kodi.
 *
 * Ularni birlashtirsak, faqat KO'RSATISH uchun ishlatilgan har bir
 * joyga ham bosish kodi yuklanardi — katalogda bu 40 marta
 * takrorlanardi.
 *
 * ── Nima uchun har bir yulduz ALOHIDA tugma ───────────────────────────
 * Tugma bo'lgani uchun ular tugmalar bilan (Tab va Enter) ham
 * tanlanadi va ekranni o'quvchi dastur har birini o'qiy oladi.
 *
 * Bitta katta maydon va bosilgan joyni hisoblash yo'li ham bor edi,
 * lekin u faqat sichqoncha bilan ishlardi.
 */

export interface RatingPickerProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function RatingPicker({ value, onChange, disabled = false, className }: RatingPickerProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const star = index + MIN_RATING;
          const isActive = star <= value;

          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              aria-label={`${star} — ${RATING_LABEL[star]}`}
              aria-pressed={star === value}
              onClick={() => onChange(star)}
              className={cn(
                'rounded-lg p-1 transition-transform',
                'active:scale-90 disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <Star
                aria-hidden="true"
                className={cn(
                  'size-8 transition-colors',
                  isActive ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/35',
                )}
              />
            </button>
          );
        })}
      </div>

      {/*
        Tanlangan bahoning NOMI ko'rsatiladi.

        "4 yulduz" degani har kimda boshqacha tushuniladi. "Yaxshi"
        degan so'z esa aniq va odam bahosini o'zgartirishi kerakmi
        yo'qmi — darhol tushunadi.

        Joy HAR DOIM band turadi: aks holda baho tanlanganda
        forma sakrab qolardi.
      */}
      <p className="text-muted-foreground min-h-5 text-sm">
        {value >= MIN_RATING ? RATING_LABEL[value] : "Bahoni tanlang"}
      </p>
    </div>
  );
}
