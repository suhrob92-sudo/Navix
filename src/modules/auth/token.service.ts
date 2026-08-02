import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { UnauthorizedError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import type { RoleValue } from '@/config/rbac';

/**
 * JWT token'lar bilan ishlash.
 *
 * Ikki xil token ishlatiladi:
 *  - ACCESS token  — qisqa umrli (15 daqiqa), har so'rovda yuboriladi;
 *  - REFRESH token — uzoq umrli (30 kun), faqat yangi access token olish uchun.
 *
 * Nima uchun ikkita: agar access token o'g'irlansa, u 15 daqiqadan keyin
 * yaroqsiz bo'ladi. Refresh token esa faqat httpOnly cookie'da saqlanadi va
 * JavaScript uni o'qiy olmaydi.
 */

export const TokenType = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;

export type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

/** Access token ichidagi ma'lumotlar. */
export interface AccessTokenPayload {
  /** Foydalanuvchi ID'si. */
  userId: string;
  phone: string;
  roles: RoleValue[];
  /** Qaysi sessiyaga (qurilmaga) tegishli. */
  sessionId: string;
}

/** Refresh token ichidagi ma'lumotlar. */
export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

const ISSUER = 'navix';
const AUDIENCE = 'navix-app';

function toKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

/** Access token yaratadi. */
export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const env = serverEnv();

  return new SignJWT({ ...payload, type: TokenType.ACCESS })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_ACCESS_TTL}s`)
    .sign(toKey(env.JWT_ACCESS_SECRET));
}

/** Refresh token yaratadi. */
export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  const env = serverEnv();

  return new SignJWT({ ...payload, type: TokenType.REFRESH })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${env.JWT_REFRESH_TTL}s`)
    .sign(toKey(env.JWT_REFRESH_SECRET));
}

async function verify(token: string, secret: string, expectedType: TokenTypeValue): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, toKey(secret), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });

    if (payload.type !== expectedType) {
      throw new UnauthorizedError('Token turi mos kelmadi');
    }

    return payload;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Token yaroqsiz yoki muddati tugagan');
  }
}

/** Access token'ni tekshiradi va ichidagi ma'lumotni qaytaradi. */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const payload = await verify(token, serverEnv().JWT_ACCESS_SECRET, TokenType.ACCESS);

  return {
    userId: String(payload.userId),
    phone: String(payload.phone),
    roles: (payload.roles ?? []) as RoleValue[],
    sessionId: String(payload.sessionId),
  };
}

/** Refresh token'ni tekshiradi va ichidagi ma'lumotni qaytaradi. */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const payload = await verify(token, serverEnv().JWT_REFRESH_SECRET, TokenType.REFRESH);

  return {
    userId: String(payload.userId),
    sessionId: String(payload.sessionId),
  };
}

/**
 * Refresh token'ning hash'ini hisoblaydi.
 *
 * Bazada token'ning o'zi emas, faqat hash'i saqlanadi — baza sizib chiqsa ham
 * token'lardan foydalanib bo'lmaydi. Bu yerda SHA-256 yetarli, chunki token
 * allaqachon tasodifiy va uzun (parol kabi taxmin qilinmaydi).
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Kriptografik jihatdan xavfsiz tasodifiy satr (parolni tiklash havolasi uchun). */
export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url');
}
