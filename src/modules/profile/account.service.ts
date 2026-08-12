import { randomUUID } from 'node:crypto';

import { Prisma, type FoodOrderStatus, type MarketOrderStatus } from '@/generated/prisma/client';
import { ConflictError, NotFoundError, UnauthorizedError } from '@/lib/api/errors';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { verifyPassword } from '@/modules/auth/password.service';
import { revokeAllSessions } from '@/modules/auth/session.service';
import { prisma } from '@/lib/prisma';
import { deleteImageByUrl } from '@/modules/upload/upload.service';

/**
 * Hisobni yopish.
 *
 * ── Nima uchun QATOR o'chirilmaydi ────────────────────────────────────
 * Foydalanuvchi yozuvi o'chirilsa, unga bog'langan hamma narsa ketma-ket
 * o'chib ketardi: to'lovlar, buyurtmalar, hamyon amallari. Ular esa
 * BUXGALTERIYA hujjati — soliq va nizolar uchun saqlanishi shart.
 * Bundan tashqari suhbatdoshning yozishmasi ham teshik bo'lib qolardi.
 *
 * Shuning uchun boshqa yo'l tanlandi: shaxsiy ma'lumotlar O'CHIRILADI
 * (ism, telefon, rasm, biografiya), yozuvning o'zi esa ANONIM holda
 * qoladi. Bu — "shaxsga doir ma'lumotlarni o'chirish" talabini ham
 * bajaradi, moliyaviy tarixni ham buzmaydi.
 *
 * ── Nima uchun parol so'raladi ────────────────────────────────────────
 * Telefon qo'lidan ketgan yoki ochiq qolgan odamning hisobini begona
 * bir bosishda yo'q qila olmasligi kerak. Bu — qaytarib bo'lmaydigan
 * amal, ya'ni eng qattiq tekshiruvga loyiq.
 */

/** Yopilgan hisobda ism o'rniga shu turadi. */
export const DELETED_USER_NAME = "O'chirilgan foydalanuvchi";

/** Yopishga to'sqinlik qiladigan ovqat buyurtmasi holatlari. */
const ACTIVE_FOOD_STATUSES: FoodOrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING'];

/** Yopishga to'sqinlik qiladigan Marketplace buyurtmasi holatlari. */
const ACTIVE_MARKET_STATUSES: MarketOrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKING', 'SHIPPED'];

export interface DeleteAccountContext {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Hisobni yopib bo'ladimi — sabablari bilan.
 *
 * ── Nima uchun ALOHIDA funksiya ───────────────────────────────────────
 * Ekranda tugmani bosishdan OLDIN "nima uchun bo'lmaydi" deb aytish
 * kerak. Aks holda odam parolini kiritib, tasdiqlab, keyin xato
 * ko'rardi — va sababini tushunmasdi.
 */
export interface AccountDeletionBlocker {
  code: 'WALLET_BALANCE' | 'ACTIVE_ORDERS';
  message: string;
}

export async function checkAccountDeletion(userId: string): Promise<AccountDeletionBlocker[]> {
  const [wallet, activeFood, activeMarket, activeBookings, activeParcels] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId }, select: { balance: true, reserved: true } }),
    prisma.foodOrder.count({ where: { userId, status: { in: ACTIVE_FOOD_STATUSES } } }),
    prisma.marketOrder.count({ where: { userId, status: { in: ACTIVE_MARKET_STATUSES } } }),
    // Mehmonxonada faqat `CONFIRMED` faol: `COMPLETED` va `CANCELLED` tugagan.
    prisma.hotelBooking.count({ where: { userId, status: 'CONFIRMED' } }),
    /**
     * Posilkada o'z holati YO'Q — u yetkazish yozuvida turadi.
     *
     * Shuning uchun "faol" degani: bekor qilinmagan va yetkazish
     * hali yakunlanmagan (yoki kuryer umuman olmagan).
     */
    prisma.parcel.count({
      where: {
        senderId: userId,
        cancelledAt: null,
        OR: [{ delivery: null }, { delivery: { status: { notIn: ['DELIVERED', 'CANCELLED'] } } }],
      },
    }),
  ]);

  const blockers: AccountDeletionBlocker[] = [];

  /**
   * Hamyonda pul qolgan bo'lsa yopilmaydi.
   *
   * Aks holda odam o'z pulini yo'qotardi va uni qaytarishning yo'li
   * qolmasdi: hisob yopilgach kirish ham mumkin emas.
   */
  const total = (wallet?.balance ?? 0n) + (wallet?.reserved ?? 0n);

  if (total > 0n) {
    blockers.push({
      code: 'WALLET_BALANCE',
      message: "Hamyonda pul bor. Avval uni yechib oling yoki boshqa hisobga o'tkazing.",
    });
  }

  const active = activeFood + activeMarket + activeBookings + activeParcels;

  if (active > 0) {
    blockers.push({
      code: 'ACTIVE_ORDERS',
      message: `Tugallanmagan buyurtma bor (${active} ta). Ular yakunlangach hisobni yopish mumkin.`,
    });
  }

  return blockers;
}

/**
 * Hisobni yopadi va shaxsiy ma'lumotlarni o'chiradi.
 *
 * @param password Joriy parol — shaxsni tasdiqlash uchun.
 */
