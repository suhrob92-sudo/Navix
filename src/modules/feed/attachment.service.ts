import { Prisma } from '@/generated/prisma/client';
import { NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import { ATTACHMENT_KIND_CONFIG, type AttachmentKindName } from '@/config/attachments';
import { LINKED_POSTS_LIMIT } from '@/config/linked-posts';
import { LIVE_AUTHOR, postSelect, toPostView } from '@/modules/feed/feed.select';
import type { PostView } from '@/modules/feed/feed.types';
import { blockedUserIds } from '@/modules/moderation/moderation.service';

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

// ─────────────────────────────────────────────────────────────────────
// Teskari yo'nalish — "shu narsa ko'rsatilgan videolar"
// ─────────────────────────────────────────────────────────────────────

/**
 * Nishonga mos biriktirma sharti.
 *
 * ── Nima uchun RESTORAN alohida ko'rib chiqiladi ──────────────────────
 * Boshqa turlarda bog'lanish bitta ustunda turadi. Restoran esa
 * IKKI YO'L bilan ko'rsatiladi: bloger restoranning o'zini
 * biriktiradi yoki uning aniq bir taomini.
 *
 * Faqat birinchisini hisoblasak, restoran sahifasi "video yo'q"
 * deb turardi — holbuki uning lag'moni haqida o'nta video bor edi.
 * Egasi uchun bu bo'lim shunchaki ishlamayotgandek ko'rinardi.
 */
function attachmentFilter(
  kind: AttachmentKindName,
  targetId: string,
): Prisma.PostAttachmentWhereInput {
  if (kind === 'RESTAURANT') {
    return { OR: [{ restaurantId: targetId }, { menuItem: { restaurantId: targetId } }] };
  }

  return { [TARGETS[kind].column]: targetId };
}

/**
 * Shu narsa biriktirilgan videolar — YANGISIDAN eskisiga.
 *
 * ── Nima uchun faqat VIDEO ────────────────────────────────────────────
 * Biriktirish tugmasi post yozish oynasida faqat video yuklanganda
 * chiqadi. Ya'ni matnli postda biriktirma bo'lishi mumkin emas.
 *
 * Shart baribir SO'ROVDA turadi: ekrandagi tasma tik kadrlarni
 * ko'rsatadi va matnli post u yerda bo'sh to'rtburchak bo'lardi.
 * Kelajakda oynadagi qoida o'zgarsa ham, bu bo'lim buzilmaydi.
 *
 * ── Nima uchun TAVSIYA emas, VAQT bo'yicha ────────────────────────────
 * Odam mahsulot sahifasida "eng yangi fikr qanday?" deb qaraydi.
 * Bir yil oldingi video eng ko'p ko'rilgani bo'lishi mumkin, lekin
 * mahsulot o'shandan beri o'zgargan bo'lishi ham mumkin.
 *
 * ── Nima uchun BELGI (cursor) yo'q ────────────────────────────────────
 * Bu bo'lim sahifaning asosiy mazmuni emas — chegara bitta va
 * qat'iy (`LINKED_POSTS_LIMIT`). Sahifalash qo'shilsa, mahsulot
 * sahifasi lentaga aylanib qolardi.
 */
export async function listPostsForTarget(
  kind: AttachmentKindName,
  targetId: string,
  viewerId: string,
  limit = LINKED_POSTS_LIMIT,
): Promise<PostView[]> {
  /*
    Bloklangan odamning videosi bu yerda ham ko'rinmaydi.

    Lentada yashirib, mahsulot sahifasida ko'rsatish va'dani
    buzardi: odam "bu odamni ko'rmayman" deb tugma bosgan.
  */
  const hidden = await blockedUserIds(viewerId);

  const rows = await prisma.post.findMany({
    where: {
      ...LIVE_AUTHOR,
      videoUrl: { not: null },
      attachments: { some: attachmentFilter(kind, targetId) },
      ...(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    select: postSelect(viewerId),
  });

  return rows.map((row) => toPostView(row, viewerId));
}
