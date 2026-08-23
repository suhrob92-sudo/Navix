/* eslint-disable @next/next/no-img-element */
import { ImageOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { CatalogThumb as CatalogThumbData } from '@/modules/catalog/catalog-image.types';

/**
 * Katalogdagi rasm o'rni.
 *
 * ── Nima uchun `next/image` EMAS ──────────────────────────────────────
 * Rasm manzili ikki xil bo'lishi mumkin: mahalliy (`/api/v1/files/...`)
 * yoki Vercel Blob domenidan. Blob domeni har bir loyihada boshqacha va
 * uni `next.config.ts` ga oldindan yozib qo'yib bo'lmaydi — noto'g'ri
 * yozilsa rasm UMUMAN ochilmasdi.
 *
 * Avatar va chat rasmlari ham shu sababdan oddiy `<img>` ishlatadi.
 *
 * ── Nima uchun rasm YO'Q holati alohida ishlangan ─────────────────────
 * Sotuvchi mahsulotni endi qo'shgan bo'lishi mumkin va rasmi hali
 * yo'q. Bo'sh joy qoldirilsa, kartochka buzilgandek ko'rinardi.
 *
 * O'rnini bosuvchi belgi esa aniq aytadi: "rasm hali qo'yilmagan".
 */

export interface CatalogThumbProps {
  image: CatalogThumbData | null;
  /**
   * Rasmsiz holat uchun nom.
   *
   * Bosh harf ko'rsatiladi: bir xil kulrang kvadratlar qatorida
   * har biri baribir farqlanadi.
   */
  name: string;
  /** Kvadrat (`square`) yoki keng (`wide`) nisbat. */
  ratio?: 'square' | 'wide';
  className?: string;
  /**
   * Ekranning yuqorisidagi rasm.
   *
   * Faqat shunday rasmlar darhol yuklanadi; qolganlari pastga
   * tushilgandagina yuklanib, mobil trafikni tejaydi.
   */
  eager?: boolean;
}

const RATIO_CLASSES = {
  square: 'aspect-square',
  wide: 'aspect-[4/3]',
} as const;

export function CatalogThumb({ image, name, ratio = 'square', className, eager = false }: CatalogThumbProps) {
  /**
   * `block` SHART.
   *
   * ── HAQIQIY XATO: rasm kvadrat bo'lmasdi ────────────────────────────
   * `span` odatiy holda satr ichidagi element (`inline`) bo'ladi va
   * unga nisbat (`aspect-square`) UMUMAN ta'sir qilmaydi.
   *
   * Natijada rasmsiz kartochkalar kvadrat, rasmli kartochka esa
   * cho'zilib ketardi: katalogdagi qator buzilar, mahsulot nomi esa
   * kartochkadan chiqib qolardi.
   *
   * Buni faqat rasm qo'yilgandan keyin ko'rish mumkin edi.
   */
  const shared = cn(
    'bg-secondary relative block w-full overflow-hidden rounded-xl',
    RATIO_CLASSES[ratio],
    className,
  );

  if (!image) {
    const letter = name.trim().charAt(0).toUpperCase() || '?';

    return (
      <span className={cn(shared, 'flex flex-col items-center justify-center gap-1')} aria-hidden="true">
        <span className="text-muted-foreground/70 text-2xl font-semibold">{letter}</span>
        <ImageOff className="text-muted-foreground/50 size-4" />
      </span>
    );
  }

  return (
    <span className={shared}>
      <img
        src={image.url}
        alt={image.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="size-full object-cover"
      />
    </span>
  );
}
