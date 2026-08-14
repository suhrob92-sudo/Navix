/* eslint-disable @next/next/no-img-element */
'use client';

import { BadgeCheck, Flag, Heart, MessageCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ReportDialog } from '@/components/moderation/report-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  authorDisplayName,
  formatReactionCount,
  DELETED_POST_TEXT,
  POST_MAX_LENGTH,
  type PostView,
} from '@/modules/feed/feed.types';
import type { ReportReasonName } from '@/modules/moderation/moderation.types';

export interface PostCardProps {
  post: PostView;
  /** Yoqtirish tugmasi bosildi. */
  onToggleLike: () => void;
  /** O'chirish tasdiqlandi. Berilmasa o'chirish tugmasi ko'rinmaydi. */
  onDelete?: () => void;
  /** Matn tahrirlandi. Berilmasa tahrirlash tugmasi ko'rinmaydi. */
  onEdit?: (body: string) => Promise<void> | void;
  /** Shikoyat yuborildi. Berilmasa shikoyat tugmasi ko'rinmaydi. */
  onReport?: (reason: ReportReasonName, note: string) => Promise<void> | void;
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
export function PostCard({
  post,
  onToggleLike,
  onDelete,
  onEdit,
  onReport,
  isDetail = false,
  isBusy = false,
}: PostCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReported, setIsReported] = useState(false);

  /** Tahrirlash rejimi: `null` — o'chiq, satr — tahrirlanayotgan matn. */
  const [draft, setDraft] = useState<string | null>(null);

  const name = authorDisplayName(post.author);
  const likeText = formatReactionCount(post.likeCount);
  const commentText = formatReactionCount(post.commentCount);

  const canEdit = post.isMine && !post.isDeleted && Boolean(onEdit);
  const canDelete = post.isMine && !post.isDeleted && Boolean(onDelete);
  const canReport = !post.isMine && !post.isDeleted && Boolean(onReport);
  const hasMenu = canEdit || canDelete || canReport;

  async function saveEdit() {
    if (draft === null || !onEdit) return;

    await onEdit(draft.trim());
    setDraft(null);
  }

  return (
    <article className="bg-card border-border relative rounded-2xl border p-4">
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

          <p className="text-muted-foreground text-xs">
            {formatRelativeUz(post.createdAt)}
            {/*
              "Tahrirlangan" belgisi KERAK: o'quvchi izoh yozgandan
              keyin matn o'zgarsa, uning izohi ma'nosiz ko'rinib
              qolardi.
            */}
            {post.editedAt && !post.isDeleted && ' · tahrirlangan'}
          </p>
        </div>

        {hasMenu && (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Post amallari"
              aria-expanded={isMenuOpen}
              disabled={isBusy}
              onClick={() => setIsMenuOpen((current) => !current)}
              className="text-muted-foreground hover:text-foreground -m-2 rounded-lg p-2 transition-colors disabled:opacity-60"
            >
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </button>

            {isMenuOpen && (
              <>
                {/*
                  Ko'rinmas orqa fon: menyudan tashqariga bosilganda u
                  yopiladi. Hujjatga hodisa tinglovchisi qo'shishdan
                  ko'ra oddiyroq va u tozalanmay qolib ketmaydi.
                */}
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setIsMenuOpen(false)}
                />

                <div
                  role="menu"
                  className="bg-card border-border absolute top-full right-0 z-20 mt-1 w-48 rounded-xl border p-1 shadow-lg"
                >
                  {canEdit && (
                    <button
                      type="button"
                      role="menuitem"
                      className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setDraft(post.body);
                      }}
                    >
                      <Pencil className="size-4 shrink-0" aria-hidden="true" />
                      Tahrirlash
                    </button>
                  )}

                  {canReport && (
                    <button
                      type="button"
                      role="menuitem"
                      className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsReportOpen(true);
                      }}
                    >
                      <Flag className="size-4 shrink-0" aria-hidden="true" />
                      Shikoyat qilish
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      role="menuitem"
                      className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="size-4 shrink-0" aria-hidden="true" />
                      O&apos;chirish
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isReported && (
        <p className="text-success mt-3 text-xs">Shikoyat yuborildi. Moderator uni ko&apos;rib chiqadi.</p>
      )}

      {draft !== null ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={POST_MAX_LENGTH}
            aria-label="Post matni"
            disabled={isBusy}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              isLoading={isBusy}
              /*
                Rasmli postda matn bo'sh qolishi mumkin, rasmsizda —
                yo'q. Server ham shu qoidani tekshiradi; bu yerdagisi
                faqat tugmani darhol o'chirib qo'yish uchun.
              */
              disabled={draft.trim().length === 0 && !post.imageUrl}
              onClick={() => void saveEdit()}
            >
              Saqlash
            </Button>
            <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => setDraft(null)}>
              Bekor qilish
            </Button>
          </div>
        </div>
      ) : (
        /*
          `whitespace-pre-wrap` — odam yozgan qatorlar saqlanadi.
          `break-words` — bo'shliqsiz uzun matn kartadan chiqib ketmaydi.
        */
        (post.body.length > 0 || post.isDeleted) && (
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
        )
      )}

      {post.imageUrl && !post.isDeleted && (
        /*
          Rasm postning bir qismi — u ham bosilganda post sahifasiga
          olib boradi. Balandligi cheklangan: baland rasm butun ekranni
          egallab, lentani aylantirishni qiyinlashtirardi.
        */
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="border-border mt-3 max-h-96 w-full rounded-xl border object-cover"
        />
      )}

      {!post.isDeleted && draft === null && (
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

      {isReportOpen && onReport && (
        <ReportDialog
          subject={`${name} ning posti`}
          isLoading={isBusy}
          onSubmit={(reason, note) => {
            setIsReportOpen(false);

            void Promise.resolve(onReport(reason, note)).then(() => setIsReported(true));
          }}
          onCancel={() => setIsReportOpen(false)}
        />
      )}
    </article>
  );
}
