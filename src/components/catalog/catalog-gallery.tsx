/* eslint-disable @next/next/no-img-element */
'use client';

import { ImageOff } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

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
  className?: string;
}

export function CatalogGallery({ images, name, className }: CatalogGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

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
    </div>
  );
}
