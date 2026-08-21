'use client';

import { Download, Share, X } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { PWA_SHORT_NAME } from '@/config/pwa';
import { useInstallPrompt } from '@/hooks/use-install-prompt';

/**
 * Xizmat ishchisini ro'yxatdan o'tkazadi va o'rnatish taklifini chizadi.
 *
 * ── Nima uchun ikkalasi BITTA komponentda ─────────────────────────────
 * Ular bir narsaning ikki tomoni: xizmat ishchisisiz ilovani
 * o'rnatib bo'lmaydi (brauzer talabi), taklifsiz esa xizmat
 * ishchisining o'rnatish qismi hech kimga ko'rinmaydi.
 *
 * Alohida qo'ysak, biri ulanib ikkinchisi unutilishi mumkin edi.
 */

export function PwaSetup() {
  const { state, install, dismiss } = useInstallPrompt();

  useEffect(() => {
    /*
      Xizmat ishchisi HAR OCHILGANDA ro'yxatdan o'tkaziladi.

      ── Nima uchun bu yerda ──────────────────────────────────────────
      Ilgari u faqat bildirishnomani yoqqanda ro'yxatdan o'tardi.
      Ya'ni bildirishnomani yoqmagan odamda ilova umuman
      keshlanmasdi va o'rnatilmasdi ham.

      `register` takroriy chaqiruvda yangi nusxa yaratmaydi —
      brauzer mavjudini qaytaradi.

      Xato YUTILADI: brauzer eski bo'lsa yoki foydalanuvchi
      "shaxsiy rejim"da bo'lsa, ilova baribir ishlashi kerak.
    */
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
  }, []);

  if (state === 'unknown' || state === 'unavailable') return null;

  const isManual = state === 'manual';

  return (
    <div
      /*
        Tasma pastki menyu USTIDA turadi.

        `above-tabbar` — menyu balandligi va telefon "iyagi"ni
        hisobga oladigan yagona sinf (`globals.css` da).
      */
      className="above-tabbar animate-fade-up fixed inset-x-0 z-40 px-4"
      role="complementary"
      aria-label="Ilovani o'rnatish"
    >
      <div className="bg-card border-border mx-auto flex max-w-lg items-center gap-3 rounded-2xl border p-3 shadow-lg">
        <span className="bg-secondary inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
          {isManual ? (
            <Share className="size-5" aria-hidden="true" />
          ) : (
            <Download className="size-5" aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{`${PWA_SHORT_NAME}ni o'rnatish`}</p>

          {/*
            iOS va Androidda matn BOSHQA.

            Androidda tugma bosiladi. iOS'da esa bunday tugmaning
            iloji yo'q — faqat yo'l ko'rsatish mumkin. Bir xil matn
            yozsak, iPhone egasi ishlamaydigan tugmani izlab
            yurardi.
          */}
          <p className="text-muted-foreground text-xs leading-relaxed">
            {isManual
              ? "Ulashish tugmasi → «Bosh ekranga qo'shish»"
              : 'Tezroq ochiladi va internetsiz ham ishga tushadi'}
          </p>
        </div>

        {!isManual && (
          <Button size="sm" onClick={() => void install()}>
            O&apos;rnatish
          </Button>
        )}

        <button
          type="button"
          aria-label="Yopish"
          onClick={dismiss}
          className="tap-target text-muted-foreground hover:text-foreground shrink-0 rounded-lg p-1 transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
