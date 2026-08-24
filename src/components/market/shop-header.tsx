/* eslint-disable @next/next/no-img-element */
import { Star, Truck } from 'lucide-react';

import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Badge } from '@/components/ui/badge';
import { formatRating } from '@/config/review';
import type { ServiceColor } from '@/config/modules';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { ShopListItem } from '@/modules/market/market.types';

/**
 * Do'kon sarlavhasi — rasm, nom, baho va yetkazish sharti.
 *
 * ── Nima uchun SARLAVHA RASMI kerak ───────────────────────────────────
 * Ilgari do'kon sahifasi oddiy oq kartochkadan boshlanardi. Odam
 * qaysi do'konga kirganini faqat yozuvdan bilardi va barcha do'konlar
 * bir xil ko'rinardi.
 *
 * Sarlavha rasmi do'konga YUZ beradi: odam ikkinchi marta kirganda
 * uni o'qimasdan tanib oladi.
 *
 * ── Nima uchun ALOHIDA sarlavha rasmi ustuni YO'Q ─────────────────────
 * Bazaga `coverUrl` ustuni qo'shsa bo'lardi. Lekin o'shanda har bir
 * sotuvchi IKKITA rasm yuklashi kerak bo'lardi — belgi va sarlavha —
 * va aksariyati ikkinchisini yuklamasdi. Natijada ko'pchilik do'kon
 * bo'sh sarlavha bilan qolardi.
 *
 * Shuning uchun qoida oddiy va bir xil: do'konning BIRINCHI rasmi
 * ham belgi, ham sarlavha foni bo'ladi. Fon xiralashtiriladi va
 * kattalashtiriladi — shuning uchun kichik belgi rasmi ham chiroyli
 * chiqadi.
 *
 * Rasm umuman bo'lmasa — do'konning O'Z rangidan gradient. Rang
 * bazada allaqachon bor (`shops.color`) va ro'yxatda ham shu rang
 * ishlatiladi, ya'ni do'kon hamma joyda bir xil ko'rinadi.
 *
 * ── Nima uchun `next/image` emas ──────────────────────────────────────
 * Sabab `catalog-thumb.tsx` da: rasm manzili Vercel Blob domenidan
 * kelishi mumkin va u har bir loyihada boshqacha.
 */

/**
 * Fon gradientlari.
 *
 * Tailwind class'lari to'liq yozilgan: `from-${color}-400` ko'rinishidagi
 * dinamik nomlarni Tailwind build vaqtida topa olmaydi va uslub
 * yo'qoladi. Xuddi shu sabab `service-icon.tsx` da ham izohlangan.
 */
const GRADIENTS: Record<ServiceColor, string> = {
  amber: 'from-amber-400 to-amber-600',
  rose: 'from-rose-400 to-rose-600',
  blue: 'from-blue-400 to-blue-600',
  orange: 'from-orange-400 to-orange-600',
  green: 'from-emerald-400 to-emerald-600',
  pink: 'from-pink-400 to-pink-600',
  teal: 'from-teal-400 to-teal-600',
  violet: 'from-violet-400 to-violet-600',
  sky: 'from-sky-400 to-sky-600',
  indigo: 'from-indigo-400 to-indigo-600',
  slate: 'from-slate-400 to-slate-600',
};

export interface ShopHeaderProps {
  shop: ShopListItem;
  className?: string;
}

export function ShopHeader({ shop, className }: ShopHeaderProps) {
  const image = shop.image;

  return (
    <div className={cn('animate-fade-up', className)}>
      {/* ── Sarlavha foni ──────────────────────────────────────── */}
      <div className="relative h-28 overflow-hidden rounded-t-2xl">
        {image ? (
          <>
            <img
              src={image.url}
              /*
                Fon BEZAK: uni ekranni o'quvchi dastur o'qimasligi
                kerak, chunki xuddi shu rasm pastda belgi sifatida
                o'z tavsifi bilan qayta chiqadi.
              */
              alt=""
              aria-hidden="true"
              decoding="async"
              className="size-full scale-125 object-cover blur-xl"
            />
            {/*
              Qorong'i parda: rasm och rangli bo'lsa, ustidagi
              yorliq o'qilmay qolardi.
            */}
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" />
          </>
        ) : (
          <div
            className={cn('size-full bg-gradient-to-br', GRADIENTS[shop.color])}
            aria-hidden="true"
          />
        )}

        {/* Do'kon ochiqmi — eng muhim ma'lumot, eng ko'rinadigan joyda. */}
        <div className="absolute top-3 right-3">
          {shop.isOpen ? (
            <Badge className="bg-white/90 text-emerald-700 dark:bg-black/60 dark:text-emerald-300">
              Buyurtma qabul qilyapti
            </Badge>
          ) : (
            <Badge className="bg-white/90 text-amber-700 dark:bg-black/60 dark:text-amber-300">
              Vaqtincha yopiq
            </Badge>
          )}
        </div>
      </div>

      {/* ── Belgi va nom ───────────────────────────────────────── */}
      <div className="bg-card border-border rounded-b-2xl border border-t-0 px-4 pb-4">
        {/*
          Belgi fonga YARIM chiqib turadi — shu tufayli sarlavha va
          kartochka bitta butun bo'lib ko'rinadi.
        */}
        <div className="-mt-8 flex items-end gap-3">
          <CatalogThumb
            image={image}
            name={shop.name}
            eager
            className="border-card size-16 shrink-0 rounded-2xl border-4 shadow-sm"
          />

          <h1 className="min-w-0 flex-1 pb-1 text-lg leading-tight font-semibold">{shop.name}</h1>
        </div>

        <p className="mt-3 text-sm leading-relaxed">{shop.description}</p>

        <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5" aria-hidden="true" />
            {shop.ratingCount > 0
              ? `${formatRating(shop.rating, shop.ratingCount)} (${shop.ratingCount})`
              : formatRating(shop.rating, shop.ratingCount)}
          </span>

          <span className="inline-flex items-center gap-1">
            <Truck className="size-3.5" aria-hidden="true" />
            {`${shop.deliveryDays} kun · ${formatTiyin(shop.deliveryFee)}`}
          </span>

          <span>{`Eng kam buyurtma: ${formatTiyin(shop.minOrder)}`}</span>
        </div>
      </div>
    </div>
  );
}
