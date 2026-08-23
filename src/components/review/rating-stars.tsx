import { Star } from 'lucide-react';

import { MAX_RATING } from '@/config/review';
import { cn } from '@/lib/utils';

/**
 * Yulduzli baho — FAQAT ko'rsatish uchun.
 *
 * ── Nima uchun yarim yulduz YO'Q ──────────────────────────────────────
 * 4.7 bahoni "to'rt yarim yulduz" qilib chizish mumkin edi, lekin
 * uning ma'nosi yo'q: odam yarim yulduzni ko'rib "4.5 mi, 4.7 mi?"
 * deb o'ylamaydi — u umumiy taassurotni oladi.
 *
 * Aniq son esa yulduzlar YONIDA raqam bilan yoziladi va u har doim
 * to'g'ri. Yarim yulduz chizish uchun esa qirqim (`clipPath`) kerak
 * bo'lardi va u ba'zi brauzerlarda buzilib ko'rinadi.
 *
 * ── Nima uchun bu komponent MIJOZ kodi emas ───────────────────────────
 * Unda hech qanday holat yo'q — faqat chizadi. Shuning uchun u
 * server tomonida ham ishlaydi va brauzerga ortiqcha kod
 * yubormaydi.
 */

const SIZE_CLASSES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-6',
} as const;

export interface RatingStarsProps {
  /** 0 dan 5 gacha. Yaxlitlanadi. */
  value: number;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

export function RatingStars({ value, size = 'sm', className }: RatingStarsProps) {
  const filled = Math.round(value);

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      /*
        Ekranni o'quvchi dastur uchun yulduzlar MA'NOSIZ — u
        "yulduz yulduz yulduz" deb o'qirdi. Shuning uchun ular
        yashiriladi va o'rniga bitta aniq matn beriladi.
      */
      role="img"
      aria-label={`5 balldan ${filled}`}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className={cn(
            SIZE_CLASSES[size],
            index < filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </span>
  );
}
