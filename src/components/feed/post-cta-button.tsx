'use client';

import { ExternalLink, MousePointerClick } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useApiClient } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { POST_CTA_CONFIG, ctaHref } from '@/config/post-cta';
import type { PostView } from '@/modules/feed/feed.types';

export interface PostCtaButtonProps {
  post: PostView;
  /**
   * Video USTIDA turibdimi.
   *
   * To'liq ekranli pleyerda tugma qora kadr ustida turadi va u yerda
   * oq matn kerak. Lentada esa kartochka ichida.
   */
  onVideo?: boolean;
}

/**
 * Videoning chaqiruv tugmasi.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * Ko'p video hech narsa sotmaydi. Bloger kulgili video joylaydi, usta
 * ish jarayonini ko'rsatadi. Ular ham bir narsaga chorlaydi — faqat
 * sotuvga emas.
 *
 * Chaqiruvsiz video tomosha bilan tugaydi: odam yoqtiradi va suradi.
 * Muallif esa hech narsa olmaydi.
 *
 * ── Nima uchun chaqiruv O'Z postida ko'rinmaydi ───────────────────────
 * "O'zingizga obuna bo'ling" degan tugma kulgili bo'lardi. O'z postini
 * ko'rayotgan muallif faqat SONNI ko'radi — tugmani emas.
 *
 * ── Nima uchun tashqi havolada ogohlantirish bor ──────────────────────
 * Odam ilovadan chiqib ketayotganini bilishi kerak. Buni yashirsak,
 * Telegramga tushib qolgan odam "Navix buzildimi?" deb o'ylardi.
 */
export function PostCtaButton({ post, onVideo = false }: PostCtaButtonProps) {
  const router = useRouter();
  const request = useApiClient();

  const [isBusy, setIsBusy] = useState(false);

  const cta = post.cta;

  if (!cta) return null;

  const config = POST_CTA_CONFIG[cta.kind];
  const Icon = config.icon;

  /*
    O'z postida tugma o'rniga faqat SON ko'rsatiladi.

    Muallif uchun bu ko'rsatkich: "chaqiruvim ishlayaptimi?".
  */
  if (post.isMine) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-xs',
          onVideo ? 'border-white/25 text-white/80' : 'border-border text-muted-foreground',
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{config.action}</span>

        <span className="flex shrink-0 items-center gap-1 tabular-nums" title="Nechta odam bosdi">
          <MousePointerClick className="size-3.5" aria-hidden="true" />
          {cta.clickCount}
        </span>
      </div>
    );
  }

  /**
   * Bosish SANALADI, keyin amal bajariladi.
   *
   * ── Nima uchun javob KUTILMAYDI ─────────────────────────────────────
   * Bosilgan zahoti odam boshqa sahifaga o'tishi kerak. Javobni kutish
   * o'tishni sekinlashtirardi, foyda esa yo'q: son muallifga keyin
   * kerak bo'ladi, hozir emas.
   */
  function countClick() {
    void request(`/api/v1/posts/${post.id}/cta/click`, { method: 'POST', body: {} }).catch(() => {});
  }

  /**
   * Suhbat ochish — IKKI qadamli amal.
   *
   * Avval suhbat yaratiladi (yoki mavjudi olinadi), keyin uning
   * sahifasiga o'tiladi. Oddiy havola bilan bo'lmasdi: suhbat ID si
   * oldindan noma'lum.
   */
  async function openChat() {
    if (isBusy) return;

    setIsBusy(true);
    countClick();

    try {
      const result = await request<{ conversationId: string }>('/api/v1/chat/conversations', {
        method: 'POST',
        body: { username: post.author.username },
      });

      router.push(`/messages/${result.conversationId}`);
    } catch {
      /*
        Xato bo'lsa profilga o'tiladi.

        U yerda ham "Xabar yozish" tugmasi bor. Bo'sh ekranda
        qoldirishdan ko'ra, odamni maqsadiga yaqinlashtirgan
        ma'qul.
      */
      router.push(`/u/${post.author.username}`);
    } finally {
      setIsBusy(false);
    }
  }

  const className = cn(
    'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
    onVideo
      ? 'border-white/20 bg-black/40 backdrop-blur-sm hover:bg-black/60'
      : 'border-border bg-secondary/40 hover:bg-secondary',
    isBusy && 'pointer-events-none opacity-60',
  );

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

      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-medium', onVideo && 'text-white')}>
          {config.action}
        </span>

        {/*
          Tashqi havolada MANZIL ko'rsatiladi.

          "Telegramda ochish" degan yozuvning o'zi qayerga
          borishini aytmaydi. Nom esa aniq: odam bosishdan oldin
          kimga borayotganini biladi.
        */}
        {cta.value && (
          <span className={cn('block truncate text-xs', onVideo ? 'text-white/70' : 'text-muted-foreground')}>
            {config.isExternal ? `@${cta.value}` : cta.value}
          </span>
        )}
      </span>

      {config.isExternal && (
        <ExternalLink
          className={cn('size-4 shrink-0', onVideo ? 'text-white/70' : 'text-muted-foreground')}
          aria-label="Ilovadan tashqariga"
        />
      )}
    </>
  );

  // Obuna va suhbat — ilova ICHIDAGI amallar.
  if (cta.kind === 'MESSAGE') {
    return (
      <button type="button" onClick={() => void openChat()} className={className} disabled={isBusy}>
        {inner}
      </button>
    );
  }

  if (cta.kind === 'FOLLOW') {
    return (
      <button
        type="button"
        onClick={() => {
          countClick();
          router.push(`/u/${post.author.username}`);
        }}
        className={className}
      >
        {inner}
      </button>
    );
  }

  const href = ctaHref(cta.kind, cta.value);

  if (!href) return null;

  return (
    <a
      href={href}
      onClick={countClick}
      /*
        Tashqi havola YANGI oynada.

        `noopener` majburiy: usiz ochilgan sahifa `window.opener`
        orqali bizning sahifamizni boshqa manzilga yo'naltira olardi.
      */
      {...(config.isExternal ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {})}
      className={className}
    >
      {inner}
    </a>
  );
}
