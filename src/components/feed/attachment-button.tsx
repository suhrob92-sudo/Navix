'use client';

import { MousePointerClick } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { ATTACHMENT_KIND_CONFIG } from '@/config/attachments';
import type { PostAttachmentView } from '@/modules/feed/feed.types';

export interface AttachmentButtonProps {
  attachment: PostAttachmentView;
  /** Bosishlar sonini ko'rsatish — FAQAT post egasiga. */
  showClicks?: boolean;
  onClick?: () => void;
  /**
   * Video USTIDA turibdimi.
   *
   * To'liq ekranli pleyerda tugma qora kadr ustida turadi va u yerda
   * oq matn kerak. Lentada esa kartochka ichida — u yerda odatiy
   * ranglar ishlatiladi.
   */
  onVideo?: boolean;
}

/**
 * Videoga biriktirilgan narsa tugmasi.
 *
 * ── Nima uchun BITTA komponent hamma tur uchun ────────────────────────
 * Mahsulot, taom, restoran, ish e'loni va mehmonxona ekranda bir xil
 * ko'rinadi: belgi, nom, ostida bir qator va o'ngda harakat tugmasi.
 *
 * Farq faqat MATNDA va u `src/config/attachments.ts` dan olinadi —
 * ya'ni yangi tur qo'shilganda bu fayl umuman o'zgarmaydi.
 *
 * ── Nima uchun tugmadagi FE'L turga qarab boshqacha ───────────────────
 * Tomoshabin bosishdan oldin nima bo'lishini bilishi kerak.
 * "Ko'rish" hech narsa va'da qilmaydi; "Buyurtma berish" va "Ariza
 * yuborish" esa aniq. Aniq fe'l kutilmagan sahifaga tushishning
 * oldini oladi.
 */
export function AttachmentButton({
  attachment,
  showClicks = false,
  onClick,
  onVideo = false,
}: AttachmentButtonProps) {
  const config = ATTACHMENT_KIND_CONFIG[attachment.kind];
  const Icon = config.icon;

  const inner = (
    <>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg',
          onVideo ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 text-left">
        <span className={cn('block truncate text-sm font-medium', onVideo && 'text-white')}>
          {attachment.name}
        </span>

        <span className={cn('block truncate text-xs', onVideo ? 'text-white/70' : 'text-muted-foreground')}>
          {/*
            Yopilgan bo'lsa SABAB aytiladi.

            Nomi va narxi qolib, tugma ishlamasa, odam telefonini
            aybdor deb o'ylardi.
          */}
          {attachment.isAvailable ? (attachment.subtitle ?? config.label) : 'Hozir mavjud emas'}
        </span>
      </span>

      {/*
        Bosishlar soni — muallifning ko'rsatkichi.

        Faqat post EGASIGA ko'rinadi: raqobatchi kimning qaysi
        videosi ishlayotganini kuzatib turmasligi kerak.
      */}
      {showClicks && attachment.clickCount > 0 && (
        <span
          className={cn(
            'flex shrink-0 items-center gap-1 text-xs tabular-nums',
            onVideo ? 'text-white/70' : 'text-muted-foreground',
          )}
          title="Nechta odam ochdi"
        >
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          {attachment.clickCount}
        </span>
      )}

      {attachment.isAvailable && (
        <span className="bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold">
          {config.action}
        </span>
      )}
    </>
  );

  if (!attachment.isAvailable) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border p-2.5 opacity-70',
          onVideo ? 'border-white/20 bg-black/40 backdrop-blur-sm' : 'border-border bg-secondary/40',
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={config.href(attachment.slug)}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-2.5 transition-colors',
        onVideo
          ? 'border-white/20 bg-black/40 backdrop-blur-sm hover:bg-black/60'
          : 'border-border bg-secondary/40 hover:bg-secondary',
      )}
    >
      {inner}
    </Link>
  );
}
