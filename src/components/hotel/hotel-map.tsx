/* eslint-disable @next/next/no-img-element */
'use client';

import { MapPinOff, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import {
  MAP_ATTRIBUTION,
  TILE_SIZE,
  centerOf,
  clusterMarkers,
  fitZoom,
  tileGrid,
  tileUrl,
  toScreen,
} from '@/config/map-tiles';
import { formatRating } from '@/config/review';
import { formatCompactTiyin, formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { formatStars, type HotelListItem } from '@/modules/hotel/hotel.types';

/**
 * Mehmonxonalar xaritada.
 *
 * ── Nima uchun ro'yxat YETARLI emas ───────────────────────────────────
 * Ro'yxat "qaysi mehmonxona yaxshiroq" degan savolga javob beradi.
 * Sayohatchining savoli esa ko'pincha boshqacha: "Registonga yaqinmi?",
 * "vokzaldan uzoqmi?".
 *
 * Manzil matni bu savolga javob bermaydi — begona shahardagi ko'cha
 * nomi hech narsa anglatmaydi. Xarita esa bir qarashda aytadi.
 *
 * ── Nima uchun belgi ichida NARX turadi ───────────────────────────────
 * Oddiy nuqta "shu yerda mehmonxona bor" deydi va tanlashga yordam
 * bermaydi — odam har birini bosib ko'rishi kerak bo'lardi.
 *
 * Narx esa joylashuv bilan pulni BIRGA ko'rsatadi va tanlov aynan shu
 * ikkisi orasida qilinadi.
 *
 * ── Nima uchun surilmaydi ─────────────────────────────────────────────
 * Sabab `delivery-map.tsx` dagi bilan bir xil: sahifani surmoqchi
 * bo'lgan barmoq xaritani surib yuboradi. Bu yerda xarita har doim
 * BARCHA topilgan mehmonxonalarni ko'rsatadi — ya'ni surishning
 * hojati ham yo'q.
 */

/** Xarita balandligi — PIKSELDA. */
const MAP_HEIGHT = 340;

export interface HotelMapProps {
  hotels: HotelListItem[];
  /** Tanlangan sanalar — havolaga qo'shiladi. */
  dates?: { checkIn: string; checkOut: string };
  className?: string;
}

export function HotelMap({ hotels, dates, className }: HotelMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => setWidth(node.clientWidth);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  /*
    Koordinatasi yo'q mehmonxona xaritada KO'RSATILMAYDI. Uni shahar
    markaziga qo'yish mumkin edi va xarita to'laroq ko'rinardi —
    lekin o'shanda odam butunlay boshqa joyga borardi.
  */
  const placed = hotels.filter((hotel) => hotel.point !== null);
  const missing = hotels.length - placed.length;

  const points = placed.flatMap((hotel) => (hotel.point ? [hotel.point] : []));
  const center = centerOf(points);

  const isReady = width > 0 && center !== null;

  const zoom = isReady ? fitZoom(points, width, MAP_HEIGHT) : 0;
  const tiles = isReady ? tileGrid(center, zoom, width, MAP_HEIGHT) : [];

  /*
    ── Tanlov ro'yxatdan HISOBLANADI ───────────────────────────────────
    Tanlangan mehmonxona endi ro'yxatda bo'lmasligi mumkin (filtr
    o'zgargan). O'shanda `find` o'zi `undefined` beradi va kartochka
    ko'rinmaydi.

    Buni effektda tozalash ham mumkin edi, lekin unda bir lahza
    eskirgan kartochka ekranda turardi.
  */
  /*
    Yaqin turgan belgilar GURUHLANADI: butun mamlakat ko'rinishida
    Samarqand bilan Buxoro yorliqlari ustma-ust tushardi.
  */
  const clusters = isReady
    ? clusterMarkers(placed, (hotel) => toScreen(hotel.point!, center, zoom, width, MAP_HEIGHT))
    : [];

  const selected = placed.find((hotel) => hotel.id === selectedId) ?? null;

  if (placed.length === 0) {
    return (
      <div
        className={cn(
          'border-border bg-card text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-2xl border p-6 text-center',
          className,
        )}
        style={{ minHeight: MAP_HEIGHT }}
      >
        <MapPinOff className="size-6" aria-hidden="true" />
        <p className="text-sm">Bu shartlarga mos mehmonxonaning xaritadagi joyi kiritilmagan.</p>
        <p className="text-xs leading-relaxed">
          Ro&apos;yxat ko&apos;rinishida ular ko&apos;rinadi — faqat xaritada belgilanmagan.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={ref}
        className="border-border bg-muted relative overflow-hidden rounded-2xl border"
        style={{ height: MAP_HEIGHT }}
      >
        {tiles.map((tile) => (
          <img
            key={`${tile.zoom}/${tile.x}/${tile.y}`}
            src={tileUrl(tile)}
            alt=""
            aria-hidden="true"
            decoding="async"
            draggable={false}
            width={TILE_SIZE}
            height={TILE_SIZE}
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
            /* Yuklanmagan kafel yashiriladi — sabab `delivery-map.tsx` da. */
            onError={(event) => {
              event.currentTarget.style.visibility = 'hidden';
            }}
          />
        ))}

        <div className="pointer-events-none absolute inset-0 bg-white/20 dark:bg-black/45" aria-hidden="true" />

        {isReady &&
          clusters.map((cluster) => {
            const first = cluster.items[0];
            const isGroup = cluster.items.length > 1;
            const isSelected = cluster.items.some((hotel) => hotel.id === selectedId);

            return (
              <button
                key={first.id}
                type="button"
                onClick={() => {
                  /*
                    ── Guruhni bosganda NAVBAT bilan aylanadi ────────
                    Yaqin turgan mehmonxonalarni ajratib ko'rsatish
                    uchun xaritani kattalashtirish kerak bo'lardi —
                    lekin bu xarita ataylab qotib turadi.

                    Shuning uchun bosish guruh ichida navbatdagisiga
                    o'tadi: uchta mehmonxona bo'lsa, uch marta
                    bosib uchalasini ham ko'rish mumkin.
                  */
                  const index = cluster.items.findIndex((hotel) => hotel.id === selectedId);
                  const next = cluster.items[index + 1];

                  setSelectedId(index === -1 ? first.id : (next?.id ?? null));
                }}
                aria-pressed={isSelected}
                aria-label={
                  isGroup
                    ? `${cluster.items.length} ta mehmonxona shu atrofda`
                    : first.name
                }
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shadow-md transition-transform active:scale-95',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground z-10 scale-105'
                    : 'border-border bg-card text-foreground',
                )}
                style={{ left: cluster.screen.x, top: cluster.screen.y }}
              >
                {/*
                  Guruhda narx KO'RSATILMAYDI: uchta mehmonxonaning
                  narxi har xil va bittasini ko'rsatish qolgan
                  ikkitasi haqida yolg'on taassurot berardi.
                */}
                {isGroup
                  ? `${cluster.items.length} ta`
                  : first.fromPrice === null
                    ? first.name
                    : formatCompactTiyin(first.fromPrice)}
              </button>
            );
          })}

        {/* OpenStreetMap litsenziyasi bu yozuvni TALAB qiladi. */}
        <span className="text-muted-foreground bg-card/80 absolute right-0 bottom-0 rounded-tl-lg px-1.5 py-0.5 text-[10px]">
          {MAP_ATTRIBUTION}
        </span>

        {/*
          Tanlangan mehmonxona kartochkasi — xarita USTIDA.

          Uni xarita ostiga qo'yish mumkin edi, lekin o'shanda
          belgini bosgan odam sahifani pastga surib, kartochkani
          izlashi kerak bo'lardi.
        */}
        {selected && (
          <div className="animate-fade-up absolute inset-x-3 bottom-3">
            <div className="bg-card border-border rounded-2xl border p-3 shadow-lg">
              <div className="flex items-start gap-3">
                <CatalogThumb
                  image={selected.image}
                  name={selected.name}
                  className="size-12 shrink-0 rounded-xl"
                />

                <Link
                  href={`/hotel/${selected.slug}${dates ? `?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}` : ''}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold">{selected.name}</p>

                  <p className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                    <span className="text-amber-500" aria-label={`${selected.stars} yulduz`}>
                      {formatStars(selected.stars)}
                    </span>
                    {selected.ratingCount > 0 && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="size-3 fill-current text-amber-500" aria-hidden="true" />
                        {formatRating(selected.rating, selected.ratingCount)}
                      </span>
                    )}
                  </p>

                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {selected.fromPrice === null ? "Xona yo'q" : `${formatTiyin(selected.fromPrice)} / kecha`}
                  </p>
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Yopish"
                  className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 shrink-0 rounded-lg p-1"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/*
        ── Yashirilgan mehmonxonalar HAQIDA aytiladi ─────────────────
        Jim qolish "xaritada hammasi shu" degan yolg'on taassurot
        berardi va odam ro'yxatdagi mehmonxonani umuman ko'rmasdi.
      */}
      {missing > 0 && (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
          {`Yana ${missing} ta mehmonxonaning xaritadagi joyi kiritilmagan — ular faqat ro'yxatda ko'rinadi.`}
        </p>
      )}
    </div>
  );
}
