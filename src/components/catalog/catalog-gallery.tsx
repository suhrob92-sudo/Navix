/* eslint-disable @next/next/no-img-element */
'use client';

import { ImageOff, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { CatalogImageView } from '@/modules/catalog/catalog-image.types';

/**
 * Batafsil sahifadagi rasm galereyasi.
 *
 * ── Nima uchun O'Q tugmalari emas, SURISH ─────────────────────────────
 * Navix telefonda ishlatiladi. Telefonda rasm barmoq bilan suriladi —
 * bu odat shu qadar kuchli ki, o'q tugmalari qo'yilsa ham odam
 * baribir suradi.
 *
 * Shuning uchun galereya oddiy gorizontal ro'yxat: brauzerning o'z
 * surish mexanizmi ishlaydi. U har doim silliq, chunki uni brauzer
 * o'zi chizadi — hech qanday JavaScript animatsiyasi bunga yeta
 * olmaydi.
 *
 * ── Nima uchun `scroll-snap` ──────────────────────────────────────────
 * Usiz rasm yarim holatda to'xtab qolardi: ekranda ikkita rasmning
 * yarmi ko'rinardi va qaysi biri "hozirgi" ekani tushunarsiz bo'lardi.
 *
 * ── Nima uchun nuqtalar ───────────────────────────────────────────────
 * Ular nechta rasm borligini aytadi. Usiz odam birinchi rasmni
 * ko'rib, qolganlari borligini umuman bilmasdi.
 */

export interface CatalogGalleryProps {
  images: CatalogImageView[];
  /** Rasmsiz holat uchun nom — bosh harfi ko'rsatiladi. */
  name: string;
  /**
   * Rasmni bosganda TO'LIQ EKRANDA ochish.
   *
   * ── Nima uchun IXTIYORIY ────────────────────────────────────────────
   * Hamma joyda kerak emas. Mahsulot kartochkasida rasm ko'pincha
   * qutining surati bo'ladi va uni kattalashtirishdan foyda yo'q.
   *
   * Mehmonxonada esa aksincha: xona surati — asosiy qaror
   * omillaridan biri. 400 piksellik kvadratda gilamning rangi ham,
   * derazadagi manzara ham ko'rinmaydi.
   */
  enableFullscreen?: boolean;
  className?: string;
}

export function CatalogGallery({ images, name, enableFullscreen = false, className }: CatalogGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /**
   * Qaysi rasm ko'rinayotgani SURISH O'RNIDAN hisoblanadi.
   *
   * ── Nima uchun `IntersectionObserver` emas ──────────────────────────
   * Kuzatuvchi aniqroq ishlaydi, lekin bu yerda ortiqcha: element
   * kengligi ekran kengligiga teng, ya'ni o'rin/kenglik bo'linmasi
   * to'g'ridan-to'g'ri raqamni beradi.
   */
  const handleScroll = useCallback(() => {
    const node = scrollRef.current;

    if (!node || node.clientWidth === 0) return;

    const index = Math.round(node.scrollLeft / node.clientWidth);

    setActive(Math.max(0, Math.min(images.length - 1, index)));
  }, [images.length]);

  if (images.length === 0) {
    const letter = name.trim().charAt(0).toUpperCase() || '?';

    return (
      <div
        className={cn(
          'bg-secondary flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl',
          className,
        )}
      >
        <span className="text-muted-foreground/70 text-4xl font-semibold" aria-hidden="true">
          {letter}
        </span>
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <ImageOff className="size-3.5" aria-hidden="true" />
          Rasm qo&apos;yilmagan
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        /*
          Surish chizig'i YASHIRILADI: telefonda u ahamiyatsiz, lekin
          kompyuterda galereya ostida kulrang chiziq paydo bo'lardi.
          Loyihada boshqa gorizontal ro'yxatlar ham shu yozuvni
          ishlatadi.
        */
        className="flex w-full snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, index) => (
          <div key={image.id} className="w-full shrink-0 snap-center">
            {/*
              To'liq ekran yoqilgan bo'lsa rasm TUGMAGA aylanadi:
              shundagina uni klaviatura bilan ham ochish mumkin va
              ekran o'quvchi dastur "bosiladigan" ekanini aytadi.
            */}
            {enableFullscreen ? (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                aria-label={`${image.alt || name} — kattalashtirish`}
                className="block w-full"
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="bg-secondary aspect-square w-full object-cover"
                />
              </button>
            ) : (
              <img
                src={image.url}
                alt={image.alt}
                /*
                  Faqat BIRINCHI rasm darhol yuklanadi: qolganlari
                  surilgandagina kerak bo'ladi va mobil trafikni
                  bekorga sarflamaydi.
                */
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="bg-secondary aspect-square w-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5"
          /*
            Nuqtalar KO'RISH uchun. Ekranni o'quvchi dastur uchun
            ular ma'nosiz — har bir rasmning o'z tavsifi bor.
          */
          aria-hidden="true"
        >
          {images.map((image, index) => (
            <span
              key={image.id}
              className={cn(
                'rounded-full transition-all duration-200',
                index === active ? 'bg-white' : 'bg-white/50',
                index === active ? 'h-1.5 w-4' : 'size-1.5',
                'shadow-[0_0_2px_rgba(0,0,0,0.4)]',
              )}
            />
          ))}
        </div>
      )}

      {/*
        Rasm raqami: nuqtalar 5 tadan oshganda ularni sanash
        qiyinlashadi.
      */}
      {images.length > 1 && (
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {`${active + 1}/${images.length}`}
        </span>
      )}

      {isFullscreen && (
        <FullscreenViewer
          images={images}
          startIndex={active}
          name={name}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
}

/**
 * To'liq ekrandagi ko'rinish.
 *
 * ── Nima uchun QORA fon ───────────────────────────────────────────────
 * Oq fonda rasmning cheti ko'rinmaydi va ko'z rangni noto'g'ri
 * baholaydi. Qora fon rasmni ajratib turadi — shuning uchun barcha
 * suratkash ilovalari shunday qiladi.
 *
 * ── Nima uchun `object-contain` ───────────────────────────────────────
 * Ro'yxatda rasm kvadratga QIRQILADI (`object-cover`) — u yerda bir
 * xil o'lcham muhim. Bu yerda esa aksincha: odam rasmni butunligicha
 * ko'rish uchun ochdi, qirqilgani emas.
 */
function FullscreenViewer({
  images,
  startIndex,
  name,
  onClose,
}: {
  images: CatalogImageView[];
  startIndex: number;
  name: string;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(startIndex);

  /*
    Ochilganda AYNAN o'sha rasmdan boshlanadi. Birinchisiga
    qaytarish odamni chalg'itardi: u to'rtinchi rasmni bosgan edi.

    `scrollLeft` to'g'ridan-to'g'ri qo'yiladi — animatsiyasiz,
    chunki bu boshlang'ich holat, harakat emas.
  */
  useEffect(() => {
    const node = scrollRef.current;

    if (node) node.scrollLeft = node.clientWidth * startIndex;
  }, [startIndex]);

  /* Escape — oynani yopishning eng kutilgan usuli. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;

    if (!node || node.clientWidth === 0) return;

    setActive(Math.max(0, Math.min(images.length - 1, Math.round(node.scrollLeft / node.clientWidth))));
  }, [images.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black" role="dialog" aria-modal="true" aria-label={`${name} — rasmlar`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image) => (
          <div key={image.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center">
            <img src={image.url} alt={image.alt} decoding="async" className="max-h-full max-w-full object-contain" />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className="absolute top-4 right-4 inline-flex size-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm"
      >
        <X className="size-5" aria-hidden="true" />
      </button>

      {images.length > 1 && (
        <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm tabular-nums">
          {`${active + 1}/${images.length}`}
        </span>
      )}
    </div>
  );
}
