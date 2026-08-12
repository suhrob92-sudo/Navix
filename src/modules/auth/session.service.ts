import { UnauthorizedError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { blockSessions } from '@/lib/session-block';
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
 * Yangilash natijasi.
 *
 * `refreshToken` `null` bo'lishi mumkin — bu "cookie'ga tegilmasin"
 * degani. Sababi `rotateSession` ichida batafsil yozilgan.
 */
export interface RotationResult extends Omit<TokenPair, 'refreshToken'> {
  refreshToken: string | null;
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
 * Bir oldingi token shuncha soniya davomida qabul qilinadi.
 *
 * Qiymat ATAYLAB kichik: u faqat "bir vaqtda yuborilgan so'rovlar"ni
 * qamrab olishi kerak, ular esa bir necha millisekund ichida keladi.
 * Sekin mobil internet uchun 30 soniya keng zaxira.
 */
const REFRESH_GRACE_SECONDS = 30;

/** Taqdim etilgan tokenning holati. */
export type RefreshTokenVerdict = 'current' | 'grace' | 'unknown';

export interface RefreshTokenState {
  /** Bazadagi joriy token hash'i. */
  currentHash: string;
  /** Bir oldingi token hash'i (bo'lmasligi mumkin). */
  previousHash: string | null;
  /** Token oxirgi marta qachon almashtirilgan. */
  rotatedAt: Date | null;
}

/**
 * Taqdim etilgan token qanday qabul qilinishini hal qiladi.
 *
 * ── Nima uchun bu qaror ALOHIDA funksiya ──────────────────────────────
 * Bu — modulning eng nozik joyi: bu yerdagi xato yo yaxshi odamni
 * tizimdan chiqarib yuboradi, yo o'g'rini ichkariga qo'yib yuboradi.
 * Alohida, bazasiz funksiya bo'lgani uchun uni har tomondan test
 * qilish mumkin.
 *
 * ── Uchta javob ──────────────────────────────────────────────────────
 *   `current` — hammasi joyida, oddiy almashtirish;
 *   `grace`   — bir oldingi token, lekin ATIGI bir necha soniya oldin
 *               almashtirilgan: bu bir vaqtda yuborilgan ikkinchi
 *               so'rov, o'g'irlik emas;
 *   `unknown` — token umuman notanish yoki juda eski: sessiya yopiladi.
 *
 * ── Nima uchun `grace` kerak (HAQIQIY XATO) ──────────────────────────
 * Refresh token cookie'da saqlanadi va u BARCHA varaqlar uchun bitta.
 * Ikkita varaq bir vaqtda yangilashni boshlasa, ikkalasi ham AYNI
 * tokenni yuboradi:
 *
 *   1-so'rov  →  yangi token oldi        (eskisi yaroqsiz bo'ldi)
 *   2-so'rov  →  ESKI token bilan keldi  →  "o'g'irlik!" → sessiya yopildi
 *
 * Foydalanuvchi hech narsa qilmasdan tizimdan chiqib qolardi.
 *
 * ── O'g'irlikdan himoya YO'QOLMAYDI ──────────────────────────────────
 * O'g'irlangan token faqat almashtirilgandan keyingi 30 soniya ichida
 * ishlaydi. Undan keyin — `unknown` va sessiya yopiladi. Ya'ni himoya
 * o'z kuchida, faqat "bir vaqtda kelgan so'rov" holati bundan
 * chiqarildi.
 */
export function classifyRefreshToken(
  presentedHash: string,
  state: RefreshTokenState,
  now: Date = new Date(),
): RefreshTokenVerdict {
  if (presentedHash === state.currentHash) return 'current';

  if (!state.previousHash || presentedHash !== state.previousHash) return 'unknown';

  // Bir oldingi token — lekin muhlat ichidami?
  if (!state.rotatedAt) return 'unknown';

  const elapsedMs = now.getTime() - state.rotatedAt.getTime();

  // Manfiy farq (soat orqaga surilgan) ham ishonchsiz — rad etamiz.
  if (elapsedMs < 0 || elapsedMs > REFRESH_GRACE_SECONDS * 1000) return 'unknown';

  return 'grace';
}

/**
 * Refresh token'ni yangisiga almashtiradi (token rotation).
 *
 * Nima uchun almashtiriladi: agar o'g'irlangan token ishlatilsa, haqiqiy
 * foydalanuvchi keyingi safar yangilamoqchi bo'lganda eski token yaroqsiz
 * bo'ladi va o'g'irlik aniqlanadi.
 */
/** Tranzaksiya ichidagi qaror — u yerda xato tashlab bo'lmaydi (sabab quyida). */
type Outcome = { kind: 'ok'; tokens: RotationResult } | { kind: 'theft'; userId: string };

export async function rotateSession(
  sessionId: string,
  presentedRefreshToken: string,
  device: DeviceInfo,
): Promise<RotationResult> {
  const env = serverEnv();
  const presentedHash = hashToken(presentedRefreshToken);

  /**
   * Butun amal QULF ostida bajariladi.
   *
   * ── Nima uchun qulf shart ────────────────────────────────────────────
   * Qulfsiz ikkita so'rov bir vaqtda BIR XIL holatni o'qib olardi va
   * ikkalasi ham "men birinchiman" deb token almashtirardi. Natijada
   * brauzerdagi cookie'ga bittasining tokeni tushib, bazada esa
   * boshqasiniki qolishi mumkin edi — keyingi yangilashda sessiya
   * yopilardi.
   *
   * Qulf bilan ikkinchi so'rov birinchisi tugaguncha kutadi va
   * ALLAQACHON almashtirilgan holatni ko'radi. Shundan keyin uning
   * uchun to'g'ri qaror — `grace` — o'z-o'zidan kelib chiqadi.
   *
   * Bu hamyondagi `lockWallet()` bilan bir xil naqsh.
   */
  const outcome = await prisma.$transaction(async (tx): Promise<Outcome> => {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${sessionId}::uuid FOR UPDATE`;

    const session = await tx.session.findUnique({
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

    const verdict = classifyRefreshToken(presentedHash, {
      currentHash: session.refreshTokenHash,
      previousHash: session.previousTokenHash,
      rotatedAt: session.rotatedAt,
    });

    /**
     * ── Sessiyani bu YERDA yopib bo'lmaydi ─────────────────────────────
     * Tranzaksiya ichida xato tashlansa, PostgreSQL uning ichida
     * qilingan HAMMA narsani orqaga qaytaradi — yopish ham bekor
     * bo'lardi va o'g'irlikdan himoya jimgina ishlamay qolardi.
     *
     * Bu xato haqiqiy baza ustidagi tekshiruvda ushlandi.
     *
     * Shuning uchun bu yerda faqat QAROR qaytariladi, yopish esa
     * tranzaksiyadan tashqarida bajariladi.
     */
    if (verdict === 'unknown') {
      return { kind: 'theft', userId: session.userId };
    }

    if (session.user.deletedAt || session.user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Hisob faol emas');
    }

    const roles = session.user.roles.map((assignment) => assignment.role.name as RoleValue);

    const accessToken = await signAccessToken({
      userId: session.user.id,
      phone: session.user.phone,
      roles,
      sessionId,
    });

    /**
     * ── `grace`: token ALMASHTIRILMAYDI ────────────────────────────────
     * Bu so'rov bir necha millisekund kechikkan "egizak". Uning
     * yonidagi so'rov allaqachon yangi token berdi va u brauzer
     * cookie'siga yozildi.
     *
     * Agar bu yerda ham yangi token berilsa, ikkita javob bir-birining
     * cookie'sini bosib ketardi va oxirida qaysi biri qolgani
     * noaniq bo'lardi. Shuning uchun bu so'rov faqat access token
     * beradi va refresh cookie'ga TEGMAYDI.
     */
    if (verdict === 'grace') {
      logger.info({ sessionId, userId: session.userId }, "Bir vaqtda kelgan yangilash so'rovi");

      await tx.session.update({ where: { id: sessionId }, data: { lastUsedAt: new Date() } });

      return {
        kind: 'ok',
        tokens: { accessToken, refreshToken: null, expiresInSeconds: env.JWT_ACCESS_TTL },
      };
    }

    const refreshToken = await signRefreshToken({ userId: session.user.id, sessionId });

    await tx.session.update({
      where: { id: sessionId },
      data: {
        refreshTokenHash: hashToken(refreshToken),
        // Eski hash saqlanadi — egizak so'rov uni tanishi uchun.
        previousTokenHash: session.refreshTokenHash,
        rotatedAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL * 1000),
        userAgent: device.userAgent?.slice(0, 400) ?? session.userAgent,
        ipAddress: device.ipAddress ?? session.ipAddress,
      },
    });

    return { kind: 'ok', tokens: { accessToken, refreshToken, expiresInSeconds: env.JWT_ACCESS_TTL } };
  });

  if (outcome.kind === 'theft') {
    await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    logger.warn({ sessionId, userId: outcome.userId }, 'Eskirgan refresh token ishlatildi, sessiya yopildi');
    throw new UnauthorizedError('Sessiya bekor qilindi. Qaytadan kiring.');
  }

  return outcome.tokens;
}

/** Bitta sessiyani bekor qiladi (chiqish). */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  /**
   * Bazadagi belgi YETARLI EMAS.
   *
   * Access token 15 daqiqa yashaydi va u tekshirilganda bazaga
   * qaralmaydi. Qora ro'yxatsiz bekor qilish o'sha 15 daqiqadan
   * keyingina kuchga kirardi.
   */
  await blockSessions([sessionId]);
}

/**
 * Foydalanuvchining barcha sessiyalarini bekor qiladi.
 * Parol o'zgartirilganda majburiy — eski qurilmalar chiqarib yuboriladi.
 */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const where = {
    userId,
    revokedAt: null,
    ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
  };

  /**
   * ID'lar OLDIN o'qiladi.
   *
   * `updateMany` faqat sonini qaytaradi — qaysi sessiyalar bekor
   * qilinganini bilmaydi. Ularsiz qora ro'yxatga nima yozishni
   * aniqlab bo'lmasdi.
   */
  const sessions = await prisma.session.findMany({ where, select: { id: true } });

  if (sessions.length === 0) return 0;

  const result = await prisma.session.updateMany({ where, data: { revokedAt: new Date() } });

  await blockSessions(sessions.map((session) => session.id));

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
