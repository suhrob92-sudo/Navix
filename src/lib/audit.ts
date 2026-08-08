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
  /**
   * `user.token.refreshed` ATAYLAB olib tashlandi.
   *
   * Token har 14 daqiqada yangilanadi — bu yozuv jurnalni bosib ketardi
   * va haqiqiy hodisalar orasida yo'qolardi. Sessiya faolligi
   * `sessions.lastUsedAt` da saqlanadi.
   *
   * Eski yozuvlar bazada qoladi va jurnalda to'g'ri ko'rsatiladi:
   * `AUDIT_ACTION_LABELS` da uning nomi saqlangan.
   */
  USER_PASSWORD_RESET_REQUESTED: 'user.password.reset_requested',
  USER_PASSWORD_RESET_COMPLETED: 'user.password.reset_completed',
  SESSION_REVOKED: 'session.revoked',

  // Moliyaviy amallar — nizo chiqqanda aynan shular tekshiriladi.
  WALLET_TOP_UP: 'wallet.top_up',
  WALLET_TRANSFER: 'wallet.transfer',
  SERVICE_PAYMENT: 'payment.service',

  // Admin amallari.
  //
  // Bular MAJBURIY yoziladi: admin butun platformaga ta'sir qiladi,
  // shuning uchun "kim tarifni o'zgartirdi", "kim foydalanuvchini
  // blokladi" degan savolga har doim javob bo'lishi kerak.
  /** Pulni qaytarish — moliyaviy amal, shuning uchun alohida yozuv. */
  SERVICE_PAYMENT_REFUNDED: 'payment.service.refunded',

  // Ovqat yetkazish.
  FOOD_ORDER_CREATED: 'food.order.created',
  FOOD_ORDER_CANCELLED: 'food.order.cancelled',
  MARKET_ORDER_CREATED: 'market.order.created',
  MARKET_ORDER_CANCELLED: 'market.order.cancelled',

  // Restoran kabineti.
  MERCHANT_ORDER_STATUS_CHANGED: 'merchant.order.status_changed',
  MERCHANT_ORDER_REJECTED: 'merchant.order.rejected',

  // Sotuvchi kabineti (Marketplace).
  //
  // Zaxira o'zgarishi ham yoziladi: "omborda 10 ta bor edi, endi 0"
  // degan savol nizoda eng ko'p so'raladi va javobi faqat shu yerda.
  SELLER_ORDER_STATUS_CHANGED: 'seller.order.status_changed',
  SELLER_ORDER_REJECTED: 'seller.order.rejected',
  SELLER_PRODUCT_CREATED: 'seller.product.created',
  SELLER_PRODUCT_UPDATED: 'seller.product.updated',
  SELLER_SHOP_UPDATED: 'seller.shop.updated',

  // Kuryer.
  //
  // Yetkazish — moliyaviy amal: yakunlanganda kuryerga haq yoziladi.
  // "Kim topshirdi va qachon" degan savol nizoda birinchi so'raladi.
  COURIER_DELIVERY_ACCEPTED: 'courier.delivery.accepted',
  COURIER_DELIVERY_PICKED_UP: 'courier.delivery.picked_up',
  COURIER_DELIVERY_COMPLETED: 'courier.delivery.completed',
  COURIER_DELIVERY_RELEASED: 'courier.delivery.released',

  // Ish qidirish.
  //
  // Pul yo'q, lekin SHAXSIY MA'LUMOT bor: ariza bilan birga nomzodning
  // telefon raqami ish beruvchiga ochiladi. "Kim, qachon, qaysi e'longa
  // yubordi" degan yozuv shuning uchun saqlanadi.
  JOB_APPLICATION_SENT: 'job.application.sent',
  JOB_APPLICATION_WITHDRAWN: 'job.application.withdrawn',

  /**
   * Ish beruvchining amallari.
   *
   * `REVIEWED` alohida yoziladi: aynan shu daqiqada ish beruvchi
   * nomzodning telefon raqamini KO'RGAN bo'ladi. Shikoyat kelsa,
   * "kim, qachon, kimning ma'lumotini ochdi" degan savolga javob
   * shu yerdan topiladi.
   */
  JOB_VACANCY_CREATED: 'job.vacancy.created',
  JOB_VACANCY_UPDATED: 'job.vacancy.updated',
  JOB_APPLICATION_REVIEWED: 'job.application.reviewed',
  EMPLOYER_ASSIGNED: 'employer.assigned',
  EMPLOYER_UNASSIGNED: 'employer.unassigned',

  /**
   * Posilka — pul harakati bor, shuning uchun yozuv qoldiriladi.
   *
   * Bundan tashqari jo'natmada BEGONA odamning telefon raqami bor
   * (qabul qiluvchi). "Kim, qachon, kimning raqamini kiritdi" degan
   * savolga javob shu yerdan topiladi.
   */
  PARCEL_CREATED: 'parcel.created',
  PARCEL_CANCELLED: 'parcel.cancelled',

  ADMIN_PROVIDER_CREATED: 'admin.provider.created',
  ADMIN_PROVIDER_UPDATED: 'admin.provider.updated',
  ADMIN_USER_STATUS_CHANGED: 'admin.user.status_changed',
  ADMIN_ROLE_GRANTED: 'admin.role.granted',
  ADMIN_ROLE_REVOKED: 'admin.role.revoked',
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
