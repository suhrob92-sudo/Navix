import { Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/api/errors';
import { AuditAction, recordAudit } from '@/lib/audit';
import { buildDefaultUsername } from '@/config/profile';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { notifyUser } from '@/modules/notification/notification.service';
import { hashPassword, verifyPassword } from '@/modules/auth/password.service';
import { revokeAllSessions } from '@/modules/auth/session.service';
import type { ChangePasswordInput, UpdateProfileInput } from '@/modules/profile/profile.schemas';
import type { RoleValue } from '@/config/rbac';

/**
 * Profil bilan ishlash biznes logikasi.
 *
 * Ma'lumot ikkita jadvalda saqlanadi:
 *  - `users` — ism, familiya, rasm (tez-tez o'qiladi, yengil bo'lishi kerak);
 *  - `user_profiles` — til, mavzu, vaqt zonasi (kamroq kerak bo'ladi).
 *
 * Foydalanuvchi uchun bu bitta "profil" — ajratish faqat ichki optimizatsiya.
 */

export interface ProfilePayload {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  phoneVerified: Date | null;
  createdAt: Date;
  roles: RoleValue[];
  /**
   * Ijtimoiy nom: `aziz_karimov`.
   *
   * Bu yerda — chunki sozlamalar sahifasi o'z profilingizga havola
   * berishi kerak (`/u/<username>`), nomni esa faqat shu javob biladi.
   * `null` bo'lishi mumkin emas, lekin eski profil yozuvi bo'lmagan
   * chekka holat uchun himoya qoldirilgan.
   */
  username: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  gender: string | null;
  messagePrivacy: string;
  preferences: {
    dateOfBirth: Date | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
  };
  /**
   * Tanishtiruv tugatilganmi.
   *
   * Bu `preferences` ichida emas: sozlama emas, HOLAT. Foydalanuvchi
   * uni sozlamalar sahifasidan o'zgartirmaydi.
   */
  onboardedAt: Date | null;
}

const PROFILE_SELECT = {
  id: true,
  phone: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  phoneVerified: true,
  createdAt: true,
  roles: { select: { role: { select: { name: true } } } },
  profile: {
    select: {
      username: true,
      bio: true,
      location: true,
      website: true,
      gender: true,
      messagePrivacy: true,
      dateOfBirth: true,
      language: true,
      theme: true,
      timezone: true,
      marketingOptIn: true,
      onboardedAt: true,
    },
  },
} as const;

/** Bazadagi yozuvni API javobiga aylantiradi. */
function toProfilePayload(user: {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  phoneVerified: Date | null;
  createdAt: Date;
  roles: { role: { name: string } }[];
  profile: {
    username: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    gender: string | null;
    messagePrivacy: string;
    dateOfBirth: Date | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
    onboardedAt: Date | null;
  } | null;
}): ProfilePayload {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
    roles: user.roles.map((assignment) => assignment.role.name as RoleValue),
    username: user.profile?.username ?? null,
    bio: user.profile?.bio ?? null,
    location: user.profile?.location ?? null,
    website: user.profile?.website ?? null,
    gender: user.profile?.gender ?? null,
    messagePrivacy: user.profile?.messagePrivacy ?? 'EVERYONE',
    preferences: {
      dateOfBirth: user.profile?.dateOfBirth ?? null,
      // Profil yozuvi bo'lmasa standart qiymatlarni qaytaramiz —
      // foydalanuvchi hech qachon bo'sh ekran ko'rmasligi kerak.
      language: user.profile?.language ?? 'UZ',
      theme: user.profile?.theme ?? 'SYSTEM',
      timezone: user.profile?.timezone ?? 'Asia/Tashkent',
      marketingOptIn: user.profile?.marketingOptIn ?? false,
    },
    onboardedAt: user.profile?.onboardedAt ?? null,
  };
}

/**
 * Tanishtiruvni tugatilgan deb belgilaydi.
 *
 * `upsert` ishlatiladi: profil yozuvi hali bo'lmasligi mumkin
 * (u faqat sozlama o'zgartirilganda yaratiladi).
 *
 * Takroriy chaqiruv xavfsiz — birinchi sana saqlanib qoladi va
 * "qachon ko'rgan" degan ma'lumot buzilmaydi.
 */
export async function completeOnboarding(userId: string): Promise<ProfilePayload> {
  const existing = await prisma.userProfile.findUnique({
    where: { userId },
    select: { onboardedAt: true },
  });

  if (!existing?.onboardedAt) {
    await prisma.userProfile.upsert({
      where: { userId },
      update: { onboardedAt: new Date() },
      /**
       * `create` shoxi deyarli hech qachon ishlamaydi: profil
       * ro'yxatdan o'tishda yaratiladi. Lekin u yerda ham `username`
       * shart, shuning uchun bu yerda ham beriladi.
       */
      create: { userId, username: buildDefaultUsername(null), onboardedAt: new Date() },
    });

    logger.info({ userId }, 'Tanishtiruv tugatildi');
  }

  return getProfile(userId);
}

