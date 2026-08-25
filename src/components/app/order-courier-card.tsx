'use client';

import { Bike, Phone } from 'lucide-react';

import { DeliveryMap } from '@/components/map/delivery-map';
import { Badge } from '@/components/ui/badge';
import { distanceKm, formatDistance, isLocationFresh, type Point } from '@/config/delivery-eta';
import { formatUzPhone } from '@/lib/phone';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_VARIANTS } from '@/modules/courier/courier.types';
import type { OrderCourierView } from '@/modules/food/food.types';

/**
 * Buyurtma sahifasidagi kuryer kartochkasi.
 *
 * Ovqat va Marketplace sahifalarida BIR XIL ko'rinadi — ikki nusxa
 * yozilsa, ertaga bittasi eskirib qolardi.
 *
 * ── Nima uchun telefon raqami bosiladigan ─────────────────────────────
 * Mijozning kuryerga qo'ng'iroq qilishi odatiy hol: "domofon
 * ishlamayapti", "eshik oldida turibman". Raqamni ko'chirib olishga
 * majbur qilish shu paytda ortiqcha to'siq.
 *
 * ── Nima uchun xarita AYNAN shu yerda ─────────────────────────────────
 * Xarita — kuryer haqidagi ma'lumot. Uni alohida kartochkaga
 * chiqarish ikkita bo'lim yasardi: birida kuryerning ismi, ikkinchisida
 * uning nuqtasi.
 *
 * Bu yerda esa ikkalasi ham bitta joyda va u Ovqat bilan Marketplace
 * sahifalarida BIR XIL ishlaydi — bitta kod, ikkita ekran.
 */
export interface OrderCourierCardProps {
  courier: OrderCourierView;
  /**
   * Yetkazish manzili — xarita uchun.
   *
   * Bo'sh bo'lsa xarita ko'rsatilmaydi: bitta nuqtali xarita
   * "kuryer qayerdadir" degandan boshqa hech narsa aytmasdi.
   */
  destination?: Point | null;
}

export function OrderCourierCard({ courier, destination = null }: OrderCourierCardProps) {
  /*
    ── Xarita QACHON ko'rsatiladi ──────────────────────────────────────
    Faqat kuryerning HAQIQIY va YANGI nuqtasi bo'lganda.

    Eski nuqta xaritada qotib qolgan bo'lardi (kuryerning telefoni
    o'chgan bo'lishi mumkin) va odam unga qarab eshikka chiqib,
    sovuqda kutib turardi.

    Bo'sh xarita ko'rsatib "kuryer yo'lda" deb yozish esa shunchaki
    bezak bo'lardi.
  */
  const isFresh = courier.point !== null && isLocationFresh(courier.reportedAt);
  const showMap = isFresh && courier.point !== null && destination !== null;

  const distanceText =
    showMap && courier.point && destination ? formatDistance(distanceKm(courier.point, destination)) : '';
  return (
    <section className="bg-card border-border rounded-2xl border p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Bike className="size-4" aria-hidden="true" />
        Kuryer
      </h2>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{courier.name ?? 'Kuryer'}</p>
        <Badge variant={DELIVERY_STATUS_VARIANTS[courier.status]} className="shrink-0">
          {DELIVERY_STATUS_LABELS[courier.status]}
        </Badge>
      </div>

      <a href={`tel:${courier.phone}`} className="text-primary mt-2 flex items-center gap-2 text-base font-medium">
        <Phone className="size-4 shrink-0" aria-hidden="true" />
        {formatUzPhone(courier.phone)}
      </a>

      {showMap && courier.point && destination && (
        <div className="mt-3">
          <DeliveryMap
            courier={courier.point}
            destination={destination}
            label={
              distanceText
                ? `Xarita: kuryer ${distanceText} uzoqlikda`
                : 'Xarita: kuryer va yetkazish manzili'
            }
          />

          {distanceText && (
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              {`Kuryer ${distanceText} uzoqlikda. Masofa to'g'ri chiziq bo'yicha o'lchangan — haqiqiy yo'l biroz uzunroq.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
