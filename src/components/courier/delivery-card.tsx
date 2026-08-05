'use client';

import { ChevronRight, MapPin, Package, Store, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { ServiceIcon } from '@/components/app/service-icon';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import {
  DELIVERY_KIND_LABELS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_VARIANTS,
  type DeliveryView,
} from '@/modules/courier/courier.types';

/**
 * Topshiriq kartochkasi — umumiy ro'yxatda ham, kuryerning o'z
 * ro'yxatida ham bir xil ko'rinadi.
 *
 * ── Nima uchun HAQ eng katta yozilgan ─────────────────────────────────
 * Kuryer ro'yxatni ko'zdan kechirganda birinchi qaraydigan narsa —
 * qancha to'lanadi. Manzil va tarkib keyin keladi. Shuning uchun
 * summa kartochkaning eng ko'zga tashlanadigan qismida.
 */
export interface DeliveryCardProps {
  delivery: DeliveryView;
  /** Ro'yxatda ochilish animatsiyasini kechiktirish uchun. */
  index?: number;
}

export function DeliveryCard({ delivery, index = 0 }: DeliveryCardProps) {
  const KindIcon = delivery.kind === 'FOOD' ? UtensilsCrossed : Package;

  return (
    <Link
      href={`/courier/deliveries/${delivery.id}`}
      className="bg-card border-border animate-fade-up block rounded-2xl border p-3 transition-transform active:scale-[0.99]"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <div className="flex items-start gap-3">
        <ServiceIcon icon={KindIcon} color={delivery.pickup.color} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-sm font-semibold">{delivery.pickup.name}</p>
            <Badge variant="secondary" className="shrink-0">
              {DELIVERY_KIND_LABELS[delivery.kind]}
            </Badge>
          </div>

          <p className="text-muted-foreground mt-0.5 flex items-start gap-1.5 text-xs leading-relaxed">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2">{delivery.dropoffAddress}</span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          {/* Haq — kuryer birinchi qaraydigan raqam */}
          <p className="text-base font-semibold tabular-nums">{formatTiyin(delivery.fee)}</p>
          <p className="text-muted-foreground text-xs">{formatRelativeUz(delivery.createdAt)}</p>
        </div>

        <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
      </div>

      <div className="border-border/60 mt-2.5 flex items-center justify-between gap-2 border-t pt-2.5">
        <span className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
          <Store className="size-3.5 shrink-0" aria-hidden="true" />
          {`${delivery.items.length} xil · ${formatTiyin(delivery.orderTotal)}`}
        </span>

        <Badge variant={DELIVERY_STATUS_VARIANTS[delivery.status]} className="shrink-0">
          {DELIVERY_STATUS_LABELS[delivery.status]}
        </Badge>
      </div>
    </Link>
  );
}