/** Profil ma'lumotlarini qaytaradi. */
export async function getProfile(userId: string): Promise<ProfilePayload> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: PROFILE_SELECT,
  });

  if (!user) {
    throw new NotFoundError('Profil');
  }

  return toProfilePayload(user);
}

/**
 * Profilni yangilaydi.
 *
 * Faqat yuborilgan maydonlar o'zgaradi (PATCH semantikasi) — yuborilmagan
 * maydonlar tegilmaydi. `undefined` = "tegma", `null` = "tozala".
 */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<ProfilePayload> {
  const exists = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } });

  if (!exists) {
    throw new NotFoundError('Profil');
  }

  // `users` jadvaliga tegishli maydonlar.
  const userData = {
    ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
    ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  };

  // `user_profiles` jadvaliga tegishli maydonlar.
  const profileData = {
    ...(input.dateOfBirth !== undefined
      ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
      : {}),
    ...(input.language !== undefined ? { language: input.language } : {}),
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    ...(input.marketingOptIn !== undefined ? { marketingOptIn: input.marketingOptIn } : {}),
    ...(input.username !== undefined ? { username: input.username } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.gender !== undefined ? { gender: input.gender } : {}),
    ...(input.messagePrivacy !== undefined ? { messagePrivacy: input.messagePrivacy } : {}),
  };

  const updated = await prisma
    .$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      if (Object.keys(profileData).length > 0) {
        // `upsert` — profil yozuvi hali yaratilmagan bo'lsa ham ishlaydi.
        await tx.userProfile.upsert({
          where: { userId },
          update: profileData,
          create: { userId, username: buildDefaultUsername(null), ...profileData },
        });
      }

      return tx.user.findUniqueOrThrow({ where: { id: userId }, select: PROFILE_SELECT });
    })
    .catch((error: unknown) => {
      /**
       * Nom band.
       *
       * Oldindan tekshirish ham bor (`isUsernameAvailable`), lekin u
       * kafolat bermaydi: tekshiruv bilan saqlash orasida boshqa odam
       * shu nomni olib qo'yishi mumkin. Yagona ishonchli to'siq —
       * bazadagi shart, shuning uchun uning xatosi shu yerda odam
       * tiliga o'giriladi.
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError('Bu foydalanuvchi nomi band. Boshqasini tanlang.');
      }

      throw error;
    });

  return toProfilePayload(updated);
}

/**
 * Nom bo'shmi.
 *
 * Formada yozayotgan paytda chaqiriladi — odam saqlashni bosgandan
 * keyin emas, DARHOL javob olishi kerak.
 */
export async function isUsernameAvailable(username: string, userId: string): Promise<boolean> {
  const row = await prisma.userProfile.findUnique({
    where: { username },
    select: { userId: true },
  });

  // O'z nomini "band" deb ko'rsatish noto'g'ri bo'lardi.
  return row === null || row.userId === userId;
}

export interface ChangePasswordResult {
  /** Nechta boshqa qurilma tizimdan chiqarildi. */
  revokedSessions: number;
}

/**
 * Parolni o'zgartiradi.
 *
 * Xavfsizlik uchun joriy parol so'raladi — agar begona odam ochiq qolgan
 * qurilmadan foydalanayotgan bo'lsa, u parolni o'zgartira olmaydi.
 *
 * Parol o'zgargach joriy qurilmadan tashqari barcha sessiyalar yopiladi.
 */
export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  context: { currentSessionId: string; ipAddress?: string | null; userAgent?: string | null; requestId?: string },
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, passwordHash: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Hisob faol emas');
  }

  const isCurrentPasswordValid = await verifyPassword(input.currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    throw new ValidationError("Joriy parol noto'g'ri", {
      currentPassword: ["Joriy parol noto'g'ri"],
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  // Joriy qurilma ochiq qoladi — foydalanuvchi qaytadan kirishga majbur bo'lmasin.
  const revokedSessions = await revokeAllSessions(userId, context.currentSessionId);

  await recordAudit({
    actorId: userId,
    action: AuditAction.USER_PASSWORD_RESET_COMPLETED,
    resourceType: 'User',
    resourceId: userId,
    module: 'profile',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
    metadata: { method: 'self-service', revokedSessions },
  });

  // Xavfsizlik xabari: parolni boshqa kimdir o'zgartirgan bo'lsa,
  // foydalanuvchi buni darhol ko'radi.
  await notifyUser(userId, 'security.password_changed', { revokedSessions });

  return { revokedSessions };
}
