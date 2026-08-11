'use client';

import { BadgeCheck, Heart, MessageCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  authorDisplayName,
  formatReactionCount,
  DELETED_POST_TEXT,
  type PostView,
} from '@/modules/feed/feed.types';

export interface PostCardProps {
  post: PostView;
  /** Yoqtirish tugmasi bosildi. */
  onToggleLike: () => void;
  /** O'chirish tasdiqlandi. Berilmasa o'chirish tugmasi ko'rinmaydi. */
  onDelete?: () => void;
  /**
   * Post sahifasining O'ZIDA ko'rsatilyaptimi.
   *
   * Shunda izohga havola kerak emas (odam allaqachon o'sha yerda) va
   * matn to'liq ko'rsatiladi.
   */
  isDetail?: boolean;
  isBusy?: boolean;
}

/**
 * Lentadagi bitta post.
 *
 * ── Nima uchun alohida komponent ──────────────────────────────────────
 * Post uch joyda ko'rsatiladi: lentada, profilda va o'z sahifasida.
 * Har joyda qayta yozilsa, ertaga tugma qo'shilganda uchta joyni
 * tahrirlash kerak bo'lardi va bittasi albatta unutilardi.
 */
export function PostCard({ post, onToggleLike, onDelete, isDetail = false, isBusy = false }: PostCardProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const name = authorDisplayName(post.author);
  const likeText = formatReactionCount(post.likeCount);
  const commentText = formatReactionCount(post.commentCount);

  return (
    <article className="bg-card border-border rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <Link href={`/u/${post.author.username}`} className="shrink-0" aria-label={`${name} profili`}>
          <Avatar src={post.author.avatarUrl} name={post.author.fullName} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <Link href={`/u/${post.author.username}`} className="truncate text-sm font-semibold hover:underline">
              {name}
            </Link>

            {post.author.isVerified && (
              <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan profil" />
            )}
          </div>

          <p className="text-muted-foreground text-xs">{formatRelativeUz(post.createdAt)}</p>
        </div>

        {post.isMine && !post.isDeleted && onDelete && (
          <button
            type="button"
            aria-label="Postni o'chirish"
            disabled={isBusy}
            onClick={() => setIsDeleteOpen(true)}
            className="text-muted-foreground hover:text-destructive -m-2 shrink-0 rounded-lg p-2 transition-colors disabled:opacity-60"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/*
        `whitespace-pre-wrap` — odam yozgan qatorlar saqlanadi.
        `break-words` — bo'shliqsiz uzun matn kartadan chiqib ketmaydi.
      */}
      <p
        className={cn(
          'mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap',
          post.isDeleted && 'text-muted-foreground italic',
          // Lentada uzun post qisqartiriladi, o'z sahifasida to'liq turadi.
          !isDetail && !post.isDeleted && 'line-clamp-6',
        )}
      >
        {post.isDeleted ? DELETED_POST_TEXT : post.body}
      </p>

      {!post.isDeleted && (
        <div className="text-muted-foreground mt-3 flex items-center gap-1">
          <button
            type="button"
            disabled={isBusy}
            onClick={onToggleLike}
            aria-pressed={post.isLiked}
            aria-label={post.isLiked ? 'Yoqtirishni olib tashlash' : 'Yoqtirish'}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
              'hover:bg-secondary active:scale-[0.97] disabled:opacity-60',
              post.isLiked && 'text-destructive',
            )}
          >
            <Heart className={cn('size-4', post.isLiked && 'fill-current')} aria-hidden="true" />
            {likeText && <span className="tabular-nums">{likeText}</span>}
          </button>

          {isDetail ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <MessageCircle className="size-4" aria-hidden="true" />
              {commentText && <span className="tabular-nums">{commentText}</span>}
            </span>
          ) : (
            <Link
              href={`/feed/${post.id}`}
              aria-label="Izohlar"
              className="hover:bg-secondary flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors"
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              {commentText && <span className="tabular-nums">{commentText}</span>}
            </Link>
          )}
        </div>
      )}

      {onDelete && (
        <ConfirmDialog
          open={isDeleteOpen}
          title="Post o'chirilsinmi?"
          description="Post lentadan yo'qoladi. Unga yozilgan izohlar saqlanib qoladi. Bu amalni qaytarib bo'lmaydi."
          confirmLabel="O'chirish"
          isDestructive
          isLoading={isBusy}
          onConfirm={() => {
            setIsDeleteOpen(false);
            onDelete();
          }}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </article>
  );
}
