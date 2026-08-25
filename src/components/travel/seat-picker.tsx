'use client';

import { Armchair } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { buildSeatMap, sortSeats, toggleSeat, unknownTakenSeats } from '@/config/seat-map';
import type { TransportName } from '@/config/travel';
import { cn } from '@/lib/utils';

/**
 * O'rindiq tanlash xaritasi.
 *
 * ── Nima uchun XARITA, ro'yxat emas ───────────────────────────────────
 * Bo'sh o'rinlarni ro'yxat qilib berish mumkin edi: "3, 7, 12, 15…".
 * Lekin odam o'rinni raqami uchun tanlamaydi — u JOYI uchun
 * tanlaydi: deraza yonimi, oldindami, yonma-yon o'tira olamizmi.
 *
 * Ro'yxat bu savollarning hech biriga javob bermaydi.
 *
 * ── Nima uchun oldinda "haydovchi" belgisi yo'q ───────────────────────
 * Chizsak, xarita haqiqiy sxemaga o'xshab qolardi. Bizda esa
 * tashuvchining haqiqiy sxemasi YO'Q — faqat o'rinlar soni bor.
 *
 * Ya'ni "1-o'rin oldinda" degan taxmin noto'g'ri bo'lishi mumkin.
 * Shuning uchun xarita ochiq-oydin oddiy to'r bo'lib qoladi va
 * hech narsani va'da qilmaydi.
 */

export interface SeatPickerProps {
  transport: TransportName;
  totalSeats: number;
  /** Band o'rinlar — serverdan. */
  takenSeats: readonly string[];
  /** Sotilgan o'rinlarning umumiy soni — eski chiptalar bilan birga. */
  soldSeats: number;
  selected: string[];
  onChange: (next: string[]) => void;
  /** Nechta o'rin tanlash kerak. */
  maxSeats: number;
  className?: string;
}

export function SeatPicker({
  transport,
  totalSeats,
  takenSeats,
  soldSeats,
  selected,
  onChange,
  maxSeats,
  className,
}: SeatPickerProps) {
  const rows = buildSeatMap(transport, totalSeats);
  const taken = new Set(takenSeats);
  const unknown = unknownTakenSeats(soldSeats, takenSeats.length);

  if (rows.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Armchair className="size-4" aria-hidden="true" />
          O&apos;rin tanlash
        </h3>

        <span className="text-muted-foreground text-xs tabular-nums">
          {`${selected.length} / ${maxSeats}`}
        </span>
      </div>

      {/*
        ── Eski chiptalar haqida OCHIQ aytiladi ────────────────────
        Ular xaritada band deb ko'rsatilmaydi, chunki qaysi o'rin
        ekani ma'lum emas. Jim qolish esa "xaritada hammasi
        ko'rinadi" degan yolg'on taassurot berardi.
      */}
      {unknown > 0 && (
        <Alert variant="info" className="mt-3">
          {`Yana ${unknown} ta o'rin band, lekin qaysi biri ekani ma'lum emas — ular eski chiptalar. Xaritadan tanlagan o'rningiz band chiqishi mumkin.`}
        </Alert>
      )}

      <div className="border-border mt-3 overflow-x-auto rounded-2xl border p-3">
        <div className="inline-flex min-w-full flex-col gap-1.5">
          {rows.map((row) => (
            <div key={row.index} className="flex items-center gap-1.5">
              {/* Qator raqami — odam xaritada o'zini yo'qotmasin. */}
              <span className="text-muted-foreground w-5 shrink-0 text-right text-[0.625rem] tabular-nums">
                {row.index}
              </span>

              {row.seats.map((seat) => {
                const isTaken = taken.has(seat.number);
                const isSelected = selected.includes(seat.number);

                return (
                  <span key={seat.number} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isTaken}
                      aria-pressed={isSelected}
                      aria-label={
                        isTaken ? `${seat.number} — band` : `${seat.number} — o'rin tanlash`
                      }
                      onClick={() => onChange(toggleSeat(selected, seat.number, maxSeats))}
                      className={cn(
                        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg border text-[0.6875rem] font-medium transition-colors',
                        isTaken
                          ? 'border-border bg-muted text-muted-foreground/50 cursor-not-allowed line-through'
                          : isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:border-primary/50',
                      )}
                    >
                      {seat.number}
                    </button>

                    {/* Yo'lak — bo'sh joy, bosiladigan element emas. */}
                    {seat.aisleAfter && <span className="w-3 shrink-0" aria-hidden="true" />}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="border-border inline-block size-3 rounded border" aria-hidden="true" />
          Bo&apos;sh
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-primary inline-block size-3 rounded" aria-hidden="true" />
          Tanlandi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="bg-muted border-border inline-block size-3 rounded border" aria-hidden="true" />
          Band
        </span>
      </div>

      {selected.length > 0 && (
        <p className="mt-3 text-sm">
          {`Tanlandi: ${sortSeats(selected, rows).join(', ')}`}
        </p>
      )}
    </div>
  );
}
