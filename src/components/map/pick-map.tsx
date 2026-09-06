/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Point } from '@/config/delivery-eta';
import {
  MAP_ATTRIBUTION,
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_SIZE,
  fromScreen,
  tileGrid,
  tileUrl,
} from '@/config/map-tiles';
import { cn } from '@/lib/utils';

/**
 * Nuqta tanlaydigan xarita.
 *
 * ── Nima uchun barmoq bilan BOSILMAYDI, xarita SURILADI ───────────────
 * Ikki usul bor: xaritaga bosish yoki xaritani surib, markazdagi
 * belgini kerakli joyga olib kelish.
 *
 * Bosish usuli telefonda yomon ishlaydi: barmoq bosgan joyni O'ZI
 * to'sib turadi va odam nuqta qayerga tushganini ko'rmaydi. Ustiga,
 * barmoq izi 8-10 mm — bu 16-darajali xaritada butun bir hovli.
 *
 * Markazdagi belgi esa har doim ko'rinib turadi va u yarim piksel
 * aniqlikda joylashadi. Shuning uchun Yandex Go va Uber ham aynan
 * shu usulni ishlatadi.
 *
 * ── Nima uchun tanlov faqat QO'YIB YUBORILGANDA yuboriladi ────────────
 * Surish paytida markaz har pikselda o'zgaradi. Har o'zgarishda
 * xabar berilsa, ota-komponent soniyada yuzlab marta qayta
 * chizilardi va xarita "yopishib" qolardi.
 */

export interface PickMapProps {
  /**
   * BOSHLANG'ICH markaz.
   *
   * ── Nima uchun keyin o'zgartirilmaydi ───────────────────────────────
   * Odam xaritani surib turganda ota-komponent yangi markaz bersa,
   * xarita barmoq ostidan sakrab ketardi.
   *
   * Markazni majburan ko'chirish kerak bo'lsa (masalan "mening
   * joylashuvim" bosilganda), ota-komponent `key` ni o'zgartiradi va
   * xarita yangi markaz bilan qaytadan ochiladi. Bu React ning
   * o'z usuli va u effekt bilan holatni sinxronlashdan sodda.
   */
  center: Point;
  /** Foydalanuvchi nuqtani tanlab bo'lgach chaqiriladi. */
  onPick: (point: Point) => void;
  height?: number;
  label: string;
  className?: string;
}

const DEFAULT_ZOOM = 15;

export function PickMap({ center, onPick, height = 320, label, className }: PickMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  /** Xaritaning hozirgi markazi — surilganda o'zgaradi. */
  const [view, setView] = useState<Point>(center);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  /*
    Surish holati `ref` da saqlanadi, `state` da emas: u har
    harakatda o'zgaradi va `state` bo'lsa komponent har pikselda
    qayta chizilardi.
  */
  const drag = useRef<{ x: number; y: number; from: Point } | null>(null);

  useEffect(() => {
    const node = ref.current;

    if (!node) return;

    const measure = () => setWidth(node.clientWidth);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, y: event.clientY, from: view };
    },
    [view],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = drag.current;

      if (!start || width === 0) return;

      /*
        Barmoq qancha siljigan bo'lsa, xarita markazi TESKARI
        tomonga shuncha siljiydi: odam xaritani o'ziga tortadi.
      */
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;

      setView(
        fromScreen(
          { x: width / 2 - dx, y: height / 2 - dy },
          start.from,
          zoom,
          width,
          height,
        ),
      );
    },
    [height, width, zoom],
  );

  const handlePointerUp = useCallback(() => {
    if (!drag.current) return;

    drag.current = null;
    onPick(view);
  }, [onPick, view]);

  const changeZoom = useCallback(
    (delta: number) => {
      setZoom((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)));
    },
    [],
  );

  return (
    <div className={cn('relative', className)}>
      <div
        ref={ref}
        role="application"
        aria-label={label}
        className="bg-muted relative touch-none overflow-hidden select-none"
        style={{ height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {width > 0 &&
          tileGrid(view, zoom, width, height).map((tile) => (
            <img
              key={`${tile.zoom}-${tile.x}-${tile.y}`}
              src={tileUrl(tile)}
              alt=""
              aria-hidden="true"
              width={TILE_SIZE}
              height={TILE_SIZE}
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
          Markazdagi belgi.

          U xaritaning ustida, ekran markazida QOTIB turadi — surilgani
          xarita, belgi emas. Uchi pastda, shuning uchun belgi o'z
          balandligicha yuqoriga suriladi.
        */}
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
          <PinGlyph />
        </span>

        {/* Belgining uchi aynan qayerdaligini ko'rsatadigan soya. */}
        <span className="pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35" />

        {/* Xarita kafellari doim och rangda — yozuv ham shunga moslanadi. */}
        <span className="absolute right-1.5 bottom-1 rounded bg-white/80 px-1 text-[10px] text-slate-600">
          {MAP_ATTRIBUTION}
        </span>
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        <ZoomButton label="Yaqinlashtirish" onClick={() => changeZoom(1)} disabled={zoom >= MAX_ZOOM}>
          +
        </ZoomButton>
        <ZoomButton label="Uzoqlashtirish" onClick={() => changeZoom(-1)} disabled={zoom <= MIN_ZOOM}>
          −
        </ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="bg-background/90 text-foreground border-border flex size-9 items-center justify-center rounded-xl border text-lg font-semibold shadow-sm backdrop-blur transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PinGlyph() {
  return (
    <svg viewBox="0 0 24 32" className="size-8 drop-shadow-md" aria-hidden="true">
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20c0-6.6-5.4-12-12-12z"
        className="fill-primary"
      />
      <circle cx="12" cy="12" r="4.5" className="fill-primary-foreground" />
    </svg>
  );
}
