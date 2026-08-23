'use client';

import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { RatingPicker } from '@/components/review/rating-picker';
import { RatingStars } from '@/components/review/rating-stars';
import { ReviewSummary } from '@/components/review/review-summary';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  BLOCK_REASON_TEXT,
  MIN_RATING,
  REVIEW_BODY_MAX_LENGTH,
  reviewsPath,
  type ReviewTarget,
} from '@/config/review';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type {
  ReviewMutationResponse,
  ReviewView,
  ReviewsResponse,
} from '@/modules/review/review.types';

/**
 * Baho va sharhlar bo'limi.
 *
 * ── Nima uchun BITTA komponent, sahifaga qo'yiladi ────────────────────
 * Bu bo'lim beshta boshqa-boshqa sahifada ko'rinadi: mahsulot,
 * taom, restoran, do'kon va mehmonxona. Ularning hammasida
 * ko'rinish va qoidalar bir xil.
 *
 * Har birida alohida yozilsa, ertaga "sharhni tahrirlash" qo'shilsa
 * beshta joyni o'zgartirish kerak bo'lardi va bittasi albatta
 * unutilardi.
 *
 * ── Nima uchun sahifaning O'ZI yuklamaydi ─────────────────────────────
 * Sharhlar sahifaning eng pastida turadi va odam ularga har doim
 * ham yetib bormaydi. Alohida so'rov qilinsa, mahsulot sahifasi
 * TEZROQ ochiladi — sharhlar esa keyin kelib qo'shiladi.
 */

export interface ReviewSectionProps {
  target: ReviewTarget;
  targetId: string;
  /** Nimaga baho qo'yilyapti — sarlavhada ko'rinadi. */
  title?: string;
  className?: string;
}

export function ReviewSection({ target, targetId, title = 'Baholar', className }: ReviewSectionProps) {
  const path = reviewsPath(target, targetId);

  const { data, isLoading, error, setData } = useApiQuery<ReviewsResponse>(path);

  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleSaved = useCallback(
    (result: ReviewMutationResponse) => {
      setData((current) =>
        current
          ? { ...current, summary: result.summary, mine: result.mine }
          : current ?? {
              summary: result.summary,
              reviews: [],
              hasMore: false,
              mine: result.mine,
              eligibility: { canReview: true, reason: null },
            },
      );
      setIsFormOpen(false);
    },
    [setData],
  );

  return (
    <section className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold">{title}</h2>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      )}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {data && (
        <>
          <div className="bg-card border-border rounded-2xl border p-4">
            <ReviewSummary summary={data.summary} />
          </div>

          {/*
            Baho qo'yish tugmasi yoki SABAB.

            Tugmani shunchaki yashirish eng yomon yechim bo'lardi:
            odam nima uchun baho qo'ya olmayotganini bilmasdi va
            buni xato deb o'ylardi.
          */}
          {data.eligibility.canReview ? (
            /*
              Baho hali yo'q bo'lsa — YIG'ILGAN tugma ko'rinadi.

              Ochiq forma har bir mahsulot sahifasida ekranning
              yarmini egallardi, holbuki odam odatda o'qigani
              kelgan bo'ladi.

              Baho allaqachon qo'yilgan bo'lsa, tugma umuman
              ko'rinmaydi: o'zgartirish o'sha bahoning yonidagi
              qalam tugmasi orqali bo'ladi.
            */
            (data.mine === null || isFormOpen) && (
              <ReviewForm
                path={path}
                current={data.mine}
                isOpen={isFormOpen}
                onOpen={() => setIsFormOpen(true)}
                onCancel={() => setIsFormOpen(false)}
                onSaved={handleSaved}
              />
            )
          ) : (
            data.eligibility.reason && (
              <p className="text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2.5 text-xs">
                {BLOCK_REASON_TEXT[data.eligibility.reason]}
              </p>
            )
          )}

          {data.mine && !isFormOpen && (
            <MyReview
              review={data.mine}
              path={path}
              onEdit={() => setIsFormOpen(true)}
              onRemoved={handleSaved}
            />
          )}

          {data.reviews.length === 0 && data.mine === null && (
            <p className="text-muted-foreground text-sm">Hali hech kim sharh yozmagan.</p>
          )}

          <ul className="space-y-3">
            {data.reviews.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} />
              </li>
            ))}
          </ul>

          {data.hasMore && (
            <p className="text-muted-foreground text-center text-xs">
              Boshqa sharhlar ham bor. Ularni ko&apos;rish keyingi bosqichda qo&apos;shiladi.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Bitta sharh kartochkasi. */
function ReviewCard({ review, action }: { review: ReviewView; action?: React.ReactNode }) {
  return (
    <article className="bg-card border-border rounded-2xl border p-3.5">
      <div className="flex items-start gap-3">
        <Avatar src={review.author.avatarUrl} name={review.author.name} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{review.author.name}</p>
            {action}
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <RatingStars value={review.rating} />
            <span className="text-muted-foreground text-xs">{formatUzDate(review.createdAt)}</span>
          </div>

          {review.body && (
            <p className="mt-2 text-sm leading-relaxed break-words">{review.body}</p>
          )}
        </div>
      </div>
    </article>
  );
}

/** O'z sharhi — tahrirlash va o'chirish tugmalari bilan. */
function MyReview({
  review,
  path,
  onEdit,
  onRemoved,
}: {
  review: ReviewView;
  path: string;
  onEdit: () => void;
  onRemoved: (result: ReviewMutationResponse) => void;
}) {
  const request = useApiClient();

  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);
    setIsRemoving(true);

    try {
      const result = await request<ReviewMutationResponse>(path, { method: 'DELETE' });

      onRemoved(result);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs font-medium">Sizning bahoyingiz</p>

      {error && <Alert variant="error">{error}</Alert>}

      <ReviewCard
        review={review}
        action={
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Bahoni tahrirlash"
              onClick={onEdit}
              disabled={isRemoving}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Bahoni o'chirish"
              onClick={() => void remove()}
              disabled={isRemoving}
              className="text-muted-foreground hover:bg-secondary hover:text-destructive inline-flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        }
      />
    </div>
  );
}

/** Baho qo'yish yoki o'zgartirish formasi. */
function ReviewForm({
  path,
  current,
  isOpen,
  onOpen,
  onCancel,
  onSaved,
}: {
  path: string;
  current: ReviewView | null;
  isOpen: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onSaved: (result: ReviewMutationResponse) => void;
}) {
  const request = useApiClient();

  const [rating, setRating] = useState(current?.rating ?? 0);
  const [body, setBody] = useState(current?.body ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <Button variant="outline" fullWidth onClick={onOpen}>
        <MessageSquarePlus className="size-4" aria-hidden="true" />
        Baho qo&apos;yish
      </Button>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (rating < MIN_RATING) {
      setError('Bahoni tanlang.');

      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const result = await request<ReviewMutationResponse>(path, {
        method: 'POST',
        body: { rating, body: body.trim() },
      });

      onSaved(result);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-card border-border space-y-3 rounded-2xl border p-4">
      {error && <Alert variant="error">{error}</Alert>}

      <RatingPicker value={rating} onChange={setRating} disabled={isSaving} />

      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={REVIEW_BODY_MAX_LENGTH}
        disabled={isSaving}
        rows={3}
        placeholder="Fikringiz (ixtiyoriy)"
        aria-label="Sharh matni"
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {current !== null && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Bekor qilish
          </Button>
        )}
        <Button type="submit" isLoading={isSaving} loadingText="Saqlanmoqda...">
          Saqlash
        </Button>
      </div>
    </form>
  );
}
