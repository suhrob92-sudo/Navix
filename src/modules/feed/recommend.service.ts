import { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import {
  RANKING_TTL_SECONDS,
  currentRankingVersion,
  rankingCacheKey,
} from '@/modules/feed/recommend.cache';
import { LIVE_AUTHOR, postSelect, toPostView } from '@/modules/feed/feed.select';
import type { PostCategoryName, PostView } from '@/modules/feed/feed.types';
import {
  normalizeCounts,
  rankCandidates,
  type RankableCandidate,
  type TasteProfile,
} from '@/modules/feed/ranking';
import { getFeedSettings } from '@/modules/feed/settings.service';
import { blockedUserIds } from '@/modules/moderation/moderation.service';

/**
 * "Siz uchun" lentasi — tavsiya tizimi.
 *
 * ── Eng qiyin masala: SAHIFALASH ──────────────────────────────────────
 * Oddiy lenta vaqt bo'yicha tartiblangan va "shu vaqtdan keyingisini
 * ber" degan belgi (cursor) bilan sahifalanadi. Tavsiyada esa tartib
 * BAHOGA bog'liq va baho har soniyada o'zgaradi (post yangi
 * yoqtirish oldi, odam boshqa videoni ko'rdi).
 *
 * Agar har sahifada qaytadan hisoblasak, ikkinchi sahifada birinchi
 * sahifadagi postlar qayta chiqib qolardi yoki umuman tushib
 * ketardi.
 *
 * ── Yechim: tartib BIR MARTA hisoblanadi va saqlanadi ─────────────────
 * Birinchi sahifada nomzodlar tartiblanib, ID lar ro'yxati Redis'ga
 * yoziladi. Keyingi sahifalar shu ro'yxatdan kesib olinadi.
 *
 * Ro'yxat 10 daqiqadan keyin o'chadi: odam lentani yangilaganda
 * yangi hisob boshlanadi, ya'ni yangi postlar ham chiqadi.
 */

/** Nechta postdan tanlanadi. */
const CANDIDATE_LIMIT = 300;

/** Signallar qancha orqaga qaraladi. */
const SIGNAL_WINDOW_DAYS = 60;

/** Har bir signal turining og'irligi. */
const SIGNAL_WEIGHTS = {
  /** Yoqtirish — bir bosish, eng arzon signal. */
  like: 1,
  /** Saqlash — "keyin kerak bo'ladi", kuchliroq niyat. */
  save: 2,
  /** Izoh — vaqt sarflagan, ya'ni haqiqatan qiziqqan. */
  comment: 3,
  /** Mahsulot tugmasi — sotib olishga eng yaqin qadam. */
  productClick: 4,
} as const;

function windowStart(): Date {
  return new Date(Date.now() - SIGNAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function add<Key>(map: Map<Key, number>, key: Key | null, weight: number): void {
  if (key === null) return;

  map.set(key, (map.get(key) ?? 0) + weight);
}

/**
 * Odamning didini xatti-harakatidan yig'adi.
 *
 * ── Nima uchun barcha so'rov BIR VAQTDA ───────────────────────────────
 * Ular bir-biriga bog'liq emas. Ketma-ket yuborilsa, lenta besh
 * marta kutardi.
 */
export async function buildTasteProfile(userId: string): Promise<TasteProfile> {
  const since = windowStart();

  const [likes, saves, comments, clicks, follows, seen, settings] = await Promise.all([
    prisma.postLike.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { post: { select: { category: true, authorId: true } } },
      take: 500,
    }),
    prisma.postSave.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { post: { select: { category: true, authorId: true } } },
      take: 500,
    }),
    prisma.postComment.findMany({
      where: { authorId: userId, createdAt: { gte: since }, deletedAt: null },
      select: { post: { select: { category: true, authorId: true } } },
      take: 500,
    }),
    prisma.postProductClick.findMany({
      where: { userId, clickedAt: { gte: since } },
      select: { post: { select: { category: true, authorId: true } } },
      take: 300,
    }),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    /**
     * Ko'rilganlar — FAQAT so'nggilari.
     *
     * Bir yil oldin ko'rilgan postni qayta ko'rsatish yomon emas:
     * odam uni allaqachon unutgan. Ro'yxatni cheklash esa xotira va
     * so'rov vaqtini tejaydi.
     */
    prisma.postSeen.findMany({
      where: { userId },
      orderBy: { seenAt: 'desc' },
      select: { postId: true },
      take: 1_000,
    }),
    getFeedSettings(userId),
  ]);

  const categoryCounts = new Map<PostCategoryName, number>();
  const authorCounts = new Map<string, number>();

  const collect = (
    rows: { post: { category: PostCategoryName | null; authorId: string } }[],
    weight: number,
  ) => {
    for (const row of rows) {
      add(categoryCounts, row.post.category, weight);
      add(authorCounts, row.post.authorId, weight);
    }
  };

  collect(likes, SIGNAL_WEIGHTS.like);
  collect(saves, SIGNAL_WEIGHTS.save);
  collect(comments, SIGNAL_WEIGHTS.comment);
  collect(clicks, SIGNAL_WEIGHTS.productClick);

  return {
    categoryAffinity: normalizeCounts(categoryCounts),
    authorAffinity: normalizeCounts(authorCounts),
    chosenInterests: new Set(settings.interests),
    followingIds: new Set(follows.map((row) => row.followingId)),
    seenPostIds: new Set(seen.map((row) => row.postId)),
    viewerId: userId,
  };
}

