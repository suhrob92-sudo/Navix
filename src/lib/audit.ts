import type { Prisma } from '@/generated/prisma/client';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * Audit jurnali — "kim, qachon, nima qildi" yozuvlari.
 *
 * Nima uchun kerak:
 *  - Nizo chiqqanda (masalan "men bu to'lovni qilmaganman") tekshirish uchun;
 *  - Xavfsizlik hodisalarini aniqlash uchun;
 *  - Qonun talablari (moliyaviy operatsiyalar tarixi saqlanishi shart).
 *
 * Muhim: audit yozuvi bajarilmasa ham asosiy amal to'xtamasligi kerak.
 * Shuning uchun barcha xatoliklar shu yerda tutiladi.
 */

/** Standart audit amallari — matn xatolariga yo'l qo'ymaslik uchun. */
export const AuditAction = {
  USER_REGISTERED: 'user.registered',
  USER_PHONE_VERIFIED: 'user.phone_verified',
  USER_LOGIN_SUCCESS: 'user.login.success',
  USER_LOGIN_FAILED: 'user.login.failed',
  USER_LOGOUT: 'user.logout',
  USER_TOKEN_REFRESHED: 'user.token.refreshed',
  USER_PASSWORD_RESET_REQUESTED: 'user.password.reset_requested',
  USER_PASSWORD_RESET_COMPLETED: 'user.password.reset_completed',
  SESSION_REVOKED: 'session.revoked',

  // Moliyaviy amallar — nizo chiqqanda aynan shular tekshiriladi.
  WALLET_TOP_UP: 'wallet.top_up',
  WALLET_TRANSFER: 'wallet.transfer',
  SERVICE_PAYMENT: 'payment.service',
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  /** Amalni bajargan foydalanuvchi. Tizim amallarida bo'sh qoldiriladi. */
  actorId?: string | null;
  action: AuditActionValue;
  /** Ta'sir ko'rsatilgan obyekt turi: "User", "Session", "Wallet". */
  resourceType: string;
  resourceId?: string | null;
  /** Qaysi modul: "auth", "wallet", "taxi". */
  module: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  /** Qo'shimcha tafsilotlar. Maxfiy ma'lumot yozilmaydi. */
  metadata?: Prisma.InputJsonValue;
}

/** Audit yozuvini bazaga qo'shadi. Xatolik bo'lsa faqat log'ga yoziladi. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        module: entry.module,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent?.slice(0, 400) ?? null,
        requestId: entry.requestId ?? null,
        metadata: entry.metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error, action: entry.action }, "Audit yozuvini saqlab bo'lmadi");
  }
}
