/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';

import { distanceKm, formatDistance } from '@/config/delivery-eta';
import {
  MAP_ATTRIBUTION,
  TILE_SIZE,
  centerOf,
  fitZoom,
  tileGrid,
  tileUrl,
  toScreen,
} from '@/config/map-tiles';
import { cityPoint } from '@/config/travel';
import { cn } from '@/lib/utils';

/**
 * Yo'nalish xaritasi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * "Toshkent → Nukus" degan yozuv masofani aytmaydi. O'zbekistonni
 * yaxshi bilmaydigan odam uchun (yoki mehmon uchun) bu ikki shahar
 * qo'shni ham, ikki chekka ham bo'lishi mumkin.
 *
 * Xarita bir qarashda aytadi: qayerdan qayerga, qaysi tomonga va
 * qanchalik uzoq.
 *
 * ── Nima uchun chiziq TO'G'RI ─────────────────────────────────────────
 * Haqiqiy yo'l (temir yo'l izi, avtomobil yo'li) egri va uni chizish
 * uchun marshrut ma'lumoti kerak — bizda u YO'Q.
 *
 * To'g'ri chiziq esa hech narsani yashirmaydi: u YO'NALISHNI
 * ko'rsatadi. Ekranda ham shunday aytiladi — "to'g'ri chiziq
 * bo'yicha", ya'ni odam buni marshrut deb o'ylamaydi.
 */

const MAP_HEIGHT = 220;

export interface RouteMapProps {
  fromCity: string;
  toCity: string;
  className?: string;
}

export function RouteMap({ fromCity, toCity, className }: RouteMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => setWidth(node.clientWidth);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const from = cityPoint(fromCity);
  const to = cityPoint(toCity);

  /*
    Shaharning koordinatasi noma'lum bo'lsa, xarita umuman
    chizilmaydi. Taxminiy nuqta odamni butunlay boshqa tomonga
    qaratardi — bu yozuvsiz qolishdan yomonroq.
  */
  if (!from || !to) return null;

  const points = [from, to];
  const center = centerOf(points)!;

  const isReady = width > 0;
  const zoom = isReady ? fitZoom(points, width, MAP_HEIGHT) : 0;
  const tiles = isReady ? tileGrid(center, zoom, width, MAP_HEIGHT) : [];

  const fromScreen = isReady ? toScreen(from, center, zoom, width, MAP_HEIGHT) : null;
  const toScreenPoint = isReady ? toScreen(to, center, zoom, width, MAP_HEIGHT) : null;

  const distanceText = formatDistance(distanceKm(from, to));

  return (
    <div className={className}>
      <div
        ref={ref}
        role="img"
        aria-label={`Xarita: ${fromCity} dan ${toCity} gacha, to'g'ri chiziq bo'yicha ${distanceText}`}
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

        {fromScreen && toScreenPoint && (
          <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
            {/*
              UZUQ chiziq ataylab: uzluksiz chiziq haqiqiy yo'lga
              o'xshab qolardi. Uzuq chiziq esa "taxminiy yo'nalish"
              degan ma'noni beradi — xaritalarda bu ko'nikilgan
              belgi.
            */}
            <line
              x1={fromScreen.x}
              y1={fromScreen.y}
              x2={toScreenPoint.x}
              y2={toScreenPoint.y}
              stroke="currentColor"
              className="text-primary"
              strokeWidth={2.5}
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
          </svg>
        )}

        {fromScreen && <CityMarker x={fromScreen.x} y={fromScreen.y} label={fromCity} isStart />}
        {toScreenPoint && <CityMarker x={toScreenPoint.x} y={toScreenPoint.y} label={toCity} />}

        {/* OpenStreetMap litsenziyasi bu yozuvni TALAB qiladi. */}
        <span className="text-muted-foreground bg-card/80 absolute right-0 bottom-0 rounded-tl-lg px-1.5 py-0.5 text-[10px]">
          {MAP_ATTRIBUTION}
        </span>
      </div>

      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        {`To'g'ri chiziq bo'yicha ${distanceText}. Haqiqiy yo'l uzunroq — xarita faqat yo'nalishni ko'rsatadi. Nuqtalar shahar markazi, vokzal yoki aeroport emas.`}
      </p>
    </div>
  );
}

/** Shahar belgisi — nomi bilan. */
function CityMarker({ x, y, label, isStart = false }: { x: number; y: number; label: string; isStart?: boolean }) {
  return (
    <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: x, top: y }}>
      <span className="flex flex-col items-center gap-1">
        <span
          className={cn(
            'ring-background inline-block rounded-full ring-2',
            /*
              Boshlanish nuqtasi ICHI BO'SH halqa, tugash nuqtasi
              to'ldirilgan doira — xaritalarda ko'nikilgan farq.
            */
            isStart ? 'border-primary bg-card size-3.5 border-2' : 'bg-primary size-3.5',
          )}
        />
        <span className="bg-card/90 rounded px-1.5 py-0.5 text-[0.625rem] font-medium whitespace-nowrap">
          {label}
        </span>
      </span>
    </span>
  );
}
