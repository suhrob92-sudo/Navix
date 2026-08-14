'use client';

import { CornerDownRight, Heart, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { RichText } from '@/components/feed/rich-text';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  authorDisplayName,
  COMMENT_MAX_LENGTH,
  formatReactionCount,
  type CommentView,
  type LikeResponse,
} from '@/modules/feed/feed.types';

export interface CommentItemProps {
  postId: string;
  comment: CommentView;
  /** Post egasimi — u ham har qanday izohni o'chira oladi. */
  isPostOwner: boolean;
  /** Izoh o'zgardi (yoqtirish, javoblar soni). */
  onChanged: (comment: CommentView) => void;
  /** Izoh o'chirildi. `removed` — post sanog'idan qancha ayirish kerak. */
  onDeleted: (commentId: string, removed: number) => void;
  /** Javob qo'shildi — post sanog'i oshadi. */
  onReplyAdded: () => void;
  /** Bu izohning O'ZI javobmi (chapdan siljitilgan ko'rinish). */
  isReply?: boolean;
}

/**
 * Bitta izoh — yoqtirish, javob berish va o'chirish bilan.
 *
 * ── Nima uchun javoblar TALAB bo'yicha yuklanadi ──────────────────────
 * Ular birdan yuklansa, 50 ta izohli postda 50 ta qo'shimcha so'rov
 * ketardi va ularning aksariyati o'qilmasdi ham.
 *
 * "3 ta javob" tugmasi bosilgandagina so'rov yuboriladi — YouTube
 * ham aynan shunday qiladi.
 */