/**
 * Tartiblangan ID ro'yxatini oladi yoki qayta hisoblaydi.
 *
 * ── Nima uchun Redis yiqilsa ham ISHLAYDI ─────────────────────────────
 * Kesh — tezlik uchun, to'g'rilik uchun emas. Redis o'chib qolsa,
 * ro'yxat har sahifada qaytadan hisoblanadi: bu sekinroq va
 * chegarada postlar takrorlanishi mumkin, lekin lenta ISHLAYVERADI.
 *
 * Tavsiya tizimi tufayli butun lentaning yiqilishi — eng yomon
 * natija bo'lardi.
 */
async function loadRanking(
  userId: string,
  scope: string,
  extraWhere: Prisma.PostWhereInput,
): Promise<string[]> {
  const key = rankingCacheKey(userId, await currentRankingVersion(userId), scope);

  try {
    const cached = await getRedis().get(key);

    if (cached) {
      const parsed = JSON.parse(cached) as unknown;

      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed;
      }
    }
  } catch (error) {
    logger.warn({ err: error, userId }, "Tavsiya keshini o'qib bo'lmadi");
  }

  const [hidden, taste] = await Promise.all([blockedUserIds(userId), buildTasteProfile(userId)]);

  /**
   * Nomzodlar YANGILIK bo'yicha olinadi.
   *
   * Butun jadvalni tartiblash mumkin emas — u millionlab qatorga
   * yetadi. So'nggi 300 ta post esa deyarli har doim yetarli:
   * undan eskisi baribir yangilik bahosida nolga yaqin bo'lardi.
   */
  const rows = await prisma.post.findMany({
    where: {
      ...LIVE_AUTHOR,
      ...extraWhere,
      ...(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      authorId: true,
      category: true,
      createdAt: true,
      likeCount: true,
      commentCount: true,
      viewCount: true,
    },
  });

  const ranked = rankCandidates(rows as RankableCandidate[], taste, new Date());

  try {
    await getRedis().set(key, JSON.stringify(ranked), 'EX', RANKING_TTL_SECONDS);
  } catch (error) {
    logger.warn({ err: error, userId }, "Tavsiya keshini yozib bo'lmadi");
  }

  return ranked;
}

/**
 * Belgi (cursor) — tartiblangan ro'yxatdagi O'RIN.
 *
 * Oddiy lentadagi vaqt belgisidan farq qiladi va shuning uchun
 * boshqacha ko'rinadi (`r120`). Ikkalasini bir sxemada aralashtirsak,
 * noto'g'ri belgi jim ishlab, chalkash natija berardi.
 */
export const RECOMMEND_CURSOR_PATTERN = /^r(\d{1,6})$/;

function parseOffset(cursor: string | undefined): number {
  if (!cursor) return 0;

  const match = RECOMMEND_CURSOR_PATTERN.exec(cursor);

  return match ? Number(match[1]) : 0;
}

/**
 * "Siz uchun" lentasi.
 *
 * @param extraWhere Qo'shimcha shartlar (bo'lim filtri, hassos filtr).
 */
export async function listRecommendedFeed(
  viewerId: string,
  options: {
    cursor?: string;
    limit: number;
    extraWhere?: Prisma.PostWhereInput;
    /**
     * Filtrning NOMI — kesh kalitiga kiradi.
     *
     * Har bir filtr o'z tartiblangan ro'yxatiga ega bo'lishi kerak.
     * Umumiy nom ishlatilsa, "Ishlar" bo'limi so'ralganda umumiy
     * lentaning keshi qaytarilardi.
     */
    scope: string;
  },
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  const ranked = await loadRanking(viewerId, options.scope, options.extraWhere ?? {});

  const offset = parseOffset(options.cursor);
  const pageIds = ranked.slice(offset, offset + options.limit);

  if (pageIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const rows = await prisma.post.findMany({
    where: { id: { in: pageIds }, ...LIVE_AUTHOR },
    select: postSelect(viewerId),
  });

  /**
   * Tartib QAYTA tiklanadi.
   *
   * `findMany` bazadagi tartibda qaytaradi, bizga esa tavsiya
   * tartibi kerak. Xarita orqali tiklash `orderBy` yozishdan
   * ancha oson va tezroq.
   */
  const byId = new Map(rows.map((row) => [row.id, row]));

  const posts = pageIds
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row !== undefined)
    .map((row) => toPostView(row, viewerId));

  const nextOffset = offset + options.limit;

  return {
    posts,
    nextCursor: nextOffset < ranked.length ? `r${nextOffset}` : null,
  };
}
