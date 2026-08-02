import type { NextRequest } from 'next/server';

import { ForbiddenError, UnauthorizedError } from '@/lib/api/errors';
import { hasAnyPermission, hasPermission, type PermissionValue, type RoleValue } from '@/config/rbac';
import { verifyAccessToken, type AccessTokenPayload } from '@/modules/auth/token.service';

/**
 * API endpointlarini himoyalash.
 *
 * Oddiy tilda: "bu so'rovni yuborgan odam kim va u bu amalni qila oladimi?"
 * degan savolga javob beradi.
 *
 * Ishlatish namunasi:
 *
 * ```ts
 * export const GET = withApiHandler(async (request, { requestId }) => {
 *   const auth = await requireAuth(request);
 *   return apiSuccess({ userId: auth.userId }, { requestId });
 * });
 * ```
 */

/** Tizimga kirgan foydalanuvchi haqidagi ma'lumot. */
export type AuthContext = AccessTokenPayload;

/**
 * `Authorization: Bearer <token>` sarlavhasidan token'ni ajratib oladi.
 * Token bo'lmasa `null` qaytaradi.
 */
export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token.trim() || null;
}

/**
 * Token'ni tekshiradi va foydalanuvchi ma'lumotini qaytaradi.
 * Token bo'lmasa yoki yaroqsiz bo'lsa — 401 xatolik.
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
  const token = extractBearerToken(request);

  if (!token) {
    throw new UnauthorizedError('Avtorizatsiya talab qilinadi. Tizimga kiring.');
  }

  return verifyAccessToken(token);
}

/**
 * Token bor bo'lsa foydalanuvchini qaytaradi, bo'lmasa `null`.
 * Mehmon ham, kirgan foydalanuvchi ham ko'ra oladigan sahifalar uchun.
 */
export async function optionalAuth(request: NextRequest): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Foydalanuvchi kirgan VA aynan shu ruxsatga ega bo'lishini talab qiladi.
 * Ruxsat yo'q bo'lsa — 403 xatolik.
 */
export async function requirePermission(request: NextRequest, permission: PermissionValue): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (!hasPermission(auth.roles, permission)) {
    throw new ForbiddenError("Bu amalni bajarishga ruxsatingiz yo'q");
  }

  return auth;
}

/** Sanab o'tilgan ruxsatlardan kamida bittasi bo'lishini talab qiladi. */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: readonly PermissionValue[],
): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (!hasAnyPermission(auth.roles, permissions)) {
    throw new ForbiddenError("Bu amalni bajarishga ruxsatingiz yo'q");
  }

  return auth;
}

/** Aniq rolni talab qiladi (masalan faqat haydovchilar uchun endpoint). */
export async function requireRole(request: NextRequest, role: RoleValue): Promise<AuthContext> {
  const auth = await requireAuth(request);

  if (!auth.roles.includes(role)) {
    throw new ForbiddenError("Bu bo'lim sizning rolingiz uchun mo'ljallanmagan");
  }

  return auth;
}
