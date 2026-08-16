/* eslint-disable @next/next/no-img-element */
'use client';

import { BadgeCheck, Bookmark, Clapperboard, Flag, Heart, MapPin, MessageCircle, MoreHorizontal, MousePointerClick, Pencil, Share2, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { RichText } from '@/components/feed/rich-text';
import { ShareSheet } from '@/components/feed/share-sheet';
import { ReportDialog } from '@/components/moderation/report-dialog';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import {
  authorDisplayName,
  formatReactionCount,
  needsTruncation,
  DELETED_POST_TEXT,
  POST_MAX_LENGTH,
  POST_PREVIEW_LENGTH,
  type PostView,
} from '@/modules/feed/feed.types';
import type { ReportReasonName } from '@/modules/moderation/moderation.types';

export interface PostCardProps {
  post: PostView;
  /** Yoqtirish tugmasi bosildi. */
  onToggleLike: () => void;
  /**
   * Rasm/videoga IKKI MARTA bosildi — faqat yoqtirish qo'yiladi.
   *
   * Berilmasa ikki marta bosish umuman ishlamaydi.
   */
  onDoubleTapLike?: () => void;
  /** Saqlash tugmasi bosildi. Berilmasa tugma ko'rinmaydi. */
  onToggleSave?: () => void;
  /** Ulashish bajarildi — son shu yerda oshadi. */
  onShared?: () => void;
  /** Videodagi mahsulot tugmasi bosildi. */
  onProductClick?: (productId: string) => void;
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
  onDoubleTapLike,
  onToggleSave,
  onShared,
  onProductClick,
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
  const [isShareOpen, setIsShareOpen] = useState(false);

  /** Uzun matn to'liq ochilganmi. */
  const [isExpanded, setIsExpanded] = useState(false);

  /** Ikki marta bosilgandagi yurakcha animatsiyasi ko'rinyaptimi. */
  const [isHeartFlying, setIsHeartFlying] = useState(false);

  /** Oxirgi bosish vaqti — ikki marta bosishni aniqlash uchun. */
  const lastTapRef = useRef(0);

  /** Tahrirlash rejimi: `null` — o'chiq, satr — tahrirlanayotgan matn. */
  const [draft, setDraft] = useState<string | null>(null);

  const name = authorDisplayName(post.author);
  const likeText = formatReactionCount(post.likeCount);
  const commentText = formatReactionCount(post.commentCount);
  const shareText = formatReactionCount(post.shareCount);

  const isLong = needsTruncation(post.body);
  const visibleBody =
    isDetail || isExpanded || !isLong ? post.body : `${post.body.slice(0, POST_PREVIEW_LENGTH)}…`;

  /**
   * Ikki marta bosish — Instagramning eng tanilgan harakati.
   *
   * ── Nima uchun `ondblclick` ISHLATILMAYDI ────────────────────────────
   * Telefon brauzerlarida `dblclick` hodisasi ishonchsiz: barmoq
   * bilan tez ikki marta bosilganda u ko'pincha umuman kelmaydi
   * yoki sahifani kattalashtirib yuboradi.
   *
   * Vaqtni o'zimiz o'lchash esa har joyda bir xil ishlaydi.
   */
  function handleMediaTap() {
    if (!onDoubleTapLike) return;

    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onDoubleTapLike();
      setIsHeartFlying(true);
      setTimeout(() => setIsHeartFlying(false), 700);

      return;
    }

    lastTapRef.current = now;
  }

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

          {/*
            Joylashuv sana OSTIDA, alohida qatorda.

            Sana yoniga qo'shsak, uzun nom ("Toshkent shahri ·
            Chilonzor") telefonda kesilib ketardi va o'qib
            bo'lmasdi.
          */}
          {post.place && (
            <p className="text-muted-foreground flex items-center gap-1 text-xs">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{post.place.name}</span>
            </p>
          )}
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
          <div className="mt-3">
            <p
              className={cn(
                'text-sm leading-relaxed break-words whitespace-pre-wrap',
                post.isDeleted && 'text-muted-foreground italic',
              )}
            >
              {post.isDeleted ? DELETED_POST_TEXT : <RichText body={visibleBody} />}
            </p>

            {/*
              "Ko'proq" — sahifa ALMASHMAYDI.

              Havola qilib qo'yilsa, odam uzun postni o'qish uchun
              lentadan chiqib ketardi va qaytganda o'qigan joyini
              yo'qotardi.
            */}
            {!isDetail && !post.isDeleted && isLong && (
              <button
                type="button"
                onClick={() => setIsExpanded((current) => !current)}
                className="text-muted-foreground hover:text-foreground mt-1 text-xs font-medium transition-colors"
              >
                {isExpanded ? "Yig'ish" : "Ko'proq"}
              </button>
            )}
          </div>
        )
      )}

      {/*
        Video — lentada ODDIY pleyer bilan.

        To'liq ekranli tomosha uchun alohida sahifa bor (`/feed/watch`).
        Bu yerda esa post boshqa postlar orasida turadi va odam
        o'qiyapti: avtomatik o'ynash uni chalg'itardi va bir vaqtda
        bir nechta video ovozi eshitilardi.
      */}
      {post.videoUrl && !post.isDeleted && (
        <div className="mt-3 space-y-2">
          <video
            src={post.videoUrl}
            poster={post.videoPosterUrl ?? undefined}
            controls
            muted
            playsInline
            preload="metadata"
            className="border-border max-h-96 w-full rounded-xl border bg-black"
          />

          {/* Bir nechta mahsulot — hammasi ro'yxat bo'lib turadi. */}
          {post.products.map((item) => (
            <PostProductButton
              key={item.id}
              product={item}
              showClicks={post.isMine}
              onClick={() => onProductClick?.(item.id)}
            />
          ))}

          <Link
            href="/feed/watch"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <Clapperboard className="size-3.5" aria-hidden="true" />
            Barcha videolar
          </Link>
        </div>
      )}

      {post.imageUrl && !post.isDeleted && (
        /*
          Rasm postning bir qismi. Balandligi cheklangan: baland rasm
          butun ekranni egallab, lentani aylantirishni qiyinlashtirardi.

          Ikki marta bosilsa — yoqtiriladi va yurakcha uchib chiqadi.
        */
        <div className="relative mt-3" onPointerDown={handleMediaTap}>
          <img
            src={post.imageUrl}
            alt=""
            loading="lazy"
            className="border-border max-h-96 w-full rounded-xl border object-cover"
          />

          {isHeartFlying && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart className="animate-heart-pop size-20 fill-white text-white drop-shadow-lg" aria-hidden="true" />
            </span>
          )}
        </div>
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

          {onShared && (
            <button
              type="button"
              aria-label="Ulashish"
              onClick={() => setIsShareOpen(true)}
              className="hover:bg-secondary flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors active:scale-[0.97]"
            >
              <Share2 className="size-4" aria-hidden="true" />
              {shareText && <span className="tabular-nums">{shareText}</span>}
            </button>
          )}

          {/*
            Saqlash tugmasi ENG O'NGDA — yolg'iz.

            U qolganlaridan boshqa turdagi amal: yoqtirish, izoh va
            ulashish OMMAVIY, saqlash esa SHAXSIY. Ular orasiga
            qo'yilsa, odam saqlash ham ko'rinadi deb o'ylardi.
          */}
          {onToggleSave && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onToggleSave}
              aria-pressed={post.isSaved}
              aria-label={post.isSaved ? 'Saqlanganlardan olib tashlash' : 'Saqlash'}
              className={cn(
                'ml-auto flex items-center rounded-full px-3 py-1.5 text-xs transition-colors',
                'hover:bg-secondary active:scale-[0.97] disabled:opacity-60',
                post.isSaved && 'text-primary',
              )}
            >
              <Bookmark className={cn('size-4', post.isSaved && 'fill-current')} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Mavzular — matndan tashqarida ham bosiladigan qilib. */}
      {post.hashtags.length > 0 && !post.isDeleted && draft === null && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.hashtags.map((tag) => (
            <Link
              key={tag}
              href={`/feed/tag/${tag}`}
              className="bg-secondary text-muted-foreground hover:text-foreground rounded-full px-2.5 py-1 text-xs transition-colors"
            >
              {`#${tag}`}
            </Link>
          ))}
        </div>
      )}

      {isShareOpen && onShared && (
        <ShareSheet
          post={post}
          onShared={onShared}
          onClose={() => setIsShareOpen(false)}
        />
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

/**
 * Lentadagi mahsulot tugmasi.
 *
 * To'liq ekranli pleyerdagidan farqi FONDA: u yerda video ustida
 * turadi va shaffof bo'lishi kerak, bu yerda esa kartochka ichida.
 */
function PostProductButton({
  product,
  showClicks,
  onClick,
}: {
  product: PostView['products'][number];
  /** Bosishlar sonini ko'rsatish — FAQAT post egasiga. */
  showClicks: boolean;
  onClick: () => void;
}) {
  const inner = (
    <>
      <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
        <ShoppingBag className="size-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{product.name}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {product.isAvailable ? `${formatTiyin(product.priceTiyin)} · ${product.shopName}` : "Hozir sotuvda yo'q"}
        </span>
      </span>

      {/*
        Bosishlar soni — sotuvchining ko'rsatkichi.

        Faqat post EGASIGA ko'rinadi: raqobatchi kimning qaysi
        videosi ishlayotganini kuzatib turmasligi kerak.
      */}
      {showClicks && product.clickCount > 0 && (
        <span
          className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs tabular-nums"
          title="Nechta odam ochdi"
        >
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          {product.clickCount}
        </span>
      )}

      {product.isAvailable && (
        <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">
          Ko&apos;rish
        </span>
      )}
    </>
  );

  if (!product.isAvailable) {
    return (
      <div className="border-border bg-secondary/40 flex items-center gap-3 rounded-xl border p-2.5 opacity-70">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/marketplace/p/${product.slug}`}
      onClick={onClick}
      className="border-border bg-secondary/40 hover:bg-secondary flex items-center gap-3 rounded-xl border p-2.5 transition-colors"
    >
      {inner}
    </Link>
  );
}
