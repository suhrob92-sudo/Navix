import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import {
  normalizeUserQuery,
  userMatchRank,
  type FollowResponse,
  type PublicProfile,
  type UserSearchResult,
} from '@/modules/profile/social.types';

/**
 * Ommaviy profil va kuzatuv (follow).
 *
 * ── Nima uchun obunachilar soni SANALADI, saqlanmaydi ─────────────────
 * "followerCount" ustunini yuritish tezroq bo'lardi, lekin u har
 * obuna qo'shilganda va o'chirilganda qo'lda yangilanishi kerak edi.
 * Bitta unutilgan joy — va son abadiy noto'g'ri bo'lib qolardi.
 *
 * Hozircha `count()` yetarli: indeks bor va obunachilar soni million
 * bo'lgunicha bu so'rov tez ishlaydi. Keraklikda keshlash qo'shiladi.
 */

const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  createdAt: true,
  profile: {
    select: {
      username: true,
      bio: true,
      location: true,
      website: true,
      isVerified: true,
    },
  },
} as const;

/**
 * "Aziz" + "Karimov" → "Aziz Karimov". Ism kiritilmagan bo'lsa `null`.
 *
 * Tur ATAYLAB tor emas: bir xil ish profil sahifasida ham, qidiruvda
 * ham kerak, ularning tanlangan maydonlari esa har xil.
 */
function buildFullName(row: { firstName: string | null; lastName: string | null }): string | null {
  const parts = [row.firstName, row.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * `username` bo'yicha ommaviy profil.
 *
 * @param viewerId So'rov yuborgan odam — "bu meningmi?" va "obunamanmi?"
 *   savollariga javob berish uchun.
 */
export async function getPublicProfile(username: string, viewerId: string): Promise<PublicProfile> {
  const row = await prisma.user.findFirst({
    where: {
      profile: { username },
      // O'chirilgan va bloklangan hisoblar ko'rinmaydi.
      deletedAt: null,
      status: { not: 'SUSPENDED' },
    },
    select: PROFILE_SELECT,
  });

  if (!row?.profile) {
    throw new NotFoundError('Profil');
  }

  const isOwn = row.id === viewerId;

  /**
   * Uchta so'rov BIR VAQTDA yuboriladi.
   *
   * Ketma-ket yuborilsa, sahifa uch marta kutardi. Ular bir-biriga
   * bog'liq emas, shuning uchun birga ketaveradi.
   */
  const [followerCount, followingCount, follow] = await Promise.all([
    prisma.follow.count({ where: { followingId: row.id } }),
    prisma.follow.count({ where: { followerId: row.id } }),
    isOwn
      ? Promise.resolve(null)
      : prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: row.id } },
          select: { id: true },
        }),
  ]);

  return {
    id: row.id,
    username: row.profile.username,
    fullName: buildFullName(row),
    avatarUrl: row.avatarUrl,
    bio: row.profile.bio,
    location: row.profile.location,
    website: row.profile.website,
    isVerified: row.profile.isVerified,
    joinedAt: row.createdAt.toISOString(),
    followerCount,
    followingCount,
    isOwn,
    isFollowing: follow !== null,
  };
}

const SEARCH_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { username: true, isVerified: true } },
} as const;

type SearchRow = Prisma.UserGetPayload<{ select: typeof SEARCH_SELECT }>;

/** Qatorning so'rovga mosligi — saralash uchun. */
function relevanceRank(row: SearchRow, query: string): number {
  return userMatchRank(row.profile?.username ?? '', buildFullName(row), query);
}

/**
 * Odamlarni ism yoki `@nom` bo'yicha qidiradi.
 *
 * ── Nima uchun TELEFON bo'yicha qidirilmaydi ──────────────────────────
 * Telefon bo'yicha qidiruv qulay ko'rinadi, lekin u bilan begona odam
 * raqamlarni birma-bir sinab, kim ro'yxatdan o'tganini aniqlab olardi.
 * Bu esa foydalanuvchilar ro'yxatini oshkor qilish bilan barobar.
 *
 * Shuning uchun qidiruv FAQAT odam o'zi tanlagan ochiq ma'lumot —
 * nom va ism — bo'yicha ishlaydi.
 */
