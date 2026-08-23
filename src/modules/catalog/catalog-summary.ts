import { Prisma } from '@/generated/prisma/client';
import { tiyinToNumber } from '@/lib/money';
import { THUMB_SELECT, toThumb } from '@/modules/catalog/catalog-image.select';
import type { CatalogThumb } from '@/modules/catalog/catalog-image.types';

/**
 * Katalog narsasining QISQA ko'rinishi.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Sevimlilar va "yaqinda ko'rilganlar" — ikki boshqa modul, lekin
 * ular AYNAN BIR XIL narsani ko'rsatadi: rasm, nom, bitta qator
 * izoh va narx.
 *
 * Ularning har birida alohida yozilsa, ~200 qator mahsulot, taom,
 * restoran, mehmonxona va vakansiya o'girish kodi ikki marta
 * takrorlanardi. Ertaga narx ko'rinishi o'zgarsa, bittasida
 * tuzatilgan xato ikkinchisida qolib ketardi.
 *
 * ── Nima uchun narsalar UMUMIY shaklga keltiriladi ────────────────────
 * Mahsulot, taom, mehmonxona va vakansiya bir-biridan juda farq
 * qiladi: birida zaxira bor, birida maosh, birida yulduzlar.
 *
 * Lekin RO'YXATDA ularning hammasi bir xil ko'rinadi. Shuning uchun
 * ro'yxat sahifasi beshta boshqa-boshqa kartochka chizishga majbur
 * bo'lmaydi.
 */

/** Ro'yxatda ko'rsatiladigan qisqa ma'lumot. */
export interface CatalogSummary {
  name: string;
  /** Ilova ichidagi manzil. */
  href: string;
  /** Bitta qator izoh: do'kon nomi, shahar yoki kompaniya. */
  subtitle: string | null;
  /** Narx — TIYINDA. Restoranda narx yo'q, maosh kelishilgan bo'lishi mumkin. */
  priceTiyin: number | null;
  /** Narx oldidagi belgi: "dan" yoki bo'sh. */
  pricePrefix: string | null;
  image: CatalogThumb | null;
  /** Hali sotuvda/faolmi. Yo'q bo'lsa kartochka xiralashadi. */
  isAvailable: boolean;
}

// ── Mahsulot ──────────────────────────────────────────────────────────

export const PRODUCT_SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  isActive: true,
  stock: true,
  shop: { select: { name: true } },
  images: THUMB_SELECT,
} as const;

type ProductSummaryRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SUMMARY_SELECT }>;

export function productSummary(row: ProductSummaryRow): CatalogSummary {
  return {
    name: row.name,
    href: `/marketplace/p/${row.slug}`,
    subtitle: row.shop.name,
    priceTiyin: tiyinToNumber(row.price),
    pricePrefix: null,
    image: toThumb(row.images),
    /**
     * Zaxirasi tugagan mahsulot ham ro'yxatda QOLADI.
     *
     * Uni o'chirib yuborsak, odam "men buni ko'rgan edim-ku" deb
     * hayron bo'lardi. Xiralashgan kartochka esa holatni aniq
     * aytadi.
     */
    isAvailable: row.isActive && row.stock > 0,
  };
}

// ── Taom ──────────────────────────────────────────────────────────────

export const MENU_ITEM_SUMMARY_SELECT = {
  id: true,
  name: true,
  price: true,
  isAvailable: true,
  restaurant: { select: { name: true, slug: true } },
  images: THUMB_SELECT,
} as const;

type MenuItemSummaryRow = Prisma.MenuItemGetPayload<{ select: typeof MENU_ITEM_SUMMARY_SELECT }>;

export function menuItemSummary(row: MenuItemSummaryRow): CatalogSummary {
  return {
    name: row.name,
    /** Taomning o'z sahifasi yo'q — havola restoran menyusiga ketadi. */
    href: `/food/${row.restaurant.slug}`,
    subtitle: row.restaurant.name,
    priceTiyin: tiyinToNumber(row.price),
    pricePrefix: null,
    image: toThumb(row.images),
    isAvailable: row.isAvailable,
  };
}

// ── Restoran ──────────────────────────────────────────────────────────

export const RESTAURANT_SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  cuisine: true,
  isActive: true,
  images: THUMB_SELECT,
} as const;

type RestaurantSummaryRow = Prisma.RestaurantGetPayload<{
  select: typeof RESTAURANT_SUMMARY_SELECT;
}>;

export function restaurantSummary(row: RestaurantSummaryRow): CatalogSummary {
  return {
    name: row.name,
    href: `/food/${row.slug}`,
    subtitle: row.cuisine,
    priceTiyin: null,
    pricePrefix: null,
    image: toThumb(row.images),
    isAvailable: row.isActive,
  };
}

// ── Mehmonxona ────────────────────────────────────────────────────────

export const HOTEL_SUMMARY_SELECT = {
  id: true,
  slug: true,
  name: true,
  city: true,
  isActive: true,
  images: THUMB_SELECT,
  rooms: {
    where: { isActive: true },
    select: { pricePerNight: true },
    orderBy: { pricePerNight: 'asc' as const },
    take: 1,
  },
} as const;

type HotelSummaryRow = Prisma.HotelGetPayload<{ select: typeof HOTEL_SUMMARY_SELECT }>;

export function hotelSummary(row: HotelSummaryRow): CatalogSummary {
  const cheapest = row.rooms[0];

  return {
    name: row.name,
    href: `/hotel/${row.slug}`,
    subtitle: row.city,
    /** Eng arzon xona narxi — "dan" belgisi bilan. */
    priceTiyin: cheapest ? tiyinToNumber(cheapest.pricePerNight) : null,
    pricePrefix: cheapest ? 'dan' : null,
    image: toThumb(row.images),
    isAvailable: row.isActive,
  };
}

// ── Vakansiya ─────────────────────────────────────────────────────────

export const VACANCY_SUMMARY_SELECT = {
  id: true,
  slug: true,
  title: true,
  city: true,
  salaryMin: true,
  isActive: true,
  company: { select: { name: true } },
} as const;

type VacancySummaryRow = Prisma.VacancyGetPayload<{ select: typeof VACANCY_SUMMARY_SELECT }>;

export function vacancySummary(row: VacancySummaryRow): CatalogSummary {
  return {
    name: row.title,
    href: `/jobs/v/${row.slug}`,
    subtitle: `${row.company.name} · ${row.city}`,
    /**
     * Maosh "kelishilgan" bo'lishi mumkin.
     *
     * Nolni ko'rsatib bo'lmaydi: u "bepul ish" degan ma'noni
     * berardi.
     */
    priceTiyin: row.salaryMin === null ? null : tiyinToNumber(row.salaryMin),
    pricePrefix: row.salaryMin === null ? null : 'dan',
    image: null,
    isAvailable: row.isActive,
  };
}
