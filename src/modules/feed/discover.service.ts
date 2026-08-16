import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { LIVE_AUTHOR, postSelect, toPostView } from '@/modules/feed/feed.select';
import { MIN_SEARCH_LENGTH } from '@/modules/feed/discover.types';
import type { DiscoverResult, FeedSearchResult, SearchScope } from '@/modules/feed/discover.types';
import type { HashtagView, PostView } from '@/modules/feed/feed.types';
import { blockedUserIds } from '@/modules/moderation/moderation.service';
import { searchUsers } from '@/modules/profile/social.service';
import type { UserSearchResult } from '@/modules/profile/social.types';

/**
 * Kashf qilish va qidiruv — Feed'ning "Qidirish" sahifasi uchun.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * `feed.service.ts` allaqachon uzun va u YOZISH amallariga (post,
 * izoh, yoqtirish) javob beradi. Bu yerdagilar esa faqat O'QIYDI va
 * hech narsani o'zgartirmaydi.
 *
 * Ajratilgani sababli ularni keshlash yoki alohida bazaga ko'chirish
 * ham keyinchalik oson bo'ladi.
 */

/**
 * "Mashhur" deb sanaladigan davr.
 *
 * ── Nima uchun 30 kun ─────────────────────────────────────────────────
 * Cheklovsiz olsak, ro'yxatni bir yil oldingi bitta viral video
 * abadiy egallab turardi va yangi mualliflar hech qachon ko'rinmasdi.
 *
 * Bir hafta esa juda qisqa: dam olish kunlari joylangan yaxshi video
 * dushanbaga yetmay tushib ketardi.
 */
export const POPULAR_WINDOW_DAYS = 30;

