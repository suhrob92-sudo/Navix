/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';

import type { Point } from '@/config/delivery-eta';
import {
  MAP_ATTRIBUTION,
  TILE_SIZE,
  centerOf,
  fitZoom,
  tileGrid,
  tileUrl,
  toScreen,
} from '@/config/map-tiles';
import { cn } from '@/lib/utils';

/**
 * Safar xaritasi — qayerdan, qayerga va haydovchi qayerda.
 *
 * ── Nima uchun `DeliveryMap` dan alohida ──────────────────────────────
 * Yetkazishda IKKI nuqta bor: kuryer va manzil. Taksida esa UCHTA
 * bo'lishi mumkin va ular boshqa ma'no tashiydi: olish nuqtasi,
 * tushish nuqtasi va harakatdagi mashina.
 *
 * `DeliveryMap` ni uchinchi nuqta bilan kengaytirish mumkin edi, lekin
 * unda uning har bir chaqiruvi "bu nuqta nimani anglatadi" degan
 * savolni tug'dirardi. Ikki sodda komponent bitta murakkabidan
 * yaxshiroq.
 *
 * ── Nima uchun SURILMAYDI ─────────────────────────────────────────────
 * `DeliveryMap` dagi bilan bir xil sabab: bu xarita KUZATISH uchun,
 * o'rganish uchun emas. Odam ekranni pastga surmoqchi bo'lganda
 * xarita barmoqni "o'ziga tortib" olmasligi kerak.
 *
 * Nuqta TANLASH uchun alohida, suriladigan xarita bor
 * (`pick-map.tsx`) — u boshqa vazifani bajaradi.
 */

export interface RideMapProps {
  /** Olish nuqtasi. */
  from: Point | null;
  /** Tushish nuqtasi. */
  to: Point | null;
  /** Haydovchining joylashuvi — hali noma'lum bo'lsa `null`. */
  driver?: Point | null;
  /**
   * Hech qanday nuqta tanlanmaganda xarita QAYERNI ko'rsatsin.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Nuqtasiz xarita bo'm-bo'sh kulrang to'rtburchak bo'lib qolardi va
   * u "yuklanmadi" degan taassurot berardi.
   *
   * Shahar ko'rinib turgan xarita esa boshidanoq tirik: odam o'z
   * mahallasini tanib, manzilni qayerdan tanlashini tushunadi.
   */
  fallbackCenter?: Point;
  /** Xarita balandligi — PIKSELDA. */
  height?: number;
  /** Ekran o'quvchisi uchun matn. */
  label: string;
  className?: string;
}

