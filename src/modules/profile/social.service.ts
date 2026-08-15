import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { blockedUserIds, findBlock } from '@/modules/moderation/moderation.service';
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
   * To'rt so'rov BIR VAQTDA yuboriladi.
   *
   * Ketma-ket yuborilsa, sahifa to'rt marta kutardi. Ular bir-biriga
   * bog'liq emas, shuning uchun birga ketaveradi.
   */
  const [followerCount, followingCount, postCount, follow, block] = await Promise.all([
    prisma.follow.count({ where: { followingId: row.id } }),
    prisma.follow.count({ where: { followerId: row.id } }),
    /**
     * O'chirilgan postlar SANALMAYDI.
     *
     * Ular bazada tarix uchun qoladi, lekin profilda "128 post"
     * deb turib, ro'yxatda 120 tasi ko'rinsa — son yolg'on bo'lardi.
     */
    prisma.post.count({ where: { authorId: row.id, deletedAt: null } }),
    isOwn
      ? Promise.resolve(null)
      : prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: row.id } },
          select: { id: true },
        }),
    isOwn ? Promise.resolve(null) : findBlock(viewerId, row.id),
  ]);

  /**
   * Meni bloklagan odamning profili KO'RINMAYDI.
   *
   * ── Nima uchun "topilmadi", "bloklangansiz" emas ─────────────────────
   * "Bu odam sizni bloklagan" degan javob bloklashning ma'nosini
   * yo'qotardi: bezovta qiluvchi odam buni darhol bilib olardi va
   * boshqa hisob ochib davom etardi.
   *
   * "Topilmadi" esa hech narsani oshkor qilmaydi — o'chirilgan hisob
   * bilan bir xil ko'rinadi.
   */
  if (block?.blockedByThem) {
    throw new NotFoundError('Profil');
  }

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
    postCount,
    isOwn,
    isFollowing: follow !== null,
    isBlocked: block?.blockedByMe ?? false,
  };
}

/**
 * O'z profilim — ID bo'yicha.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * Tizimga kirgan odamning ma'lumotida `username` yo'q: u profil
 * jadvalida turadi va har so'rovda tokenga qo'shib yurish ortiqcha
 * bo'lardi (nom o'zgarsa, token eskirib qolardi).
 *
 * Brauzer tomonda avval nomni, keyin profilni so'rash ham mumkin edi,
 * lekin u ikkita ketma-ket so'rov — mobil internetda sahifa ikki
 * marta sakrab ochilardi.
 */
export async function getOwnProfile(userId: string): Promise<PublicProfile> {
  const row = await prisma.userProfile.findUnique({
    where: { userId },
    select: { username: true },
  });

  if (!row) {
    throw new NotFoundError('Profil');
  }

  return getPublicProfile(row.username, userId);
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
   * Bloklangan odamlar ro'yxatdan CHIQARIB TASHLANADI.
   *
   * Ikki tomonlama: men bloklaganim ham, meni bloklaganlar ham.
   * Ikkinchisi muhimroq — bezovta qiluvchi odam qidiruv orqali
   * qurbonini qayta topa olmasligi kerak.
   */
  const hiddenIds = await blockedUserIds(viewerId);

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
      id: { notIn: [viewerId, ...hiddenIds] },
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

  /**
   * Blok bo'lsa obuna ham bo'lmaydi.
   *
   * ── Nima uchun IKKALA holatda ham "topilmadi" ────────────────────────
   * Men bloklagan odamga obuna bo'lish mantiqsiz, u meni bloklagan
   * bo'lsa esa uning profili menga umuman ko'rinmaydi. Ikkalasida ham
   * javob bir xil bo'lishi kerak — aks holda javob farqi bloklanganlik
   * haqida xabar berardi.
   */
  const block = await findBlock(followerId, targetId);

  if (block.blockedByMe || block.blockedByThem) {
    throw new NotFoundError('Profil');
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