export async function deleteAccount(
  userId: string,
  password: string,
  context: DeleteAccountContext = {},
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, avatarUrl: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('Foydalanuvchi');
  }

  /**
   * Parolsiz hisob (faqat SMS bilan kirgan) ham bo'lishi mumkin.
   *
   * Unda parol tekshiruvi o'tkazib yuborilsa, sessiyani egallagan
   * begona odam hisobni yo'q qila olardi. Shuning uchun avval parol
   * o'rnatish talab qilinadi.
   */
  if (!user.passwordHash) {
    throw new ConflictError("Avval parol o'rnating — hisobni yopish uchun u talab qilinadi.");
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new UnauthorizedError("Parol noto'g'ri");
  }

  const blockers = await checkAccountDeletion(userId);

  if (blockers.length > 0) {
    throw new ConflictError(blockers[0].message);
  }

  const now = new Date();

  /**
   * Telefon va nom ANONIM qiymatga almashtiriladi.
   *
   * ── Nima uchun telefon bo'shatiladi ─────────────────────────────────
   * Ustun yagona (`@unique`). Eski raqam qolib ketsa, o'sha odam
   * keyinchalik qaytib kelmoqchi bo'lganda ro'yxatdan o'ta olmasdi:
   * "bu raqam band" degan xato chiqardi va sababi tushunarsiz bo'lardi.
   *
   * Yangi qiymat ATAYLAB telefon ko'rinishida emas — u hech qachon
   * kirish urinishiga mos kelmasligi kerak.
   */
  const anonymousPhone = `deleted-${randomUUID().slice(0, 12)}`;
  const anonymousUsername = `deleted_${randomUUID().slice(0, 12)}`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        phone: anonymousPhone,
        phoneVerified: null,
        email: null,
        emailVerified: null,
        /**
         * Parol O'CHIRILADI.
         *
         * Yozuv bazada qolgani uchun, hash qolsa, uni tiklab kirish
         * yo'li ochiq qolardi. `deletedAt` ham tekshiriladi, lekin
         * ikkita to'siq bittasidan ishonchli.
         */
        passwordHash: null,
        firstName: DELETED_USER_NAME,
        lastName: null,
        avatarUrl: null,
        status: 'DEACTIVATED',
        deletedAt: now,
      },
    }),

    prisma.userProfile.updateMany({
      where: { userId },
      data: {
        username: anonymousUsername,
        bio: null,
        location: null,
        website: null,
        gender: null,
        dateOfBirth: null,
        isVerified: false,
        // Yopilgan hisobga hech kim yoza olmasin.
        messagePrivacy: 'NOBODY',
      },
    }),

    /**
     * Hamyon YOPILADI.
     *
     * Balansi nol ekani yuqorida tekshirilgan. Yopiq hamyonga pul
     * tushib qolmasligi kerak — masalan kimdir eski havola bo'yicha
     * o'tkazma qilsa.
     */
    prisma.wallet.updateMany({ where: { userId }, data: { status: 'CLOSED' } }),

    /**
     * E'lonlar va izohlar yashiriladi.
     *
     * Ular OCHIQ ma'lumot: hisob yopilgach lentada qolib ketsa,
     * "o'chirdim" degani yolg'on bo'lardi.
     */
    prisma.post.updateMany({ where: { authorId: userId, deletedAt: null }, data: { deletedAt: now } }),
    prisma.postComment.updateMany({ where: { authorId: userId, deletedAt: null }, data: { deletedAt: now } }),

    // Telefonga endi hech narsa yuborilmaydi.
    prisma.pushSubscription.deleteMany({ where: { userId } }),

    // Manzillar — shaxsiy ma'lumot, saqlashning hojati yo'q.
    prisma.address.deleteMany({ where: { userId } }),
  ]);

  /**
   * Barcha qurilmalar tizimdan CHIQARILADI.
   *
   * Tranzaksiyadan tashqarida: sessiyalar Redis'da ham bor va
   * bazadagi tranzaksiya ularni qamrab olmaydi.
   */
  await revokeAllSessions(userId);

  // Profil rasmi diskdan ham o'chiriladi (kutilmaydi).
  void deleteImageByUrl(user.avatarUrl);

  /**
   * Audit yozuvi QOLADI.
   *
   * Bu — shaxsiy ma'lumot emas, hodisa qaydi: "shu hisob shu kuni
   * yopildi". Nizo chiqqanda aynan shu yozuv javob beradi.
   */
  await recordAudit({
    actorId: userId,
    action: AuditAction.USER_ACCOUNT_DELETED,
    resourceType: 'User',
    resourceId: userId,
    module: 'profile',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });

  logger.info({ userId }, 'Hisob yopildi');
}

/**
 * Yopilgan hisob nomini ko'rsatish uchun.
 *
 * Ism bazada allaqachon almashtirilgan, lekin eski yozuvlarda
 * (masalan `deletedAt` qo'yilgan, ismi qolgan holatlarda) ham
 * to'g'ri chiqishi uchun bir joyda turadi.
 */
export function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  deletedAt?: Date | null;
}): string {
  if (user.deletedAt) return DELETED_USER_NAME;

  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Foydalanuvchi';
}

/** Prisma xatosi yagona indeks buzilganidanmi. */
export function isDuplicateError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
