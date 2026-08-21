'use client';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PWA_START_URL } from '@/config/pwa';
import { useIsOnline } from '@/lib/network-state';

/**
 * Oflayn sahifadagi tugmalar.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Sahifaning o'zi serverda chiziladi va keshga yoziladi. Tugmalar
 * esa brauzer holatini kuzatadi (`online` hodisasi) — ya'ni ular
 * mijoz komponenti bo'lishi shart.
 *
 * Ikkalasini bitta faylga qo'ysak, butun sahifa mijoz komponentiga
 * aylanardi va u keshga OG'IRROQ tushardi.
 */
export function OfflineActions() {
  /*
    Aloqa holati YAGONA do'kondan olinadi (`lib/network-state.ts`).

    Ilgari bu yerda `useEffect` + `setState` turardi — u serverda
    boshqa, brauzerda boshqa natija berardi va loyihaning lint
    qoidasi ham buni taqiqlaydi.
  */
  const isOnline = useIsOnline();

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <Button
        size="lg"
        onClick={() => {
          /*
            Aloqa tiklangan bo'lsa — ASOSIY sahifaga.

            Odam bu yerga tasodifan tushgan: uning maqsadi
            ilovadan foydalanish edi. Shu sahifani "yangilash"
            uni yana shu yerda qoldirardi.
          */
          if (navigator.onLine) {
            window.location.href = PWA_START_URL;
            return;
          }

          window.location.reload();
        }}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Qayta urinish
      </Button>

      {/*
        Aloqa tiklanganini DARHOL aytamiz.

        Odam tugmani bosishdan oldin ham biladi va behuda
        kutib o'tirmaydi.
      */}
      <p className="text-muted-foreground h-4 text-xs">
        {isOnline ? 'Aloqa tiklandi — davom etishingiz mumkin' : ''}
      </p>
    </div>
  );
}
