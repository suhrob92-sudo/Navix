import { Prisma } from '@/generated/prisma/client';
import { NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { ATTACHMENT_KIND_CONFIG, type AttachmentKindName } from '@/config/attachments';

/**
 * Videoga biriktirilgan narsalar — TEKSHIRISH va QIDIRISH.
 *
 * ── Nima uchun `feed.service.ts` dan alohida ──────────────────────────
 * Lenta moduli allaqachon katta va uning ishi boshqa: postlarni
 * o'qish, yozish, tartiblash. Bu yerda esa butun ekotizim bilan
 * gaplashiladi — marketplace, restoranlar, ishlar, mehmonxonalar.
 *
 * Ular aralashsa, ertaga yangi bo'lim qo'shilganda lenta moduli
 * yana kengayardi va oxir-oqibat unga hech kim tegishga
 * botinmasdi.
 */

/** Brauzerdan kelgan biriktirma so'rovi. */
export interface AttachmentInput {
  kind: AttachmentKindName;
  /** Nishonning ID si — mahsulot, taom, restoran va hokazo. */
  targetId: string;
}

/**
 * Har bir tur uchun: qaysi jadval va "ochiq" degani nima.
 *
 * ── Nima uchun bu xarita KERAK ────────────────────────────────────────
 * Tekshiruv beshta turda deyarli bir xil: "shunday ID bormi va u
 * hozir ochiqmi?". Har biriga alohida `if` yozilsa, beshta deyarli
 * bir xil blok paydo bo'lardi va yangi tur qo'shilganda oltinchisi
 * qo'shilardi.
 *
 * Xarita bilan esa yangi tur — bitta qator.
 */
const TARGETS: Record<
  AttachmentKindName,
  {
    /** Qaysi ustunga yoziladi. */
    column: 'productId' | 'menuItemId' | 'restaurantId' | 'vacancyId' | 'hotelId';
    /** Mavjudligini tekshiradi. */
    exists: (ids: string[]) => Promise<string[]>;
    /** Topilmaganda ko'rsatiladigan nom. */
    missing: string;
  }
> = {
  PRODUCT: {
    column: 'productId',
    missing: 'Mahsulot',
    /*
      Zaxira ham TEKSHIRILADI.

      Ekrandagi "ochiq" hisobi (`feed.select.ts`) zaxirani ham
      qaraydi. Bu yerda tekshirmasak, sotuvda yo'q mahsulotni
      biriktirish mumkin bo'lardi va tugma birinchi kunidanoq
      "Hozir mavjud emas" deb turardi.

      Keyinchalik zaxira tugasa — bu boshqa masala: u holda tugma
      halol o'chadi. Lekin O'LIK tugmani yaratishga ruxsat berish
      shart emas.
    */
    exists: async (ids) =>
      (
        await prisma.product.findMany({
          where: { id: { in: ids }, isActive: true, stock: { gt: 0 }, shop: { isActive: true } },
          select: { id: true },
        })
      ).map((row) => row.id),
  },
  MENU_ITEM: {
    column: 'menuItemId',
    missing: 'Taom',
    exists: async (ids) =>
      (
        await prisma.menuItem.findMany({
          where: { id: { in: ids }, isAvailable: true, restaurant: { isActive: true } },
          select: { id: true },
        })
      ).map((row) => row.id),
  },
  RESTAURANT: {
    column: 'restaurantId',
    missing: 'Restoran',
    exists: async (ids) =>
      (
        await prisma.restaurant.findMany({
          where: { id: { in: ids }, isActive: true },
          select: { id: true },
        })
      ).map((row) => row.id),
  },
  VACANCY: {
    column: 'vacancyId',
    missing: "Ish e'loni",
    exists: async (ids) =>
      (
        await prisma.vacancy.findMany({
          where: { id: { in: ids }, isActive: true },
          select: { id: true },
        })
      ).map((row) => row.id),
  },
  HOTEL: {
    column: 'hotelId',
    missing: 'Mehmonxona',
    exists: async (ids) =>
      (
        await prisma.hotel.findMany({
          where: { id: { in: ids }, isActive: true },
          select: { id: true },
        })
      ).map((row) => row.id),
  },
};

/** Bir xil narsa ikki marta tanlangan bo'lsa, ortiqchasi tashlanadi. */
function unique(items: AttachmentInput[]): AttachmentInput[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.kind}:${item.targetId}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

/**
 * Biriktirmalarni tekshiradi va yozishga tayyor holatga keltiradi.
 *
 * ── Nima uchun tekshiruv SHART ────────────────────────────────────────
 * ID brauzerdan keladi, ya'ni uni istalgan qiymatga o'zgartirish
 * mumkin. Tekshirilmasa, odam yopilgan do'konning mahsulotini yoki
 * umuman mavjud bo'lmagan ID ni biriktirib qo'yardi va tugma bo'sh
 * sahifaga olib borardi.
 *
 * ── Nima uchun har tur uchun BITTA so'rov ─────────────────────────────
 * Beshta biriktirma uchun beshta so'rov yuborish keraksiz. Ular
 * turlarga guruhlanadi va har guruh bitta `IN` so'rovi bilan
 * tekshiriladi.
 */
export async function prepareAttachments(
  items: AttachmentInput[],
): Promise<Prisma.PostAttachmentCreateWithoutPostInput[]> {
  const list = unique(items);

  if (list.length === 0) return [];

  const byKind = new Map<AttachmentKindName, string[]>();

  for (const item of list) {
    byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item.targetId]);
  }

  /*
    Turlar BIR VAQTDA tekshiriladi.

    Ular bir-biriga bog'liq emas: mahsulotni tekshirish restoranni
    tekshirishni kutib turishi kerak emas.
  */
  await Promise.all(
    [...byKind].map(async ([kind, ids]) => {
      const found = await TARGETS[kind].exists(ids);

      if (found.length !== new Set(ids).size) {
        throw new NotFoundError(TARGETS[kind].missing);
      }
    }),
  );

  // Tartib odam tanlagan tartibda saqlanadi.
  return list.map((item, index) => ({
    kind: item.kind,
    [TARGETS[item.kind].column]: item.targetId,
    sortOrder: index,
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Qidiruv — tanlash oynasi uchun
// ─────────────────────────────────────────────────────────────────────

/** Tanlash oynasidagi bitta qator. */
export interface AttachmentSearchResult {
  id: string;
  kind: AttachmentKindName;
  name: string;
  subtitle: string | null;
}

/** Qidiruv natijasining chegarasi — ro'yxat ekranga sig'ishi kerak. */
const SEARCH_LIMIT = 20;

/** Qidiruv uchun eng kam belgi — bitta harf butun katalogni qaytarardi. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * Nomi bo'yicha qidiradi.
 *
 * ── Nima uchun `mode: insensitive` ────────────────────────────────────
 * Odam "plov" deb yozadi, bazada esa "Plov" turadi. Katta-kichik
 * harf farqi qidiruvni ishlamaydigan qilib qo'yardi va odam
 * "hech narsa topilmadi" degan xulosaga kelardi.
 */
export async function searchAttachments(
  kind: AttachmentKindName,
  term: string,
): Promise<AttachmentSearchResult[]> {
  const query = term.trim();

  if (query.length < MIN_SEARCH_LENGTH) return [];

  const contains = { contains: query, mode: 'insensitive' } as const;

  if (kind === 'PRODUCT') {
    const rows = await prisma.product.findMany({
      // Qidiruvda ham zaxirasi borlari — biriktirib bo'lmaydiganini
      // ko'rsatishning ma'nosi yo'q.
      where: { name: contains, isActive: true, stock: { gt: 0 }, shop: { isActive: true } },
      select: { id: true, name: true, shop: { select: { name: true } } },
      take: SEARCH_LIMIT,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({ id: row.id, kind, name: row.name, subtitle: row.shop.name }));
  }

  if (kind === 'MENU_ITEM') {
    const rows = await prisma.menuItem.findMany({
      where: { name: contains, isAvailable: true, restaurant: { isActive: true } },
      select: { id: true, name: true, restaurant: { select: { name: true } } },
      take: SEARCH_LIMIT,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({ id: row.id, kind, name: row.name, subtitle: row.restaurant.name }));
  }

  if (kind === 'RESTAURANT') {
    const rows = await prisma.restaurant.findMany({
      where: { name: contains, isActive: true },
      select: { id: true, name: true, cuisine: true },
      take: SEARCH_LIMIT,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({ id: row.id, kind, name: row.name, subtitle: row.cuisine }));
  }

  if (kind === 'VACANCY') {
    const rows = await prisma.vacancy.findMany({
      where: { title: contains, isActive: true },
      select: { id: true, title: true, city: true, company: { select: { name: true } } },
      take: SEARCH_LIMIT,
      orderBy: { title: 'asc' },
    });

    return rows.map((row) => ({
      id: row.id,
      kind,
      name: row.title,
      subtitle: `${row.company.name} · ${row.city}`,
    }));
  }

  const rows = await prisma.hotel.findMany({
    where: { name: contains, isActive: true },
    select: { id: true, name: true, city: true },
    take: SEARCH_LIMIT,
    orderBy: { name: 'asc' },
  });

  return rows.map((row) => ({ id: row.id, kind, name: row.name, subtitle: row.city }));
}

/**
 * Turga mos manzil — tekshiruv va sinovlar uchun.
 *
 * Ekranda havolani `ATTACHMENT_KIND_CONFIG` yasaydi. Bu yerda esa u
 * server tomonidan ham chaqirilishi mumkin (masalan bildirishnomada
 * havola kerak bo'lganda).
 */
export function attachmentHref(kind: AttachmentKindName, slug: string): string {
  return ATTACHMENT_KIND_CONFIG[kind].href(slug);
}