export function RideMap({
  from,
  to,
  driver = null,
  fallbackCenter,
  height = 260,
  label,
  className,
}: RideMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  /*
    Kafellar soni ekran KENGLIGIGA bog'liq, u esa serverda noma'lum.
    Shuning uchun o'lcham brauzerda o'lchanadi va xarita faqat
    shundan keyin chiziladi.
  */
  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => setWidth(node.clientWidth);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const points = [from, to, driver].filter((point): point is Point => point !== null);

  /*
    Markaz nuqtalardan hisoblanadi; ular yo'q bo'lsa — zaxira
    markazdan. `points` bo'sh qolgani muhim: `fitZoom` bitta nuqta
    uchun juda yaqin daraja beradi va zaxira markazda bu shart emas.
  */
  const center = centerOf(points) ?? fallbackCenter ?? null;

  const ready = width > 0 && center !== null;

  /* Nuqtasiz xaritada shahar ko'rinadigan daraja. */
  const zoom = ready ? (points.length > 0 ? fitZoom(points, width, height) : 12) : 0;

  const place = (point: Point) => toScreen(point, center as Point, zoom, width, height);

  const fromScreenPoint = ready && from ? place(from) : null;
  const toScreenPoint = ready && to ? place(to) : null;
  const driverScreenPoint = ready && driver ? place(driver) : null;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn('bg-muted relative overflow-hidden', className)}
      style={{ height }}
    >
      {ready && (
        <>
          {tileGrid(center as Point, zoom, width, height).map((tile) => (
            <img
              key={`${tile.zoom}-${tile.x}-${tile.y}`}
              src={tileUrl(tile)}
              alt=""
              aria-hidden="true"
              width={TILE_SIZE}
              height={TILE_SIZE}
              loading="lazy"
              draggable={false}
              /*
                Yuklanmagan kafel YASHIRILADI.

                Aks holda brauzer o'zining "rasm buzilgan" belgisini
                chizadi va xarita o'rtasida sarg'ish kvadrat paydo
                bo'ladi. Sekin internetda bu tez-tez uchraydi va u
                xatoga o'xshaydi — holbuki qolgan kafellar joyida.
              */
              onError={(event) => {
                event.currentTarget.style.visibility = 'hidden';
              }}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: tile.left, top: tile.top }}
            />
          ))}

          {/*
            Yo'l chizig'i.

            Ikki qatlam: qalin oq ost va ustidan ingichka to'q. Bu
            chiziqni har qanday xarita fonida — och ko'chada ham,
            to'q yashil bog'da ham — ko'rinadigan qiladi.

            ── Nima uchun ranglar QOTIB yozilgan ────────────────────
            Xarita kafellari OpenStreetMap dan keladi va ular HAR
            DOIM och rangda — mavzu qorong'i bo'lsa ham. Shuning
            uchun ustidagi belgilar mavzu bilan o'zgarmasligi kerak.

            Bu aynan shu yerda topilgan xato edi: chiziq
            `stroke-foreground` bilan chizilgandi va qorong'i
            rejimda u oqarib, oq ost qatlam bilan qo'shilib
            ketgandi — natijada yo'l umuman ko'rinmasdi.
          */}
          {fromScreenPoint && toScreenPoint && (
            <svg
              className="pointer-events-none absolute inset-0"
              width={width}
              height={height}
              aria-hidden="true"
            >
              <line
                x1={fromScreenPoint.x}
                y1={fromScreenPoint.y}
                x2={toScreenPoint.x}
                y2={toScreenPoint.y}
                stroke="white"
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.9}
              />
              <line
                x1={fromScreenPoint.x}
                y1={fromScreenPoint.y}
                x2={toScreenPoint.x}
                y2={toScreenPoint.y}
                stroke="#111827"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray="1 7"
              />
            </svg>
          )}

          {fromScreenPoint && (
            <Marker screen={fromScreenPoint} kind="from" title="Olish nuqtasi" />
          )}
          {toScreenPoint && <Marker screen={toScreenPoint} kind="to" title="Tushish nuqtasi" />}
          {driverScreenPoint && <Marker screen={driverScreenPoint} kind="driver" title="Haydovchi" />}
        </>
      )}

      {/* Yozuv ham xarita ustida turadi — u ham mavzuga bog'lanmaydi. */}
      <span className="absolute right-1.5 bottom-1 rounded bg-white/80 px-1 text-[10px] text-slate-600">
        {MAP_ATTRIBUTION}
      </span>
    </div>
  );
}

/**
 * Xaritadagi bitta belgi.
 *
 * Uchala turi bir xil o'lchamda va bir xil markazlanish qoidasiga
 * ega — shuning uchun bitta komponent. Farqi faqat rangda va
 * shaklda.
 */
function Marker({
  screen,
  kind,
  title,
}: {
  screen: { x: number; y: number };
  kind: 'from' | 'to' | 'driver';
  title: string;
}) {
  return (
    <span
      title={title}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: screen.x, top: screen.y }}
    >
      {kind === 'from' && (
        <span
          className="block size-3.5 rounded-full border-[3px] bg-white shadow-sm"
          style={{ borderColor: '#111827' }}
        />
      )}

      {kind === 'to' && (
        <span className="bg-primary flex size-5 items-center justify-center rounded-full shadow-md ring-3 ring-white">
          <span className="size-1.5 rounded-full bg-white" />
        </span>
      )}

      {/*
        Haydovchi belgisi KATTAROQ va kvadratroq: u harakatlanadi va
        ko'z uni darhol topishi kerak. Doira bo'lsa, u tushish
        nuqtasi bilan chalkashardi.
      */}
      {kind === 'driver' && (
        <span
          className="flex size-7 items-center justify-center rounded-lg text-white shadow-lg ring-2 ring-white"
          style={{ backgroundColor: '#111827' }}
        >
          <CarGlyph />
        </span>
      )}
    </span>
  );
}

/** Kichik mashina belgisi — alohida rasm yuklamaslik uchun ichma-ich SVG. */
function CarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
      <path
        d="M5 11l1.5-4A2 2 0 018.4 6h7.2a2 2 0 011.9 1.4L19 11m-14 0h14m-14 0v5m14-5v5M7 16h.01M17 16h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
