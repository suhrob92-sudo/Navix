/* eslint-disable @next/next/no-img-element */
'use client';

import { BadgeCheck, Eye, Flag, ShoppingBag, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ReportDialog } from '@/components/moderation/report-dialog';
import { StoryViewers } from '@/components/story/story-viewers';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useApiClient } from '@/hooks/use-api';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { authorDisplayName } from '@/modules/feed/feed.types';
import {
  remainingLabel,
  storyDurationSeconds,
  type StoryGroupView,
  type StoryView,
} from '@/modules/story/story.types';

export interface StoryViewerProps {
  groups: StoryGroupView[];
  /** Qaysi odamdan boshlanadi. */
  startIndex: number;
  onClose: () => void;
}

/** Progress chizig'i qanchalik tez-tez yangilanadi (millisekund). */
const TICK_MS = 50;

/**
 * To'liq ekranli hikoya ko'ruvchisi.
 *
 * ── Nima uchun tepada CHIZIQLAR ───────────────────────────────────────
 * Odam hikoyani ochganda ikki narsani bilishi kerak: bu odamda nechta
 * hikoya bor va hozirgisi qachon tugaydi. Chiziqlar ikkalasiga ham
 * bir vaqtda javob beradi va hech qanday matn talab qilmaydi.
 *
 * ── Nima uchun EKRANNING chap-o'ng yarmi ──────────────────────────────
 * Telefonda tugmalar kichkina bo'ladi va ularni barmoq bilan urish
 * qiyin. Ekranning yarmi esa ulkan nishon: chapga bossa — orqaga,
 * o'ngga bossa — oldinga.
 *
 * ── Nima uchun BOSIB TURSA to'xtaydi ──────────────────────────────────
 * Matnni o'qishga yoki mahsulotni ko'rishga besh soniya kam bo'lishi
 * mumkin. Bosib turish — buni to'xtatishning eng tabiiy yo'li va u
 * hech qanday tugmani talab qilmaydi.
 */
