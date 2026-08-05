'use client';

import { Bike, Phone } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
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
 */
export interface OrderCourierCardProps {
  courier: OrderCourierView;
}

export function OrderCourierCard({ courier }: OrderCourierCardProps) {
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
    </section>
  );
}
