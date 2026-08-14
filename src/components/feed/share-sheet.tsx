'use client';

import { Check, Copy, MessageCircle, Send, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { shareTitle, type PostView } from '@/modules/feed/feed.types';

export interface ShareSheetProps {
  post: PostView;
  /** Ulashish HAQIQATAN bo'lganda chaqiriladi — son shu yerda oshadi. */
  onShared: () => void;
  onClose: () => void;
}

/**
 * Ulashish oynasi.
 *
 * ── Nima uchun TELEGRAM birinchi ──────────────────────────────────────
 * O'zbekistonda odamlar havolani deyarli har doim Telegram orqali
 * yuboradi. Uni ro'yxatning tubiga qo'yish — eng ko'p ishlatiladigan
 * tugmani yashirish degani.
 *
 * ── Nima uchun "tizim ulashuvi" ham bor ───────────────────────────────
 * Telefonda `navigator.share` ilovaning O'Z ro'yxatini ochadi:
 * WhatsApp, Instagram, pochta — odam qaysi ilovani ishlatsa, o'shani
 * tanlaydi. Lekin u kompyuter brauzerlarida yo'q, shuning uchun
 * faqat mavjud bo'lganda ko'rsatiladi.
 *
 * ── Nima uchun nusxalash oxirida ──────────────────────────────────────
 * U ENG ishonchli yo'l: hech qanday ilova va ruxsat talab qilmaydi.
 * Shuning uchun u doim bor va hech qachon yo'qolmaydi.
 */
export function ShareSheet({ post, onShared, onClose }: ShareSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  /**
   * Manzil BRAUZERDAN olinadi.
   *
   * Serverda yozib qo'yilsa, u sinov, ishlab chiqish va ishchi
   * muhitda uch xil bo'lardi va bittasi albatta noto'g'ri qolib
   * ketardi.
   *
   * ── Nima uchun `useState` ning DASTLABKI qiymati ────────────────────
   * Effekt ichida hisoblansa, oyna avval bo'sh havola bilan
   * chizilib, keyin qayta chizilardi. Bu oyna esa faqat tugma
   * bosilganda paydo bo'ladi — ya'ni doim brauzerda.
   */
  const [link] = useState(() =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/feed/${post.id}`,
  );
  const [canUseSystemShare] = useState(
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
  );
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const title = shareTitle(post);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setIsCopied(true);
      onShared();

      // Belgi bir necha soniyadan keyin o'chadi — oyna ochiq qoladi.
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      /**
       * Nusxalash ishlamasa — maydon ko'rsatiladi.
       *
       * Ba'zi brauzerlar xavfsiz bo'lmagan ulanishda buferga
       * yozishga ruxsat bermaydi. Havolani ekranda ko'rsatib,
       * odam uni qo'lda nusxalay oladi.
       */
      setIsCopied(false);
    }
  }

  async function systemShare() {
    try {
      await navigator.share({ title: 'Navix', text: title, url: link });
      onShared();
      onClose();
    } catch {
      // Odam bekor qilgan bo'lishi mumkin — bu xato emas.
    }
  }

  function openTelegram() {
    const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    onShared();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Share2 className="size-4" aria-hidden="true" />
          Ulashish
        </h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={openTelegram}
          className="border-border hover:bg-secondary flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Send className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Telegram</span>
            <span className="text-muted-foreground block text-xs">Do&apos;stingizga yuboring</span>
          </span>
        </button>

        {canUseSystemShare && (
          <button
            type="button"
            onClick={() => void systemShare()}
            className="border-border hover:bg-secondary flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
          >
            <span className="bg-secondary text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <MessageCircle className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Boshqa ilovalar</span>
              <span className="text-muted-foreground block text-xs">WhatsApp, Instagram va boshqalar</span>
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => void copyLink()}
          className="border-border hover:bg-secondary flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
        >
          <span className="bg-secondary text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            {isCopied ? (
              <Check className="size-5 text-emerald-500" aria-hidden="true" />
            ) : (
              <Copy className="size-5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{isCopied ? 'Nusxalandi' : 'Havolani nusxalash'}</span>
            <span className="text-muted-foreground block truncate text-xs">{link}</span>
          </span>
        </button>
      </div>

      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        Havolani ochgan odam postni ko&apos;rish uchun Navix&apos;ga kirishi kerak bo&apos;ladi.
      </p>
    </dialog>
  );
}
