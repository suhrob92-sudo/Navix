'use client';

import { AlertTriangle, Copy, Phone, Share2, ShieldCheck, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';

/**
 * Xavfsizlik oynasi.
 *
 * ── Nima uchun uchta tugma va aynan shu tartibda ──────────────────────
 * Tartib TEZLIK bo'yicha: eng tez yordam yuqorida.
 *
 *  1. 102 — politsiya. Bir bosishda va u BIZGA bog'liq emas: internet
 *     uzilsa ham ishlaydi;
 *  2. Safarni ulashish — yaqin odam kuzatib turadi;
 *  3. Navix'ga xabar — xodim ko'radi, lekin javob darhol kelmasligi
 *     mumkin.
 *
 * ── Nima uchun "SOS" tugmasi 102 dan YUQORIDA emas ────────────────────
 * Bizning xabarimiz favqulodda xizmat emas. Uni birinchi qo'yish
 * "Navix qutqaradi" degan yolg'on taassurot berardi va odam
 * politsiyaga qo'ng'iroq qilish o'rniga kutib o'tirardi.
 */

export interface SafetySheetProps {
  rideId: string;
  onClose: () => void;
}

export function SafetySheet({ rideId, onClose }: SafetySheetProps) {
  const request = useApiClient();

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const share = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      const result = await request<{ url: string }>(`/api/v1/taxi/rides/${rideId}/share`, {
        method: 'POST',
      });

      setShareUrl(result.url);

      /*
        Telefonning O'Z ulashish oynasi ochiladi — u odamga tanish
        va unda barcha ilovalar (Telegram, SMS) turadi.

        Qo'llab-quvvatlanmasa, havola ekranda qoladi va uni nusxalash
        mumkin — shuning uchun xato ushlanadi va e'tiborsiz
        qoldiriladi.
      */
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: 'Navix — safarimni kuzating',
            text: 'Men taksidaman. Safarimni shu havoladan kuzatishingiz mumkin:',
            url: result.url,
          });
        } catch {
          /* Odam ulashishni bekor qildi — bu xato emas. */
        }
      }
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsWorking(false);
    }
  }, [request, rideId]);

  const copy = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError('Nusxalash ishlamadi — havolani qo\'lda belgilang.');
    }
  }, [shareUrl]);

  const sendAlert = useCallback(async () => {
    setIsWorking(true);
    setError(null);

    try {
      await request(`/api/v1/taxi/rides/${rideId}/alert`, { method: 'POST' });
      setAlertSent(true);
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsWorking(false);
    }
  }, [request, rideId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/45 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Yopish" onClick={onClose} />

      <div className="bg-background mx-auto w-full max-w-lg rounded-t-3xl shadow-2xl">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="text-primary size-5" aria-hidden="true" />
            Xavfsizlik
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="hover:bg-secondary text-muted-foreground rounded-full p-2 transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/*
            102 — birinchi va eng yirik.

            Bu oddiy `tel:` havolasi: u ilovaga ham, internetga ham
            bog'liq emas va shuning uchun eng ishonchli yo'l.
          */}
          <a
            href="tel:102"
            className="bg-destructive text-destructive-foreground shadow-destructive/25 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-semibold shadow-lg transition-transform active:scale-[0.98]"
          >
            <Phone className="size-5" aria-hidden="true" />
            102 — politsiya
          </a>

          <Button fullWidth size="lg" variant="outline" onClick={share} disabled={isWorking}>
            <Share2 className="size-5" aria-hidden="true" />
            Safarni ulashish
          </Button>

          {shareUrl && (
            <div className="bg-secondary/60 space-y-2 rounded-2xl p-3">
              <p className="text-muted-foreground text-xs">
                Havolani yaqin odamingizga yuboring — u safarni jonli kuzatadi.
              </p>
              <p className="bg-background text-foreground/80 truncate rounded-xl px-3 py-2 font-mono text-xs">
                {shareUrl}
              </p>
              <Button fullWidth size="sm" variant="secondary" onClick={copy}>
                <Copy className="size-4" aria-hidden="true" />
                {copied ? 'Nusxalandi' : 'Nusxalash'}
              </Button>
            </div>
          )}

          {alertSent ? (
            <Alert variant="success">
              Xabar yuborildi. Qo&apos;llab-quvvatlash xizmati safar tafsilotlari va oxirgi
              joylashuvni ko&apos;rdi.
            </Alert>
          ) : (
            <Button
              fullWidth
              size="lg"
              variant="ghost"
              onClick={sendAlert}
              disabled={isWorking}
              isLoading={isWorking}
            >
              <AlertTriangle className="size-5" aria-hidden="true" />
              Navix&apos;ga xabar berish
            </Button>
          )}

          {error && <Alert variant="error">{error}</Alert>}

          {/*
            Rost gap: bizning xabarimiz favqulodda xizmat emas.

            Buni yozmasak, odam SOS bosib, yordam kelishini kutib
            o'tirardi.
          */}
          <p className="text-muted-foreground text-center text-[11px] leading-relaxed">
            Navix favqulodda xizmat emas. Hayotga xavf tug&apos;ilsa — avval 102 ga
            qo&apos;ng&apos;iroq qiling.
          </p>
        </div>
      </div>
    </div>
  );
}
