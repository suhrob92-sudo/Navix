import { RatingStars } from '@/components/review/rating-stars';
import { MAX_RATING, MIN_RATING, formatRating, ratingCountText, ratingShare } from '@/config/review';
import { cn } from '@/lib/utils';
import type { ReviewSummaryView } from '@/modules/review/review.types';

/**
 * Bahoning umumiy ko'rinishi: o'rtacha son va taqsimot.
 *
 * ── Nima uchun TAQSIMOT ko'rsatiladi ──────────────────────────────────
 * Faqat o'rtacha son aldab qo'yishi mumkin. 3.0 baho ikki xil
 * bo'ladi:
 *
 *   · hamma "o'rtacha" dedi — mahsulot oddiy;
 *   · yarmi 5, yarmi 1 dedi — mahsulot ba'zilarga kelmaydi.
 *
 * Bular butunlay boshqa narsa va xaridor buni ko'rishi kerak.
 * Ustunlar buni bir qarashda ko'rsatadi.
 */

export interface ReviewSummaryProps {
  summary: ReviewSummaryView;
  className?: string;
}

export function ReviewSummary({ summary, className }: ReviewSummaryProps) {
  if (summary.total === 0) {
    return (
      <div className={cn('text-muted-foreground text-sm', className)}>
        Hali baho yo&apos;q. Birinchi bo&apos;lib fikringizni yozing.
      </div>
    );
  }

  return (
    <div className={cn('flex items-start gap-5', className)}>
      <div className="shrink-0 text-center">
        <p className="text-3xl font-semibold tabular-nums">
          {formatRating(summary.average, summary.total)}
        </p>
        <RatingStars value={summary.average} className="mt-1" />
        <p className="text-muted-foreground mt-1 text-xs">{ratingCountText(summary.total)}</p>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        {/*
          5 dan 1 gacha — yuqoridan pastga.

          Teskari tartib (1 dan 5 gacha) ham mumkin edi, lekin
          hamma savdo maydonchasi shu tartibda ko'rsatadi va odam
          uni o'rgangan.
        */}
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const star = MAX_RATING - index;
          const count = summary.distribution[star] ?? 0;

          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-muted-foreground w-3 text-xs tabular-nums">{star}</span>

              <span className="bg-secondary h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
                <span
                  className="block h-full rounded-full bg-amber-400 transition-[width] duration-300"
                  style={{ width: `${ratingShare(count, summary.total)}%` }}
                />
              </span>

              <span className="text-muted-foreground w-6 text-right text-xs tabular-nums">
                {count}
              </span>
            </div>
          );
        })}

        {/* Eng past bahoning nomi ostda emas: u ustunlarning o'zida ko'rinadi. */}
        <span className="sr-only">{`Baholar ${MIN_RATING} dan ${MAX_RATING} gacha`}</span>
      </div>
    </div>
  );
}
