'use client';

import { MessageCircleQuestion, Store, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  ANSWER_MAX_LENGTH,
  QUESTION_BLOCK_TEXT,
  QUESTION_MAX_LENGTH,
  answerCountText,
} from '@/config/product-detail';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import type {
  QuestionMutationResponse,
  QuestionView,
  QuestionsResponse,
} from '@/modules/product/product-qa.types';

/**
 * Savol-javob bo'limi.
 *
 * ── Nima uchun BAHOLARDAN PASTDA turadi ───────────────────────────────
 * Baholar ko'pchilikka kerak — ular "olsam bo'ladimi?" degan
 * savolga javob beradi.
 *
 * Savol-javob esa ANIQ bir narsani bilmoqchi bo'lgan odamga kerak
 * va u sahifani baribir oxirigacha varaqlaydi.
 *
 * ── Nima uchun savol yozish tugmasi YIG'ILGAN turadi ──────────────────
 * Ochiq forma har bir mahsulot sahifasida joy egallardi, holbuki
 * odamlarning katta qismi savol bermaydi — o'qiydi.
 */

export interface QuestionSectionProps {
  productId: string;
  className?: string;
}

export function QuestionSection({ productId, className }: QuestionSectionProps) {
  const path = `/api/v1/products/${productId}/questions`;

  const { data, isLoading, error, setData } = useApiQuery<QuestionsResponse>(path);

  const [isAsking, setIsAsking] = useState(false);

  const handleAsked = useCallback(
    (question: QuestionView) => {
      setData((current) => ({
        questions: [question, ...(current?.questions ?? [])],
        hasMore: current?.hasMore ?? false,
        canAsk: current?.canAsk ?? true,
        blockReason: current?.blockReason ?? null,
        isSeller: current?.isSeller ?? false,
      }));
      setIsAsking(false);
    },
    [setData],
  );

  const handleUpdated = useCallback(
    (question: QuestionView) => {
      setData((current) => ({
        questions: (current?.questions ?? []).map((row) => (row.id === question.id ? question : row)),
        hasMore: current?.hasMore ?? false,
        canAsk: current?.canAsk ?? true,
        blockReason: current?.blockReason ?? null,
        isSeller: current?.isSeller ?? false,
      }));
    },
    [setData],
  );

  const handleRemoved = useCallback(
    (questionId: string) => {
      setData((current) => ({
        questions: (current?.questions ?? []).filter((row) => row.id !== questionId),
        hasMore: current?.hasMore ?? false,
        canAsk: current?.canAsk ?? true,
        blockReason: current?.blockReason ?? null,
        isSeller: current?.isSeller ?? false,
      }));
    },
    [setData],
  );

  return (
    <section className={cn('space-y-3', className)}>
      <h2 className="text-sm font-semibold">Savol-javob</h2>

      {isLoading && <Skeleton className="h-20 rounded-2xl" />}

      {!isLoading && error && <Alert variant="error">{error}</Alert>}

      {data && (
        <>
          {data.canAsk ? (
            isAsking ? (
              <AskForm path={path} onAsked={handleAsked} onCancel={() => setIsAsking(false)} />
            ) : (
              <Button variant="outline" fullWidth onClick={() => setIsAsking(true)}>
                <MessageCircleQuestion className="size-4" aria-hidden="true" />
                Savol berish
              </Button>
            )
          ) : (
            data.blockReason && (
              <p className="text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2.5 text-xs">
                {QUESTION_BLOCK_TEXT[data.blockReason]}
              </p>
            )
          )}

          {data.questions.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Hali savol yo&apos;q. Birinchi bo&apos;lib so&apos;rang — sotuvchi javob beradi.
            </p>
          )}

          <ul className="space-y-3">
            {data.questions.map((question) => (
              <li key={question.id}>
                <QuestionCard
                  question={question}
                  isSeller={data.isSeller}
                  onUpdated={handleUpdated}
                  onRemoved={handleRemoved}
                />
              </li>
            ))}
          </ul>

          {data.hasMore && (
            <p className="text-muted-foreground text-center text-xs">
              Boshqa savollar ham bor.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Bitta savol va uning javoblari. */
function QuestionCard({
  question,
  isSeller,
  onUpdated,
  onRemoved,
}: {
  question: QuestionView;
  isSeller: boolean;
  onUpdated: (question: QuestionView) => void;
  onRemoved: (questionId: string) => void;
}) {
  const request = useApiClient();

  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setError(null);

    try {
      await request(`/api/v1/questions/${question.id}`, { method: 'DELETE' });

      onRemoved(question.id);
    } catch (caught) {
      setError(toUserMessage(caught));
    }
  }

  return (
    <article className="bg-card border-border rounded-2xl border p-3.5">
      <div className="flex items-start gap-3">
        <Avatar src={question.author.avatarUrl} name={question.author.name} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{question.author.name}</p>

            {question.isMine && (
              <button
                type="button"
                aria-label="Savolni o'chirish"
                onClick={() => void remove()}
                className="text-muted-foreground hover:text-destructive inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <p className="text-muted-foreground text-xs">{formatUzDate(question.createdAt)}</p>

          <p className="mt-1.5 text-sm leading-relaxed break-words">{question.body}</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-2">
          {error}
        </Alert>
      )}

      {question.answers.length === 0 ? (
        <p className="text-muted-foreground mt-2.5 text-xs">{answerCountText(0)}</p>
      ) : (
        <ul className="border-border/60 mt-3 space-y-2.5 border-t pt-3">
          {question.answers.map((answer) => (
            <li key={answer.id} className="flex items-start gap-2.5">
              <Avatar src={answer.author.avatarUrl} name={answer.author.name} size="sm" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{answer.author.name}</span>

                  {/*
                    Do'kon javobi ALOHIDA belgilanadi.

                    Xaridor uchun eng ishonchli javob sotuvchidan
                    keladi va uni boshqalardan ajrata olishi kerak.
                  */}
                  {answer.isFromSeller && (
                    <Badge variant="secondary" className="gap-1">
                      <Store className="size-3" aria-hidden="true" />
                      Do&apos;kon
                    </Badge>
                  )}

                  <span className="text-muted-foreground text-xs">
                    {formatUzDate(answer.createdAt)}
                  </span>
                </div>

                <p className="mt-0.5 text-sm leading-relaxed break-words">{answer.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/*
        Javob tugmasi allaqachon javob berganlarga ko'rsatilmaydi:
        bitta odam bitta savolga bir marta javob beradi.
      */}
      {!question.hasMyAnswer &&
        (isAnswering ? (
          <AnswerForm
            questionId={question.id}
            onAnswered={(updated) => {
              onUpdated(updated);
              setIsAnswering(false);
            }}
            onCancel={() => setIsAnswering(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAnswering(true)}
            className="text-primary mt-2.5 text-xs font-medium"
          >
            {isSeller ? "Do'kon nomidan javob berish" : 'Javob berish'}
          </button>
        ))}
    </article>
  );
}

/** Savol yozish formasi. */
function AskForm({
  path,
  onAsked,
  onCancel,
}: {
  path: string;
  onAsked: (question: QuestionView) => void;
  onCancel: () => void;
}) {
  const request = useApiClient();

  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setError(null);
    setIsSaving(true);

    try {
      const result = await request<QuestionMutationResponse>(path, {
        method: 'POST',
        body: { body: body.trim() },
      });

      onAsked(result.question);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-card border-border space-y-3 rounded-2xl border p-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={QUESTION_MAX_LENGTH}
        disabled={isSaving}
        rows={3}
        autoFocus
        placeholder="Masalan: zaryadlagichi bormi?"
        aria-label="Savol matni"
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Bekor qilish
        </Button>
        <Button type="submit" isLoading={isSaving} loadingText="Yuborilmoqda...">
          Yuborish
        </Button>
      </div>
    </form>
  );
}

/** Javob yozish formasi. */
function AnswerForm({
  questionId,
  onAnswered,
  onCancel,
}: {
  questionId: string;
  onAnswered: (question: QuestionView) => void;
  onCancel: () => void;
}) {
  const request = useApiClient();

  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setError(null);
    setIsSaving(true);

    try {
      const result = await request<QuestionMutationResponse>(
        `/api/v1/questions/${questionId}/answers`,
        { method: 'POST', body: { body: body.trim() } },
      );

      onAnswered(result.question);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="border-border/60 mt-3 space-y-2 border-t pt-3">
      {error && <Alert variant="error">{error}</Alert>}

      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={ANSWER_MAX_LENGTH}
        disabled={isSaving}
        rows={2}
        autoFocus
        placeholder="Javobingiz"
        aria-label="Javob matni"
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Bekor qilish
        </Button>
        <Button type="submit" size="sm" isLoading={isSaving} loadingText="Yuborilmoqda...">
          Yuborish
        </Button>
      </div>
    </form>
  );
}
