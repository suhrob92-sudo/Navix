'use client';

import { Navigation, NavigationOff } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatUzTime } from '@/lib/date';
import { useLocationShare } from '@/modules/courier/use-location-share';

/**
 * Joylashuvni ulashish — kuryerning TANLOVI.
 *
 * ── Nima uchun tugma, avtomatik emas ──────────────────────────────────
 * Joylashuvni so'ramasdan yig'ish texnik jihatdan mumkin edi. Lekin
 * u holda kuryer o'zi bilmagan holda kuzatuv ostida ishlagan bo'lardi.
 *
 * Bu yerda esa u nima bo'layotganini KO'RADI: nima yuborilishi, kimga
 * ko'rinishi va qachon to'xtashi.
 *
 * ── Nima uchun mijozga foydasi tushuntiriladi ─────────────────────────
 * "Yoqing" degan quruq talab qarshilik tug'diradi. Sabab aytilsa
 * ("mijoz sizni kutib turibdi va qo'ng'iroq qilmaydi") — kuryerning
 * o'ziga ham foydasi bor: bezovta qiluvchi qo'ng'iroqlar kamayadi.
 */

export interface LocationShareCardProps {
  deliveryId: string;
  /** Topshiriq hali kuryerning qo'lidami. */
  isActive: boolean;
}

export function LocationShareCard({ deliveryId, isActive }: LocationShareCardProps) {
  const share = useLocationShare(deliveryId, isActive);

  if (!isActive) return null;

  const isOn = share.status === 'SHARING' || share.status === 'ASKING';

  return (
    <section className="bg-card border-border rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className={
            isOn
              ? 'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white'
              : 'bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-full'
          }
          aria-hidden="true"
        >
          {isOn ? <Navigation className="size-4" /> : <NavigationOff className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            {isOn ? 'Joylashuv yuborilmoqda' : 'Joylashuvni ulashish'}
          </h2>

          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {isOn
              ? 'Mijoz sizni xaritada ko\'rib turibdi va yetib kelish vaqtini biladi. Topshiriq yakunlangach yuborish o\'zi to\'xtaydi.'
              : 'Yoqsangiz, mijoz sizni xaritada ko\'radi va "qayerdasiz?" deb qo\'ng\'iroq qilmaydi. Faqat shu topshiriq davomida ishlaydi.'}
          </p>

          {share.status === 'SHARING' && share.sentAt && (
            <p className="text-muted-foreground mt-2 text-xs tabular-nums">
              {`Oxirgi yuborilgan: ${formatUzTime(share.sentAt)}`}
            </p>
          )}

          {share.status === 'ASKING' && (
            <p className="text-muted-foreground mt-2 text-xs">Joylashuv aniqlanmoqda...</p>
          )}
        </div>
      </div>

      {share.error && (
        <Alert variant="warning" className="mt-3">
          {share.error}
        </Alert>
      )}

      <Button
        variant={isOn ? 'outline' : 'primary'}
        fullWidth
        className="mt-3"
        onClick={isOn ? share.stop : share.start}
      >
        {isOn ? "To'xtatish" : 'Joylashuvni yoqish'}
      </Button>
    </section>
  );
}
