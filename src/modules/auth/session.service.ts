import { UnauthorizedError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { hashToken, signAccessToken, signRefreshToken } from '@/modules/auth/token.service';
import type { RoleValue } from '@/config/rbac';

/**
 * Sessiyalar (qurilmalar) bilan ishlash.
 *
 * Har bir kirish alohida sessiya yaratadi. Shuning uchun foydalanuvchi
 * "telefonimni yo'qotdim" desa — faqat o'sha qurilma sessiyasini bekor qilish
 * mumkin, qolgan qurilmalar ishlashda davom etadi.
 *
 * Refresh token'ning faqat SHA-256 hash'i bazada saqlanadi.
 */

export interface DeviceInfo {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access token necha soniyadan keyin eskiradi. */
  expiresInSeconds: number;
}

/**
 * `User-Agent` satridan odam o'qiy oladigan qurilma nomini yasaydi.
 * Masalan: "Chrome / Windows", "Safari / iPhone".
 */
export function detectDeviceLabel(userAgent?: string | null): string {
  if (!userAgent) return "Noma'lum qurilma";

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\/|Opera/.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Brauzer';

  const platform = /iPhone/.test(userAgent)
    ? 'iPhone'
    : /iPad/.test(userAgent)
      ? 'iPad'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : "Noma'lum";

  return `${browser} / ${platform}`;
}

/** Yangi sessiya ochadi va token juftligini qaytaradi. */
export async function createSession(
  user: { id: string; phone: string; roles: RoleValue[] },
  device: DeviceInfo,
): Promise<TokenPair> {
  const env = serverEnv();
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL * 1000);

  // Avval sessiya yozuvini yaratamiz — token ichida uning ID'si kerak bo'ladi.
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      // Vaqtinchalik qiymat: haqiqiy hash token yaratilgach yoziladi.
      refreshTokenHash: `pending:${crypto.randomUUID()}`,
      userAgent: device.userAgent?.slice(0, 400) ?? null,
      ipAddress: device.ipAddress ?? null,
      deviceLabel: detectDeviceLabel(device.userAgent),
      expiresAt,
    },
    select: { id: true },
  });

  const refreshToken = await signRefreshToken({ userId: user.id, sessionId: session.id });

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashToken(refreshToken) },
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    phone: user.phone,
    roles: user.roles,
    sessionId: session.id,
  });

  return { accessToken, refreshToken, expiresInSeconds: env.JWT_ACCESS_TTL };
}

/**
 * Refresh token'ni yangisiga almashtiradi (token rotation).
 *
 * Nima uchun almashtiriladi: agar o'g'irlangan token ishlatilsa, haqiqiy
 * foydalanuvchi keyingi safar yangilamoqchi bo'lganda eski token yaroqsiz
 * bo'ladi va o'g'irlik aniqlanadi.
 */
export async function rotateSession(
  sessionId: string,
  presentedRefreshToken: string,
  device: DeviceInfo,
): Promise<TokenPair> {
  const env = serverEnv();

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          status: true,
          deletedAt: true,
          roles: { select: { role: { select: { name: true } } } },
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new UnauthorizedError('Sessiya tugagan. Qaytadan kiring.');
  }

  // Taqdim etilgan token bazadagi hash bilan mos kelishi shart.
  if (session.refreshTokenHash !== hashToken(presentedRefreshToken)) {
    // Mos kelmadi — token o'g'irlangan bo'lishi mumkin. Sessiyani yopamiz.
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    logger.warn({ sessionId, userId: session.userId }, 'Eskirgan refresh token ishlatildi, sessiya yopildi');
    throw new UnauthorizedError('Sessiya bekor qilindi. Qaytadan kiring.');
  }

  if (session.user.deletedAt || session.user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Hisob faol emas');
  }

  const roles = session.user.roles.map((assignment) => assignment.role.name as RoleValue);
  const refreshToken = await signRefreshToken({ userId: session.user.id, sessionId });

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: hashToken(refreshToken),
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
      userAgent: device.userAgent?.slice(0, 400) ?? session.userAgent,
      ipAddress: device.ipAddress ?? session.ipAddress,
    },
  });

  const accessToken = await signAccessToken({
    userId: session.user.id,
    phone: session.user.phone,
    roles,
    sessionId,
  });

  return { accessToken, refreshToken, expiresInSeconds: env.JWT_ACCESS_TTL };
}

/** Bitta sessiyani bekor qiladi (chiqish). */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Foydalanuvchining barcha sessiyalarini bekor qiladi.
 * Parol o'zgartirilganda majburiy — eski qurilmalar chiqarib yuboriladi.
 */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });

  return result.count;
}

/** Foydalanuvchining faol sessiyalari ro'yxati (xavfsizlik sahifasi uchun). */
export async function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      deviceLabel: true,
      ipAddress: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { lastUsedAt: 'desc' },
  });
}
