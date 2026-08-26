import { prisma } from '@/lib/prisma';
import { toSearchText } from '@/lib/search';
import { formatCompactTiyin } from '@/lib/money';
import {
  RESULTS_PER_GROUP,
  groupsForQuery,
  rankByMatch,
  type SearchGroupKey,
} from '@/config/search-groups';
import { formatSalary } from '@/modules/job/job.types';
import { searchMessages } from '@/modules/chat/chat-search.service';
import { searchUsers } from '@/modules/profile/social.service';
import { formatUsername } from '@/modules/profile/social.types';
import type { SearchGroupResult, SearchHit, UnifiedSearchResponse } from '@/modules/search/search.types';

/**
 * Yagona qidiruv.
 *
 * ── Nima uchun so'rovlar PARALLEL ketadi ──────────────────────────────
 * Oltita katalog ketma-ket so'ralsa, javob ularning yig'indisi
 * bo'lardi: har biri 40 millisekund bo'lsa ham, jami 240.
 *
 * Odam esa yozayotib natijani kutadi va 240 millisekund seziladi.
 * Parallel so'rovda javob ENG SEKINI bilan cheklanadi.
 *
 * ── Nima uchun bitta bo'lim yiqilsa, qolgani QOLADI ───────────────────
 * `Promise.all` bittasi xato bersa hammasini bekor qiladi. Ya'ni
 * xabarlar jadvalidagi bitta muammo tufayli odam taomni ham topa
 * olmasdi.
 *
 * `Promise.allSettled` esa har birini alohida ko'radi: yiqilgan
 * bo'lim shunchaki ko'rinmaydi va qolgan hammasi ishlaydi.
 *
 * ── Nima uchun `total` alohida so'ralmaydi ────────────────────────────
 * Har bo'lim uchun `count` so'rovi — bu yana oltita so'rov.
 * Ularning qiymati esa kichik: odam "1247 ta mahsulot" degan
 * sonni o'qimaydi, u birinchi beshtasiga qaraydi.
 *
 * Shuning uchun chegaradan BITTA ortiq olinadi: shu bilan
 * "yana bor" degan javob aniq bo'ladi, qo'shimcha so'rovsiz.
 */

/** Chegaradan bitta ortiq olinadi — "yana bor" ni bilish uchun. */
const FETCH_LIMIT = RESULTS_PER_GROUP + 1;

export async function unifiedSearch(
  rawQuery: string,
  userId: string | null,
): Promise<UnifiedSearchResponse> {
  const query = rawQuery.trim();
  const needle = toSearchText(query);

  const keys = groupsForQuery(query, userId !== null);

  if (keys.length === 0 || needle.length === 0) {
    return { query, groups: [], total: 0 };
  }

  const settled = await Promise.allSettled(
    keys.map(async (key) => ({ key, hits: await runGroup(key, query, needle, userId) })),
  );

  const groups: SearchGroupResult[] = [];

  for (const entry of settled) {
    if (entry.status !== 'fulfilled') continue;

    const { key, hits } = entry.value;

    /* Bo'sh bo'lim KO'RSATILMAYDI — u faqat ekranni to'ldirardi. */
    if (hits.length === 0) continue;

    groups.push({ key, hits: hits.slice(0, RESULTS_PER_GROUP), total: hits.length });
  }

  return {
    query,
    groups,
    total: groups.reduce((sum, group) => sum + group.hits.length, 0),
  };
}

/** Bitta bo'limni qidiradi. */
async function runGroup(
  key: SearchGroupKey,
  query: string,
  needle: string,
  userId: string | null,
): Promise<SearchHit[]> {
  switch (key) {
    case 'MENU_ITEM':
      return searchMenuItems(needle);
    case 'PRODUCT':
      return searchProducts(needle);
    case 'HOTEL':
      return searchHotels(needle);
    case 'VACANCY':
      return searchVacancies(needle);
    case 'USER':
      return userId ? searchPeople(userId, query) : [];
    case 'MESSAGE':
      return userId ? searchUserMessages(userId, query) : [];
  }
}

/**
 * Katalog qidiruvining umumiy sharti.
 *
 * ── Nima uchun `startsWith` ham, `contains` ham ───────────────────────
 * Faqat `startsWith` bo'lsa, "plov" so'rovi "Toshkent plovi" ni
 * topmasdi. Faqat `contains` bo'lsa esa indeks ishlamaydi va
 * qidiruv butun jadvalni o'qiydi.
 *
 * Ikkalasi birga: ko'p holatda indeks ishlaydi, so'z o'rtasidagi
 * moslik esa yo'qolmaydi.
 */
function nameFilter(needle: string) {
  return {
    OR: [{ searchName: { startsWith: needle } }, { searchName: { contains: ` ${needle}` } }],
  };
}