function windowStart(): Date {
  return new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Mashhur videolar — ko'rishlar soni bo'yicha.
 *
 * ── Nima uchun sahifalash YO'Q ────────────────────────────────────────
 * Bu ro'yxat qidiruv sahifasining tepasida turadigan bitta qator.
 * Odam undan tanlab video ochadi yoki qidiruvni yozadi — pastga
 * cheksiz surmaydi. Sahifalash qo'shsak, `viewCount` bo'yicha
 * belgi (cursor) yasash kerak bo'lardi va u har ko'rishda o'zgarib
 * turgani uchun bir post ikki marta chiqib qolardi.
 */
export async function listPopularVideos(viewerId: string, limit = 12): Promise<PostView[]> {
  const hidden = await blockedUserIds(viewerId);

  const rows = await prisma.post.findMany({
    where: {
      ...LIVE_AUTHOR,
      videoUrl: { not: null },
      createdAt: { gte: windowStart() },
      ...(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}),
    },
    select: postSelect(viewerId),
    // Ko'rish soni teng bo'lsa — yangisi ustun: eski video abadiy
    // birinchi o'rinda turib qolmasligi kerak.
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return rows.map((row) => toPostView(row, viewerId));
}

/**
 * Tavsiya etilgan ijodkorlar.
 *
 * ── Nima uchun ALOHIDA jadval kerak emas ──────────────────────────────
 * "Kimga obuna bo'lay?" degan savolga eng halol javob — kimning
 * videosi ko'p ko'rilgan. Buni allaqachon bor ma'lumotdan hisoblash
 * mumkin, tavsiya uchun alohida tizim qurish shart emas.
 *
 * Obuna bo'lganlar VA bloklanganlar ro'yxatdan chiqariladi: allaqachon
 * obuna bo'lgan odamni yana taklif qilish — bo'sh joyni behuda
 * egallash.
 */
export async function listSuggestedCreators(viewerId: string, limit = 5): Promise<UserSearchResult[]> {
  const [hidden, following] = await Promise.all([
    blockedUserIds(viewerId),
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
  ]);

  const skip = new Set([viewerId, ...hidden, ...following.map((row) => row.followingId)]);

  /**
   * Guruhlash chegarasi so'ralganidan KATTA.
   *
   * Muallif ro'yxatdan chiqib ketishi mumkin (obuna bo'lingan yoki
   * bloklangan). Aynan `limit` ta olsak, filtrdan keyin ro'yxat
   * yarim bo'sh qolardi.
   */
  const grouped = await prisma.post.groupBy({
    by: ['authorId'],
    where: {
      ...LIVE_AUTHOR,
      videoUrl: { not: null },
      createdAt: { gte: windowStart() },
      authorId: { notIn: [...skip] },
    },
    _sum: { viewCount: true },
    orderBy: { _sum: { viewCount: 'desc' } },
    take: limit * 3,
  });

  if (grouped.length === 0) return [];

  const authors = await prisma.user.findMany({
    where: { id: { in: grouped.map((row) => row.authorId) }, deletedAt: null, profile: { isNot: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      profile: { select: { username: true, isVerified: true } },
    },
  });

  const byId = new Map(authors.map((row) => [row.id, row]));

  const result: UserSearchResult[] = [];

  // Tartib `groupBy` dan olinadi — u ko'rishlar bo'yicha saralangan.
  for (const row of grouped) {
    const author = byId.get(row.authorId);

    if (!author?.profile) continue;

    const fullName = [author.firstName, author.lastName].filter(Boolean).join(' ');

    result.push({
      id: author.id,
      username: author.profile.username,
      fullName: fullName || null,
      avatarUrl: author.avatarUrl,
      isVerified: author.profile.isVerified,
      // Obuna bo'lganlar yuqorida chiqarib tashlangan.
      isFollowing: false,
    });

    if (result.length >= limit) break;
  }

  return result;
}

/** Mashhur mavzular — ko'p ishlatilgani birinchi. */
async function topHashtags(limit: number): Promise<HashtagView[]> {
  const rows = await prisma.hashtag.findMany({
    where: { postCount: { gt: 0 } },
    orderBy: [{ postCount: 'desc' }, { tag: 'asc' }],
    take: limit,
    select: { tag: true, postCount: true },
  });

  return rows;
}

/**
 * Qidiruv sahifasining BOSHLANG'ICH holati.
 *
 * ── Nima uchun bitta so'rovda ─────────────────────────────────────────
 * Uch narsa (mavzular, ijodkorlar, videolar) uchta alohida so'rov
 * bo'lsa, mobil internetda sahifa uch marta sakrab ochilardi.
 * Bittada olinsa — bir marta chiziladi.
 */
export async function loadDiscover(viewerId: string): Promise<DiscoverResult> {
  const [hashtags, creators, videos] = await Promise.all([
    topHashtags(12),
    listSuggestedCreators(viewerId, 5),
    listPopularVideos(viewerId, 12),
  ]);

  return { hashtags, creators, videos };
}

/** Mavzuni nomi bo'yicha qidirish. */
async function searchHashtags(query: string, limit: number): Promise<HashtagView[]> {
  const rows = await prisma.hashtag.findMany({
    where: { tag: { contains: query, mode: 'insensitive' }, postCount: { gt: 0 } },
    orderBy: [{ postCount: 'desc' }, { tag: 'asc' }],
    take: limit,
    select: { tag: true, postCount: true },
  });

  return rows;
}

/** Videolarni matni bo'yicha qidirish. */
async function searchVideos(viewerId: string, query: string, limit: number): Promise<PostView[]> {
  const hidden = await blockedUserIds(viewerId);

  const where: Prisma.PostWhereInput = {
    ...LIVE_AUTHOR,
    videoUrl: { not: null },
    body: { contains: query, mode: 'insensitive' },
    ...(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}),
  };

  const rows = await prisma.post.findMany({
    where,
    select: postSelect(viewerId),
    orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return rows.map((row) => toPostView(row, viewerId));
}

/**
 * Feed qidiruvi.
 *
 * ── Nima uchun `scope` bor ────────────────────────────────────────────
 * "Barchasi" da uchala turdan bir nechtadan ko'rsatiladi — odam nima
 * topilganini bir qarashda ko'radi. Aniq bir turni tanlasa esa, faqat
 * o'shandan ko'proq beriladi.
 *
 * Kerak bo'lmagan turlar UMUMAN so'ralmaydi: xeshteg qidirayotgan
 * odam uchun video jadvalini titkilash bekorga sarflangan vaqt.
 */
export async function searchFeed(
  viewerId: string,
  rawQuery: string,
  scope: SearchScope,
): Promise<FeedSearchResult> {
  const query = rawQuery.trim().replace(/^[#@]/, '');

  if (query.length < MIN_SEARCH_LENGTH) {
    return { hashtags: [], creators: [], videos: [] };
  }

  const wide = scope === 'ALL';

  const [hashtags, creators, videos] = await Promise.all([
    wide || scope === 'HASHTAG' ? searchHashtags(query, wide ? 8 : 30) : Promise.resolve([]),
    wide || scope === 'CREATOR' ? searchUsers(viewerId, query, wide ? 5 : 20) : Promise.resolve([]),
    wide || scope === 'VIDEO' ? searchVideos(viewerId, query, wide ? 9 : 30) : Promise.resolve([]),
  ]);

  return { hashtags, creators, videos };
}