export async function searchUsers(viewerId: string, rawQuery: string, limit: number): Promise<UserSearchResult[]> {
  // "@aziz" ham, "aziz" ham bir xil ishlashi kerak.
  const query = normalizeUserQuery(rawQuery);

  if (!query) return [];

  /**
   * Chegaradan KO'PROQ olinadi.
   *
   * Tartib bazada emas, shu yerda hisoblanadi. Agar aynan `limit` ta
   * olinsa, eng mos keladigan odam chegaradan tashqarida qolib
   * ketishi mumkin edi.
   */
  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: { not: 'SUSPENDED' },
      // O'zini qidirishning ma'nosi yo'q: o'ziga xabar yozib bo'lmaydi.
      id: { not: viewerId },
      profile: { isNot: null },
      OR: [
        { profile: { username: { contains: query, mode: 'insensitive' } } },
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: SEARCH_SELECT,
    take: limit * 3,
  });

  const ranked = rows
    .sort((a, b) => {
      const diff = relevanceRank(a, query) - relevanceRank(b, query);

      if (diff !== 0) return diff;

      // Bir xil darajada bo'lsa — alifbo tartibida, ya'ni natija barqaror.
      return (a.profile?.username ?? '').localeCompare(b.profile?.username ?? '');
    })
    .slice(0, limit);

  if (ranked.length === 0) return [];

  /**
   * "Obunamanmi" BITTA so'rovda aniqlanadi.
   *
   * Har bir odam uchun alohida so'rov yuborilsa, 20 ta natija 20 ta
   * so'rov degani bo'lardi.
   */
  const follows = await prisma.follow.findMany({
    where: { followerId: viewerId, followingId: { in: ranked.map((row) => row.id) } },
    select: { followingId: true },
  });

  const followingIds = new Set(follows.map((follow) => follow.followingId));

  return ranked.map((row) => ({
    id: row.id,
    username: row.profile?.username ?? '',
    fullName: buildFullName(row),
    avatarUrl: row.avatarUrl,
    isVerified: row.profile?.isVerified ?? false,
    isFollowing: followingIds.has(row.id),
  }));
}

/** Foydalanuvchini `username` bo'yicha topadi (faqat ID kerak bo'lganda). */
async function findUserIdByUsername(username: string): Promise<string> {
  const row = await prisma.user.findFirst({
    where: { profile: { username }, deletedAt: null, status: { not: 'SUSPENDED' } },
    select: { id: true },
  });

  if (!row) {
    throw new NotFoundError('Profil');
  }

  return row.id;
}

export async function followUser(followerId: string, username: string): Promise<FollowResponse> {
  const targetId = await findUserIdByUsername(username);

  if (targetId === followerId) {
    throw new ConflictError("O'zingizga obuna bo'lib bo'lmaydi.");
  }

  try {
    await prisma.follow.create({ data: { followerId, followingId: targetId } });

    /**
     * Bildirishnoma FAQAT yangi obunada yuboriladi.
     *
     * Takroriy so'rov (tugma ikki marta bosilgan) quyida ushlanadi va
     * u yerda bildirishnoma yo'q — aks holda odam bir xil xabarni
     * bir necha marta olardi.
     */
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { firstName: true, lastName: true, profile: { select: { username: true } } },
    });

    await notifyUser(targetId, 'social.new_follower', {
      followerId,
      followerName:
        [follower?.firstName, follower?.lastName].filter(Boolean).join(' ') ||
        (follower?.profile?.username ?? 'Foydalanuvchi'),
      followerUsername: follower?.profile?.username ?? '',
    });

    logger.info({ followerId, targetId }, 'Yangi obuna');
  } catch (error) {
    /**
     * Allaqachon obuna — bu XATO emas.
     *
     * Tugma ikki marta bosilgan yoki ikkita qurilmadan bosilgan
     * bo'lishi mumkin. Natija baribir kerakli holat: obuna bor.
     */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }

  return { isFollowing: true, followerCount: await prisma.follow.count({ where: { followingId: targetId } }) };
}

export async function unfollowUser(followerId: string, username: string): Promise<FollowResponse> {
  const targetId = await findUserIdByUsername(username);

  /**
   * `deleteMany` — `delete` emas.
   *
   * Obuna bo'lmagan holatda `delete` xato tashlardi. Bu yerda esa
   * natija muhim: obuna yo'q. Nechta qator o'chgani ahamiyatsiz.
   */
  await prisma.follow.deleteMany({ where: { followerId, followingId: targetId } });

  return {
    isFollowing: false,
    followerCount: await prisma.follow.count({ where: { followingId: targetId } }),
  };
}
