'use client';

import { Columns3, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MAX_COMPARE_ROOMS, buildComparison, cheapestIndex } from '@/config/room-compare';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { HotelRoomView } from '@/modules/hotel/hotel.types';

/**
 * Xona taqqoslash oynasi.
 *
 * ── Nima uchun JADVAL, kartochkalar emas ──────────────────────────────
 * Yonma-yon turgan kartochkalar chiroyliroq ko'rinadi, lekin
 * taqqoslash uchun yaroqsiz: narx bir kartochkaning pastida,
 * ikkinchisining o'rtasida turadi va ko'z ularni topa olmaydi.
 *
 * Jadvalda esa bir xil ma'lumot bir QATORDA turadi — ko'z faqat
 * chapdan o'ngga yuradi.
 *
 * ── Nima uchun ustunlar emas, gorizontal SURISH ───────────────────────
 * Uchta ustun 400 pikselli ekranga sig'maydi. Matnni kichraytirib
 * sig'dirish mumkin edi, lekin o'shanda uni o'qib bo'lmasdi.
 *
 * Surish esa telefonda tabiiy harakat va har bir ustun o'qiladigan
 * kenglikda qoladi.
 */

export interface RoomCompareProps {
  rooms: HotelRoomView[];
  nights: number;
  onClose: () => void;
  /** Xona tanlanganda — bandlov oynasini ochadi. */
  onBook: (room: HotelRoomView) => void;
}

export function RoomCompare({ rooms, nights, onClose, onBook }: RoomCompareProps) {
  const rows = buildComparison(rooms, nights, { price: formatTiyin });
  const cheapest = cheapestIndex(rooms);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card animate-slide-up max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Columns3 className="size-5" aria-hidden="true" />
            Xonalarni taqqoslash
          </h2>

          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary inline-flex size-8 items-center justify-center rounded-lg transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/*
          Gorizontal surish FAQAT jadvalga tegishli: sahifaning
          o'zi surilmasligi kerak.
        */}
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-24 pb-2 text-left align-bottom" />

                {rooms.map((room, index) => (
                  <th key={room.id} className="min-w-32 pb-2 text-left align-bottom">
                    <span className="block text-sm leading-snug font-semibold text-balance">{room.name}</span>

                    {/*
                      Eng arzoni BELGILANADI: uchta uzun raqamni
                      ko'z bilan solishtirish sekin ish.
                    */}
                    {cheapest === index && (
                      <Badge variant="secondary" className="mt-1">
                        Eng arzon
                      </Badge>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-border/60 border-t">
                  <th scope="row" className="text-muted-foreground py-2.5 pr-3 text-left text-xs font-medium">
                    {row.label}
                  </th>

                  {row.values.map((value, index) => (
                    <td
                      key={`${row.label}:${rooms[index].id}`}
                      className={cn(
                        'py-2.5 pr-3 align-top leading-relaxed',
                        /*
                          Farq qiladigan qator QORAYTIRILADI, bir xil
                          qator so'nadi. Qaror aynan farq ustida
                          qabul qilinadi — qolgani shovqin.
                        */
                        row.differs ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 space-y-2">
          {rooms.map((room) => (
            <Button
              key={room.id}
              fullWidth
              variant={cheapest !== null && rooms[cheapest].id === room.id ? 'primary' : 'outline'}
              disabled={room.availableRooms === 0 || room.availableRooms === null}
              onClick={() => onBook(room)}
            >
              {room.availableRooms === null
                ? `${room.name} — avval sana tanlang`
                : room.availableRooms === 0
                  ? `${room.name} — bo'sh xona yo'q`
                  : `${room.name} — band qilish`}
            </Button>
          ))}
        </div>

        <p className="text-muted-foreground mt-3 text-center text-xs leading-relaxed">
          {`Bir vaqtda ko'pi bilan ${MAX_COMPARE_ROOMS} ta xona taqqoslanadi.`}
        </p>
      </div>
    </div>
  );
}
