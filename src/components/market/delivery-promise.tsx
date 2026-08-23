'use client';

import { Truck } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { cutoffNotice, deliveryPromise } from '@/config/delivery-date';
import { cn } from '@/lib/utils';

/**
 * "Yetkazish — ertaga" qatori.
 *
 * ── Nima uchun bu ENG MUHIM qator ─────────────────────────────────────
 * Xaridorning eng katta savoli — "qachon keladi?". Ilgari sahifada
 * faqat "2 kunda yetkaziladi" degan kichik kulrang matn turardi.
 *
 * "2 kunda" va "5-avgust, chorshanba" bir xil narsa emas: birinchisi
 * odamni sanashga majbur qiladi va u ko'pincha adashadi.
 *
 * ── Nima uchun `useSyncExternalStore` ─────────────────────────────────
 * Sana HOZIRGI vaqtga bog'liq. Serverda chizilgan sahifa va
 * brauzerdagi sahifa boshqa vaqtni ko'rsatishi mumkin (masalan
 * sahifa 17:59 da yasalib, 18:01 da ochilsa) — va React buni
 * "hydration mismatch" xatosi deb baqirardi.
 *
 * `useSyncExternalStore` aynan shu holat uchun: server tomonida u
 * `null` qaytaradi, brauzerda esa haqiqiy vaqtni. Loyihadagi
 * `use-mounted` va `use-install-prompt` ham shu usulda ishlaydi.
 */

const NO_CHANGES = () => () => {};

export interface DeliveryPromiseProps {
  /** Do'kon va'da qilgan kunlar soni. */
  deliveryDays: number;
  className?: string;
}

export function DeliveryPromise({ deliveryDays, className }: DeliveryPromiseProps) {
  /**
   * Brauzerda `true`, serverda `false`.
   *
   * Sana faqat brauzerda hisoblanadi — shunda ikkala tomon bir xil
   * narsani chizadi va xato chiqmaydi.
   */
  const isClient = useSyncExternalStore(
    NO_CHANGES,
    () => true,
    () => false,
  );

  if (!isClient) {
    /*
      Serverda joy BAND qilinadi: aks holda sahifa yuklanganda
      matn birdan paydo bo'lib, ostidagi hamma narsani pastga
      surib yuborardi.
    */
    return <div className={cn('h-11', className)} aria-hidden="true" />;
  }

  const notice = cutoffNotice();

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Truck className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />

      <div className="min-w-0">
        <p className="text-sm font-semibold">{deliveryPromise(deliveryDays)}</p>

        {notice && <p className="text-muted-foreground mt-0.5 text-xs">{notice}</p>}
      </div>
    </div>
  );
}