export function CommentItem({
  postId,
  comment,
  isPostOwner,
  onChanged,
  onDeleted,
  onReplyAdded,
  isReply = false,
}: CommentItemProps) {
  const request = useApiClient();

  const [isRepliesOpen, setIsRepliesOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replies = useCursorList<CommentView>(
    isRepliesOpen ? `/api/v1/posts/${postId}/comments?parentId=${comment.id}` : null,
    'comments',
  );

  const likeText = formatReactionCount(comment.likeCount);

  /**
   * Yoqtirish — DARHOL o'zgaradi, keyin server tasdiqlaydi.
   *
   * Postdagi bilan bir xil sabab: javob kutilsa, odam ikkinchi
   * marta bosardi va yoqtirish qo'yilib, darhol olib tashlanardi.
   */
  function toggleLike() {
    const wasLiked = comment.isLiked;

    onChanged({
      ...comment,
      isLiked: !wasLiked,
      likeCount: comment.likeCount + (wasLiked ? -1 : 1),
    });

    void (async () => {
      try {
        const result = await request<LikeResponse>(
          `/api/v1/posts/${postId}/comments/${comment.id}/like`,
          { method: wasLiked ? 'DELETE' : 'POST', ...(wasLiked ? {} : { body: {} }) },
        );

        onChanged({ ...comment, isLiked: result.isLiked, likeCount: result.likeCount });
      } catch (caught) {
        onChanged({ ...comment, isLiked: wasLiked, likeCount: comment.likeCount });
        setError(toUserMessage(caught));
      }
    })();
  }

  async function sendReply() {
    const trimmed = draft.trim();

    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const result = await request<{ comment: CommentView }>(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        // Javobning javobi ham ASOSIY izohga biriktiriladi — buni server hal qiladi.
        body: { body: trimmed, parentId: comment.parentId ?? comment.id },
      });

      /**
       * Javoblar ro'yxati ochiq bo'lsa — yangi javob unga qo'shiladi.
       * Yopiq bo'lsa — ochiladi va ro'yxat serverdan yuklanadi.
       */
      if (isRepliesOpen) {
        replies.setItems((current) => [...current, result.comment]);
      } else {
        setIsRepliesOpen(true);
      }

      onChanged({ ...comment, replyCount: comment.replyCount + 1 });
      onReplyAdded();
      setDraft('');
      setIsFormOpen(false);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  async function remove() {
    setIsRemoving(true);
    setError(null);

    try {
      await request(`/api/v1/posts/${postId}/comments/${comment.id}`, { method: 'DELETE' });

      /**
       * Asosiy izoh o'chirilsa, uning JAVOBLARI ham o'chadi.
       *
       * Server shunday qiladi — ekrandagi son ham xuddi shuncha
       * kamayishi kerak, aks holda "12 ta izoh" yozuvi ostida
       * 8 tasi ko'rinardi.
       */
      onDeleted(comment.id, 1 + (isReply ? 0 : comment.replyCount));
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsRemoving(false);
    }
  }

  return (
    <div className={cn(isReply && 'ml-8')}>
      <div className="bg-card border-border animate-fade-up flex items-start gap-3 rounded-2xl border p-3">
        <Link href={`/u/${comment.author.username}`} className="shrink-0">
          <Avatar src={comment.author.avatarUrl} name={comment.author.fullName} size="sm" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/u/${comment.author.username}`}
              className="truncate text-xs font-semibold hover:underline"
            >
              {authorDisplayName(comment.author)}
            </Link>
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatRelativeUz(comment.createdAt)}
            </span>
          </div>

          <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
            <RichText body={comment.body} />
          </p>

          <div className="text-muted-foreground mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLike}
              aria-pressed={comment.isLiked}
              aria-label={comment.isLiked ? 'Yoqtirishni olib tashlash' : 'Izohni yoqtirish'}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors active:scale-95',
                comment.isLiked ? 'text-destructive' : 'hover:text-foreground',
              )}
            >
              <Heart className={cn('size-3.5', comment.isLiked && 'fill-current')} aria-hidden="true" />
              {likeText && <span className="tabular-nums">{likeText}</span>}
            </button>

            <button
              type="button"
              onClick={() => setIsFormOpen((current) => !current)}
              className="hover:text-foreground text-xs transition-colors"
            >
              Javob berish
            </button>
          </div>
        </div>

        {/*
          Izohni muallifi ham, POST EGASI ham o'chira oladi: o'z
          postidagi haqoratli izohni olib tashlash uchun moderatorni
          kutish kerak bo'lmasligi kerak.
        */}
        {(comment.isMine || isPostOwner) && (
          <button
            type="button"
            aria-label="Izohni o'chirish"
            disabled={isRemoving}
            onClick={() => void remove()}
            className="text-muted-foreground hover:text-destructive -m-1 shrink-0 rounded-lg p-1 transition-colors disabled:opacity-60"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mt-2">
          {error}
        </Alert>
      )}

      {isFormOpen && (
        <form
          className="mt-2 ml-8"
          onSubmit={(event) => {
            event.preventDefault();
            void sendReply();
          }}
        >
          <label htmlFor={`reply-${comment.id}`} className="sr-only">
            Javob matni
          </label>

          <Textarea
            id={`reply-${comment.id}`}
            rows={2}
            maxLength={COMMENT_MAX_LENGTH}
            value={draft}
            disabled={isSending}
            placeholder={`${authorDisplayName(comment.author)} ga javob`}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isSending}
              onClick={() => {
                setIsFormOpen(false);
                setDraft('');
              }}
            >
              Bekor qilish
            </Button>

            <Button type="submit" size="sm" disabled={draft.trim().length === 0} isLoading={isSending}>
              <Send className="size-4" aria-hidden="true" />
              Yuborish
            </Button>
          </div>
        </form>
      )}

      {/* Javoblar — faqat asosiy izohda va faqat mavjud bo'lsa. */}
      {!isReply && comment.replyCount > 0 && (
        <div className="mt-2 ml-8 space-y-2">
          <button
            type="button"
            onClick={() => setIsRepliesOpen((current) => !current)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <CornerDownRight className="size-3.5" aria-hidden="true" />
            {isRepliesOpen ? 'Javoblarni yashirish' : `${comment.replyCount} ta javob`}
          </button>

          {isRepliesOpen && (
            <>
              {replies.isLoading && <Skeleton className="h-14 rounded-2xl" />}

              {replies.error && <Alert variant="error">{replies.error}</Alert>}

              {replies.items.map((reply) => (
                <CommentItem
                  key={reply.id}
                  postId={postId}
                  comment={reply}
                  isPostOwner={isPostOwner}
                  isReply
                  onChanged={(updated) =>
                    replies.setItems((current) =>
                      current.map((item) => (item.id === updated.id ? updated : item)),
                    )
                  }
                  onDeleted={(replyId, removed) => {
                    replies.setItems((current) => current.filter((item) => item.id !== replyId));
                    onChanged({ ...comment, replyCount: Math.max(0, comment.replyCount - 1) });
                    onDeleted(replyId, removed);
                  }}
                  onReplyAdded={onReplyAdded}
                />
              ))}

              {replies.hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={replies.isLoadingMore}
                  onClick={replies.loadMore}
                >
                  Yana javoblar
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