async function searchMenuItems(needle: string): Promise<SearchHit[]> {
  const rows = await prisma.menuItem.findMany({
    where: {
      isAvailable: true,
      restaurant: { isActive: true },
      ...nameFilter(needle),
    },
    select: {
      id: true,
      name: true,
      searchName: true,
      price: true,
      restaurant: { select: { name: true, slug: true } },
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    take: FETCH_LIMIT,
  });

  return rankByMatch(rows, needle, (row) => row.searchName).map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: row.restaurant.name,
    meta: formatCompactTiyin(Number(row.price)),
    imageUrl: row.images[0]?.url ?? null,
    /* Taomning o'z sahifasi yo'q — restoran menyusi ochiladi. */
    href: `/food/${row.restaurant.slug}`,
  }));
}

async function searchProducts(needle: string): Promise<SearchHit[]> {
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      shop: { isActive: true },
      ...nameFilter(needle),
    },
    select: {
      id: true,
      slug: true,
      name: true,
      searchName: true,
      price: true,
      shop: { select: { name: true } },
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
    },
    take: FETCH_LIMIT,
  });

  return rankByMatch(rows, needle, (row) => row.searchName).map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: row.shop.name,
    meta: formatCompactTiyin(Number(row.price)),
    imageUrl: row.images[0]?.url ?? null,
    href: `/marketplace/p/${row.slug}`,
  }));
}

async function searchHotels(needle: string): Promise<SearchHit[]> {
  const rows = await prisma.hotel.findMany({
    where: { isActive: true, ...nameFilter(needle) },
    select: {
      id: true,
      slug: true,
      name: true,
      searchName: true,
      city: true,
      stars: true,
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      rooms: {
        where: { isActive: true },
        select: { pricePerNight: true },
        orderBy: { pricePerNight: 'asc' },
        take: 1,
      },
    },
    take: FETCH_LIMIT,
  });

  return rankByMatch(rows, needle, (row) => row.searchName).map((row) => ({
    id: row.id,
    title: row.name,
    subtitle: row.city,
    /* Eng arzon xona narxi. Xona bo'lmasa yulduzlar ko'rsatiladi. */
    meta:
      row.rooms[0] !== undefined
        ? `${formatCompactTiyin(Number(row.rooms[0].pricePerNight))} / kecha`
        : `${row.stars} yulduz`,
    imageUrl: row.images[0]?.url ?? null,
    href: `/hotel/${row.slug}`,
  }));
}

async function searchVacancies(needle: string): Promise<SearchHit[]> {
  const rows = await prisma.vacancy.findMany({
    where: {
      isActive: true,
      company: { isActive: true },
      ...nameFilter(needle),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      searchName: true,
      salaryMin: true,
      salaryMax: true,
      city: true,
      company: { select: { name: true } },
    },
    take: FETCH_LIMIT,
  });

  return rankByMatch(rows, needle, (row) => row.searchName).map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: `${row.company.name} · ${row.city}`,
    meta: formatSalary(
      row.salaryMin === null ? null : Number(row.salaryMin),
      row.salaryMax === null ? null : Number(row.salaryMax),
      (value) => formatCompactTiyin(value),
    ),
    imageUrl: null,
    href: `/jobs/v/${row.slug}`,
  }));
}

/**
 * Odamlar — TAYYOR xizmat orqali.
 *
 * ── Nima uchun qaytadan yozilmadi ─────────────────────────────────────
 * `searchUsers` da bloklangan odamlarni yashirish mantig'i bor va u
 * xavfsizlik masalasi: bezovta qiluvchi odam qurbonini qidiruv
 * orqali qayta topa olmasligi kerak.
 *
 * Uni bu yerda takrorlash — o'sha himoyani ikkinchi joyda saqlash
 * degani va vaqt o'tib ular bir-biridan ajralib ketardi.
 */
async function searchPeople(userId: string, query: string): Promise<SearchHit[]> {
  const users = await searchUsers(userId, query, FETCH_LIMIT);

  return users.map((user) => ({
    id: user.id,
    title: user.fullName ?? formatUsername(user.username),
    subtitle: formatUsername(user.username),
    /* Obuna bo'lgan odam ajratiladi — tanish nomni topish osonlashadi. */
    meta: user.isFollowing ? 'Obunadasiz' : null,
    imageUrl: user.avatarUrl,
    href: `/u/${user.username}`,
  }));
}

/**
 * Xabarlar — TAYYOR xizmat orqali.
 *
 * ── Nima uchun bu eng nozik bo'lim ────────────────────────────────────
 * Xabarlar shaxsiy. `searchMessages` faqat foydalanuvchi A'ZO
 * bo'lgan suhbatlarda qidiradi va bu tekshiruv o'sha yerda
 * yozilgan.
 *
 * Bu yerda qaytadan so'rov yozilsa, a'zolik shartini unutish
 * mumkin edi — va begona suhbat matni qidiruv natijasida
 * ko'rinardi.
 */
async function searchUserMessages(userId: string, query: string): Promise<SearchHit[]> {
  const result = await searchMessages(userId, { query, page: 1 });

  return result.hits.slice(0, FETCH_LIMIT).map((hit) => ({
    id: hit.messageId,
    title: hit.snippet,
    subtitle: hit.conversationTitle,
    meta: hit.isMine ? 'Siz' : hit.senderName,
    imageUrl: hit.conversationImageUrl,
    href: `/chat/${hit.conversationId}`,
  }));
}
