'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';

import { RatingPicker } from '@/components/review/rating-picker';
import { RatingStars } from '@/components/review/rating-stars';
import { reviewsPath, type ReviewTarget } from '@/config/review';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { ReviewMutationResponse, ReviewsResponse } from '@/modules/review/review.types';

/**
 * Buyurtma tarkibidagi bitta narsaga tez baho.
 *
 * ── Nima uchun bu joyda ───────────────────────────────────────────────
 * Odam taomni yegandan keyin uni menyudan qidirib topib, baho
 * qo'yishga bormaydi. Lekin buyurtma sahifasini u BARIBIR ochadi —
 * "yetkazildimi?", "qancha bo'ldi?" degan savol bilan.
 *
 * Baho aynan shu yerda so'ralsa, u bir bosishda beriladi. Bu
 * hamma savdo maydonchasida shunday ishlaydi va sababi shu.
 *
 * ── Nima uchun to'liq forma emas ──────────────────────────────────────
 * Buyurtmada 5 ta narsa bo'lishi mumkin. Har biriga matn maydoni
 * qo'yilsa, sahifa uzun anketaga aylanardi va odam hech biriga
 * javob bermasdi.
 *
 * Bu yerda faqat YULDUZ. Matn yozmoqchi bo'lgan odam mahsulot
 * sahifasiga o'tadi.
 *
 * ── Narxi: har bir qator alohida so'rov qiladi ────────────────────────
 * Buyurtmada odatda 1-5 narsa bo'ladi, ya'ni ko'pi bilan beshta
 * yengil so'rov. Buni bitta so'rovga yig'ish uchun maxsus
 * "ko'p narsa uchun baho" manzili kerak bo'lardi — u hozircha
 * oqlanmaydi.
 */

export interface InlineReviewProps {
  target: ReviewTarget;
  targetId: string;
  /** Nimaga baho qo'yilyapti — ekranni o'quvchi dastur uchun. */
  name: string;
  className?: string;
}

export function InlineReview({ target, targetId, name, className }: InlineReviewProps) {
  const path = reviewsPath(target, targetId);
  const request = useApiClient();

  const { data, isLoading, setData } = useApiQuery<ReviewsResponse>(path);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading || !data) {
    return null;
  }

  /**
   * Huquqi yo'q bo'lsa — HECH NARSA ko'rsatilmaydi.
   *
   * Bu yerda sabab aytishning ma'nosi yo'q: odam buyurtma
   * sahifasida turibdi va sabab faqat bitta bo'lishi mumkin —
   * buyurtma hali yetkazilmagan. Buni u sahifaning yuqorisida
   * allaqachon ko'rib turibdi.
   */
  if (!data.eligibility.canReview) {
    return null;
  }

  async function save(rating: number) {
    setError(null);
    setIsSaving(true);

    try {
      const result = await request<ReviewMutationResponse>(path, {
        method: 'POST',
        body: { rating },
      });

      setData((current) => ({
        summary: result.summary,
        reviews: current?.reviews ?? [],
        hasMore: current?.hasMore ?? false,
        mine: result.mine,
        eligibility: current?.eligibility ?? { canReview: true, reason: null },
      }));
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  if (data.mine) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <RatingStars value={data.mine.rating} />
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <Check className="size-3" aria-hidden="true" />
          Baholandi
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <RatingPicker
        value={0}
        onChange={(value) => void save(value)}
        disabled={isSaving}
        className="[&_svg]:size-6"
      />

      <span className="sr-only">{`${name} uchun baho`}</span>

      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
