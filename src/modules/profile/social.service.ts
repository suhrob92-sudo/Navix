import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import type { FollowResponse, PublicProfile } from '@/modules/profile/social.types';

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

type ProfileRow = Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>;

function buildFullName(row: ProfileRow): string | null {
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
