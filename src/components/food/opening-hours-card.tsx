'use client';

import { ChevronDown, Clock } from 'lucide-react';
import { useState } from 'react';

import { buildSchedule } from '@/config/opening-hours';
import { cn } from '@/lib/utils';
import type { RestaurantHoursView } from '@/modules/food/food.types';

/**
 * Haftalik ish vaqti.
 *
 * ── Nima uchun YIG'ILGAN holda turadi ─────────────────────────────────
 * Odamning asosiy savoli — "hozir ochiqmi?". Unga javob sarlavhada
 * allaqachon bor.
 *
 * To'liq jadval esa kamdan-kam kerak bo'ladi: "ertaga ertalab
 * olsam bo'ladimi" degan savol tug'ilganda. Uni doim ochiq holda
 * ko'rsatish menyuni pastga surib yuborardi.
 *
 * ── Nima uchun BUGUNGI qator ajratilgan ───────────────────────────────
 * Jadval ochilganda odam avval o'z kunini izlaydi. Uni qalin qilib
 * ko'rsatish bu izlashni bekor qiladi.
 */

export interface OpeningHoursCardProps {
  hours: readonly RestaurantHoursView[];
  /** Sarlavhada ko'rinadigan qisqa holat: "22:00 gacha ochiq". */
  summary: string;
  className?: string;
}

export function OpeningHoursCard({ hours, summary, className }: OpeningHoursCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Jadval kiritilmagan bo'lsa, ko'rsatadigan narsa yo'q.
  if (hours.length === 0) return null;

  const rows = buildSchedule(hours);

  return (
    <section className={cn('bg-card border-border rounded-2xl border', className)}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <Clock className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Ish vaqti</span>
          <span className="text-muted-foreground block text-xs">{summary}</span>
        </span>

        <ChevronDown
          className={cn(
            'text-muted-foreground size-4 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <dl className="border-border/60 animate-slide-up space-y-2 border-t px-4 py-3">
          {rows.map((row) => (
            <div key={row.days} className="flex items-baseline justify-between gap-3 text-sm">
              <dt className={cn('text-muted-foreground', row.isToday && 'text-foreground font-medium')}>
                {row.days}
              </dt>
              <dd
                className={cn(
                  'tabular-nums',
                  row.isToday ? 'font-medium' : 'text-muted-foreground',
                  row.time === 'Dam olish' && 'text-muted-foreground',
                )}
              >
                {row.time}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