export function StoryViewer({ groups, startIndex, onClose }: StoryViewerProps) {
  const request = useApiClient();

  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const [isViewersOpen, setIsViewersOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReported, setIsReported] = useState(false);

  /** O'chirilgan hikoyalar — ekrandan darhol yo'qoladi. */
  const [removed, setRemoved] = useState<string[]>([]);

  /** Serverga "ko'rildi" BIR MARTA yuboriladi. */
  const seenRef = useRef(new Set<string>());

  const group = groups[groupIndex];
  const stories = (group?.stories ?? []).filter((story) => !removed.includes(story.id));
  const story = stories[storyIndex];

  /** Keyingi odamga o'tish yoki yopish. */
  const nextGroup = useCallback(() => {
    setProgress(0);
    setStoryIndex(0);

    if (groupIndex + 1 < groups.length) {
      setGroupIndex(groupIndex + 1);

      return;
    }

    onClose();
  }, [groupIndex, groups.length, onClose]);

  const next = useCallback(() => {
    setProgress(0);

    if (storyIndex + 1 < stories.length) {
      setStoryIndex(storyIndex + 1);

      return;
    }

    nextGroup();
  }, [storyIndex, stories.length, nextGroup]);

  const previous = useCallback(() => {
    setProgress(0);

    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);

      return;
    }

    if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    }
  }, [storyIndex, groupIndex]);

  /** Ko'rildi deb belgilash — o'z hikoyasi sanalmaydi. */
  useEffect(() => {
    if (!story || story.isMine) return;
    if (seenRef.current.has(story.id)) return;

    seenRef.current.add(story.id);

    /**
     * Javob KUTILMAYDI va xato YUTILADI.
     *
     * "Ko'rildi" belgisi — yordamchi ma'lumot. Uning yiqilishi
     * tomoshani to'xtatmasligi kerak.
     */
    void request(`/api/v1/stories/${story.id}/seen`, { method: 'POST', body: {} }).catch(() => {});
  }, [story, request]);

  /** Vaqt o'tishi — progress chizig'i va avtomatik o'tish. */
  useEffect(() => {
    if (!story || isPaused || isViewersOpen || isDeleteOpen || isReportOpen) return;

    const durationMs = storyDurationSeconds(story) * 1000;

    const timer = setInterval(() => {
      setProgress((current) => {
        const value = current + (TICK_MS / durationMs) * 100;

        if (value >= 100) return 100;

        return value;
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [story, isPaused, isViewersOpen, isDeleteOpen, isReportOpen]);

  /**
   * Chiziq to'lgach keyingisiga o'tiladi.
   *
   * ── Nima uchun ALOHIDA effekt ───────────────────────────────────────
   * O'tishni yuqoridagi taymer ichida chaqirish mumkin edi, lekin
   * unda holat yangilanayotgan paytda boshqa holat o'zgartirilardi —
   * React buni ataylab man qiladi.
   */
  useEffect(() => {
    if (progress < 100) return;

    const timer = setTimeout(next, 0);

    return () => clearTimeout(timer);
  }, [progress, next]);

  /** Klaviatura — kompyuterda ham qulay bo'lishi uchun. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, onClose]);

  /**
   * Guruhda hikoya qolmasa — keyingisiga o'tiladi.
   *
   * ── Nima uchun `setTimeout` ─────────────────────────────────────────
   * O'tish holatni o'zgartiradi. Uni effekt ichida TO'G'RIDAN-TO'G'RI
   * chaqirish — chizish paytida qayta chizishga buyruq berish degani
   * va React buni ataylab man qiladi.
   *
   * Nol kechikish esa amalni keyingi navbatga suradi: chizish
   * tugaydi, keyin o'tish bajariladi.
   */
  useEffect(() => {
    if (!group || stories.length > 0) return;

    const timer = setTimeout(nextGroup, 0);

    return () => clearTimeout(timer);
  }, [group, stories.length, nextGroup]);

  async function remove() {
    if (!story) return;

    setIsDeleteOpen(false);
    setRemoved((current) => [...current, story.id]);
    setProgress(0);

    try {
      await request(`/api/v1/stories/${story.id}`, { method: 'DELETE' });
    } catch {
      // Ataylab jim: hikoya ekrandan ketdi, xato matni bu yerda ortiqcha.
    }
  }

  if (!group || !story) return null;

  const name = authorDisplayName(group.author);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Tepadagi chiziqlar — nechta hikoya va qaysi biri. */}
      <div className="flex gap-1 px-3 pt-3">
        {stories.map((item, index) => (
          <span key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <span
              className="block h-full bg-white"
              style={{
                width: index < storyIndex ? '100%' : index === storyIndex ? `${progress}%` : '0%',
              }}
            />
          </span>
        ))}
      </div>

      {/* Muallif va amallar. */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        <Link href={`/u/${group.author.username}`} onClick={onClose} className="shrink-0">
          <Avatar src={group.author.avatarUrl} name={group.author.fullName} size="sm" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-white">{name}</span>
            {group.author.isVerified && (
              <BadgeCheck className="size-3.5 shrink-0 text-white" aria-label="Tasdiqlangan profil" />
            )}
          </p>
          <p className="text-xs text-white/60">{remainingLabel(story.expiresAt)}</p>
        </div>

        {story.isMine ? (
          <button
            type="button"
            aria-label="Hikoyani o'chirish"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-full bg-white/15 p-2 text-white transition-transform active:scale-95"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Shikoyat qilish"
            onClick={() => setIsReportOpen(true)}
            className="rounded-full bg-white/15 p-2 text-white transition-transform active:scale-95"
          >
            <Flag className="size-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          aria-label="Yopish"
          onClick={onClose}
          className="rounded-full bg-white/15 p-2 text-white transition-transform active:scale-95"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Hikoyaning o'zi. */}
      <div className="relative flex-1 overflow-hidden">
        {story.videoUrl ? (
          <video
            key={story.id}
            src={story.videoUrl}
            poster={story.videoPosterUrl ?? undefined}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <img src={story.imageUrl ?? ''} alt="" className="h-full w-full object-contain" />
        )}

        {/*
          Bosiladigan yarmlar — video USTIDA turadi.

          Ular ko'rinmaydi, lekin butun ekranni qoplaydi: barmoq
          qayerga tushishidan qat'i nazar amal bajariladi.
        */}
        <button
          type="button"
          aria-label="Oldingi hikoya"
          className="absolute inset-y-0 left-0 w-1/3 cursor-default"
          onClick={previous}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        />

        <button
          type="button"
          aria-label="Keyingi hikoya"
          className="absolute inset-y-0 right-0 w-2/3 cursor-default"
          onClick={next}
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        />

        {isReported && (
          <p className="pointer-events-none absolute inset-x-0 top-2 text-center text-xs text-white">
            Shikoyat yuborildi.
          </p>
        )}
      </div>

      {/* Pastdagi qism: izoh, mahsulot va ko'ruvchilar. */}
      <div
        className="space-y-3 px-4 pt-3"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        {story.caption.length > 0 && (
          <p className="line-clamp-3 text-sm leading-relaxed text-white/90">{story.caption}</p>
        )}

        {story.product && <StoryProductButton product={story.product} onNavigate={onClose} />}

        {/*
          Ko'ruvchilar tugmasi FAQAT o'z hikoyasida.

          Boshqa odamning hikoyasini kim ko'rgani hech kimga
          tegishli emas.
        */}
        {story.isMine && (
          <button
            type="button"
            onClick={() => setIsViewersOpen(true)}
            className="flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white"
          >
            <Eye className="size-4" aria-hidden="true" />
            <span className="tabular-nums">{story.viewCount}</span>
            <span>kishi ko&apos;rdi</span>
          </button>
        )}
      </div>

      {isViewersOpen && (
        <StoryViewers storyId={story.id} onClose={() => setIsViewersOpen(false)} />
      )}

      <ConfirmDialog
        open={isDeleteOpen}
        title="Hikoya o'chirilsinmi?"
        description="Hikoya darhol yo'qoladi. Buni qaytarib bo'lmaydi."
        confirmLabel="O'chirish"
        isDestructive
        onConfirm={() => void remove()}
        onCancel={() => setIsDeleteOpen(false)}
      />

      {isReportOpen && (
        <ReportDialog
          subject={`${name} ning hikoyasi`}
          onSubmit={(reason, note) => {
            setIsReportOpen(false);

            void request(`/api/v1/stories/${story.id}/report`, {
              method: 'POST',
              body: { reason, ...(note.trim() ? { note: note.trim() } : {}) },
            })
              .then(() => setIsReported(true))
              .catch(() => {});
          }}
          onCancel={() => setIsReportOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Hikoyadagi mahsulot tugmasi.
 *
 * ── Nima uchun hikoyada ham bor ──────────────────────────────────────
 * Hikoya — eng tez ishlaydigan reklama joyi: u obunachilarning
 * lentasi tepasida turadi va ular uni ochadi. Tugmasiz hikoyada
 * mahsulot ko'rsatilsa, odam uni qayerdan olishni bilmasdi.
 */
function StoryProductButton({
  product,
  onNavigate,
}: {
  product: NonNullable<StoryView['product']>;
  onNavigate: () => void;
}) {
  const inner = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <ShoppingBag className="size-5 text-white" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-white">{product.name}</span>
        <span className="text-xs text-white/70">
          {product.isAvailable ? `${formatTiyin(product.priceTiyin)} · ${product.shopName}` : "Hozir sotuvda yo'q"}
        </span>
      </span>

      {product.isAvailable && (
        <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black">
          Ko&apos;rish
        </span>
      )}
    </>
  );

  const className = cn(
    'flex items-center gap-3 rounded-2xl bg-white/10 p-2.5 backdrop-blur-md',
    product.isAvailable && 'transition-transform active:scale-[0.98]',
  );

  if (!product.isAvailable) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <Link href={`/marketplace/p/${product.slug}`} onClick={onNavigate} className={className}>
      {inner}
    </Link>
  );
}
