import { NotFoundError, UnauthorizedError, ValidationError } from '@/lib/api/errors';
import { AuditAction, recordAudit } from '@/lib/audit';
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
  preferences: {
    dateOfBirth: Date | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
  };
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
      dateOfBirth: true,
      language: true,
      theme: true,
      timezone: true,
      marketingOptIn: true,
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
    dateOfBirth: Date | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
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
    preferences: {
      dateOfBirth: user.profile?.dateOfBirth ?? null,
      // Profil yozuvi bo'lmasa standart qiymatlarni qaytaramiz —
      // foydalanuvchi hech qachon bo'sh ekran ko'rmasligi kerak.
      language: user.profile?.language ?? 'UZ',
      theme: user.profile?.theme ?? 'SYSTEM',
      timezone: user.profile?.timezone ?? 'Asia/Tashkent',
      marketingOptIn: user.profile?.marketingOptIn ?? false,
    },
  };
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
  };

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0) {
      await tx.user.update({ where: { id: userId }, data: userData });
    }

    if (Object.keys(profileData).length > 0) {
      // `upsert` — profil yozuvi hali yaratilmagan bo'lsa ham ishlaydi.
      await tx.userProfile.upsert({
        where: { userId },
        update: profileData,
        create: { userId, ...profileData },
      });
    }

    return tx.user.findUniqueOrThrow({ where: { id: userId }, select: PROFILE_SELECT });
  });

  return toProfilePayload(updated);
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
