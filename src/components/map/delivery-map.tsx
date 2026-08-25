/* eslint-disable @next/next/no-img-element */
'use client';

import { Bike, MapPin } from 'lucide-react';
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
 * Yetkazish xaritasi — kuryer va manzil bitta rasmda.
 *
 * ── Nima uchun SURILMAYDI va KATTALASHMAYDI ───────────────────────────
 * Odatdagi xaritalar interaktiv bo'ladi. Bu yerda esa aksincha:
 * xarita QOTIB turadi va har doim ikkala nuqtani ko'rsatadi.
 *
 * Sabab — foydalanish sharoiti. Odam bu xaritaga telefonni varaqlab
 * turib qaraydi. Interaktiv xarita barmoq harakatini "o'ziga
 * tortadi": sahifani pastga surmoqchi bo'lgan odam xaritani surib
 * yuboradi va kuryerni qaytadan izlashga majbur bo'ladi.
 *
 * Qotgan xaritada bunday muammo yo'q va u har doim to'g'ri joyni
 * ko'rsatadi.
 *
 * ── Nima uchun `next/image` emas ──────────────────────────────────────
 * Sabab `catalog-thumb.tsx` dagi bilan bir xil, ustiga qo'shimcha:
 * kafel manzillari HISOBLANADI va ularning soni ekran o'lchamiga
 * qarab o'zgaradi. Ularni oldindan sozlab bo'lmaydi.
 */

/** Xarita balandligi — PIKSELDA. */
const MAP_HEIGHT = 200;

export interface DeliveryMapProps {
  /** Kuryerning joylashuvi — noma'lum yoki eski bo'lsa `null`. */
  courier: Point | null;
  /** Yetkazish manzili. */
  destination: Point;
  /** Ekran o'quvchisi uchun matn: "Kuryer 1.2 km uzoqlikda". */
  label: string;
  className?: string;
}

export function DeliveryMap({ courier, destination, label, className }: DeliveryMapProps) {
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

  const points = courier ? [courier, destination] : [destination];
  const center = centerOf(points);

  const isReady = width > 0 && center !== null;

  const zoom = isReady ? fitZoom(points, width, MAP_HEIGHT) : 0;
  const tiles = isReady ? tileGrid(center, zoom, width, MAP_HEIGHT) : [];

  const destinationScreen = isReady ? toScreen(destination, center, zoom, width, MAP_HEIGHT) : null;
  const courierScreen = isReady && courier ? toScreen(courier, center, zoom, width, MAP_HEIGHT) : null;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn(
        'border-border bg-muted relative overflow-hidden rounded-2xl border',
        className,
      )}
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
          /*
            ── Yuklanmagan kafel YASHIRILADI ─────────────────────────
            Kuryerni kutayotgan odam ko'pincha zaif internetda bo'ladi
            (liftda, yerto'lada). Kafel yuklanmasa, brauzer o'zining
            "buzuq rasm" belgisini chizadi va xarita nosoz ilovaga
            o'xshab qoladi.

            Yashirilsa esa o'sha joyda shunchaki bo'sh fon qoladi,
            belgilar va masofa yozuvi esa joyida turaveradi — ya'ni
            asosiy ma'lumot yo'qolmaydi.
          */
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden';
          }}
        />
      ))}

      {/*
        ── Nima uchun qoraytiruvchi PARDA ────────────────────────────
        OpenStreetMap kafellari och rangli va ularda ko'p yozuv bor.
        Belgilar ularning ustida yo'qolib ketardi.

        Yengil parda xaritani fon darajasiga tushiradi va belgilarni
        ajratib turadi. Qorong'i rejimda parda quyuqroq.
      */}
      <div
        className="pointer-events-none absolute inset-0 bg-white/20 dark:bg-black/45"
        aria-hidden="true"
      />

      {destinationScreen && (
        <Marker x={destinationScreen.x} y={destinationScreen.y}>
          <span className="bg-primary text-primary-foreground ring-background inline-flex size-8 items-center justify-center rounded-full shadow-lg ring-2">
            <MapPin className="size-4" aria-hidden="true" />
          </span>
        </Marker>
      )}

      {courierScreen && (
        <Marker x={courierScreen.x} y={courierScreen.y}>
          {/*
            Kuryer belgisi ATROFIDA jonli halqa: u nuqtaning
            harakatda ekanini bildiradi. Manzil esa qimirlamaydi va
            uning halqasi yo'q.
          */}
          <span className="relative inline-flex">
            <span
              className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60"
              aria-hidden="true"
            />
            <span className="ring-background relative inline-flex size-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg ring-2">
              <Bike className="size-4" aria-hidden="true" />
            </span>
          </span>
        </Marker>
      )}

      {/*
        OpenStreetMap litsenziyasi bu yozuvni TALAB qiladi.
        Uni olib tashlash litsenziyani buzish demak.
      */}
      <span className="text-muted-foreground bg-card/80 absolute right-0 bottom-0 rounded-tl-lg px-1.5 py-0.5 text-[10px]">
        {MAP_ATTRIBUTION}
      </span>
    </div>
  );
}

/** Belgini o'z markazi bilan berilgan nuqtaga qo'yadi. */
function Marker({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <span
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      {children}
    </span>
  );
}
