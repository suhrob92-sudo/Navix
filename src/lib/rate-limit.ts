import { RateLimitError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { cacheKey, getRedis } from '@/lib/redis';

/**
 * So'rovlar sonini cheklash (rate limiting).
 *
 * Oddiy tilda: bir odam bir daqiqada 1000 marta parol taxmin qila olmasligi kerak.
 * Bu himoya "brute-force" (parolni taxmin qilib topish) hujumlarini to'xtatadi.
 *
 * Ishlash prinsipi — "sanovchi oyna" (fixed window):
 *  1. Redis'da hisoblagich yaratiladi va unga muddat (TTL) beriladi;
 *  2. Har so'rovda hisoblagich bittaga oshadi;
 *  3. Chegaradan oshsa — 429 xatolik qaytadi;
 *  4. Muddat tugagach hisoblagich o'zi o'chadi.
 */

export interface RateLimitRule {
  /** Chegara ichida ruxsat etilgan so'rovlar soni. */
  limit: number;
  /** Oyna uzunligi (soniyalarda). */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Autentifikatsiya uchun standart cheklovlar.
 * Qiymatlar xavfsizlik va qulaylik o'rtasidagi muvozanatga qarab tanlangan.
 */
export const AUTH_RATE_LIMITS = {
  /** Ro'yxatdan o'tish: bir IP'dan soatiga 5 marta. */
  register: { limit: 5, windowSeconds: 60 * 60 },
  /** Kirish: bir raqam uchun 15 daqiqada 10 marta. */
  login: { limit: 10, windowSeconds: 60 * 15 },
  /** SMS kod yuborish: bir raqamga soatiga 5 marta. */
  otpSend: { limit: 5, windowSeconds: 60 * 60 },
  /** Kodni tekshirish: bir raqam uchun 15 daqiqada 10 marta. */
  otpVerify: { limit: 10, windowSeconds: 60 * 15 },
  /** Parolni tiklash so'rovi: bir raqam uchun soatiga 3 marta. */
  passwordReset: { limit: 3, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export type AuthRateLimitScope = keyof typeof AUTH_RATE_LIMITS;

/**
 * Hisoblagichni oshiradi va chegaraga yetgan-yetmaganini qaytaradi.
 *
 * @param scope cheklov turi (masalan `login`)
 * @param identifier kim uchun hisoblanadi (telefon raqami yoki IP)
 * @param rule chegara qoidasi
 */
export async function consumeRateLimit(
  scope: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const key = cacheKey.rateLimit(scope, identifier);

  try {
    const redis = getRedis();

    // Ikkala buyruq bitta so'rovda yuboriladi — tarmoq kechikishi ikki barobar kamayadi.
    const results = await redis
      .multi()
      .incr(key)
      .expire(key, rule.windowSeconds, 'NX') // TTL faqat birinchi so'rovda o'rnatiladi
      .exec();

    // `exec()` tranzaksiya bekor qilinganda `null` qaytaradi — bu holatda
    // hisoblagichga ishonib bo'lmaydi, so'rovni o'tkazib yuboramiz.
    const incrementResult = results?.[0];
    if (!incrementResult) {
      return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
    }

    const current = Number(incrementResult[1] ?? 0);
    const remaining = Math.max(0, rule.limit - current);

    if (current > rule.limit) {
      const ttl = await redis.ttl(key);
      return { allowed: false, remaining: 0, retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds };
    }

    return { allowed: true, remaining, retryAfterSeconds: 0 };
  } catch (error) {
    // Redis ishlamay qolsa foydalanuvchini bloklamaymiz — xizmat to'xtab qolmasligi kerak.
    // Lekin bu holat log'ga yoziladi, chunki himoya vaqtincha o'chgan bo'ladi.
    logger.error({ err: error, scope, identifier }, 'Rate limit tekshiruvi bajarilmadi');
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

/**
 * Kirish TALAB QILINMAYDIGAN endpointlar uchun cheklovlar.
 *
 * Ular alohida ro'yxatda, chunki xavfi boshqacha: bu yerda parol
 * taxmin qilinmaydi, lekin robot bazani soxta yozuvlar bilan
 * to'ldirib tashlashi mumkin.
 */
export const PUBLIC_RATE_LIMITS = {
  /** Navbatga yozilish: bir IP'dan soatiga 5 marta. */
  waitlist: { limit: 5, windowSeconds: 60 * 60 },
  /**
   * Obuna bo'lish: bitta foydalanuvchi uchun daqiqasiga 30 marta.
   *
   * Odam uchun bemalol (ro'yxatni aylanib chiqib obuna bo'lish),
   * skript uchun esa foydasiz.
   */
  follow: { limit: 30, windowSeconds: 60 },
  /**
   * Suhbat ochish: bitta foydalanuvchi uchun soatiga 60 marta.
   *
   * Har bir yangi suhbat BEGONA odamning ro'yxatida paydo bo'ladi,
   * shuning uchun chegara obunadan qattiqroq.
   */
  chatOpen: { limit: 60, windowSeconds: 60 * 60 },
  /**
   * Xabar yuborish: daqiqasiga 60 ta.
   *
   * Odam uchun bemalol (soniyasiga bitta), skript uchun esa spam
   * qilishga yetmaydi.
   */
  chatSend: { limit: 60, windowSeconds: 60 },
  /**
   * Qo'ng'iroq boshlash: daqiqasiga 10 marta.
   *
   * Har bir qo'ng'iroq begona odamning telefonini CHALDIRADI —
   * xabardan ko'ra bezovta qiluvchi amal. Shuning uchun chegara qattiq.
   * Ayni paytda "ko'tarmadi, qayta urinaman" holatiga bemalol yetadi.
   */
  callStart: { limit: 10, windowSeconds: 60 },
  /**
   * Ulanish signallari: daqiqasiga 300 ta.
   *
   * ── Nima uchun cheklov KERAK ────────────────────────────────────────
   * Signallar navbati muddati tugaguncha xotirada turadi. Cheklovsiz
   * unga istalgancha ma'lumot tiqib, Redis xotirasini to'ldirish mumkin
   * bo'lardi.
   *
   * Haqiqiy qo'ng'iroq ~40 ta signal ishlatadi, shuning uchun 300 juda
   * bemalol — lekin suiiste'molga yetmaydi.
   */
  callSignal: { limit: 300, windowSeconds: 60 },
  /**
   * Odam qidirish: daqiqasiga 60 marta.
   *
   * Qidiruv har bosilgan harfda emas, yozish to'xtagach yuboriladi.
   * Shuning uchun odam uchun 60 juda bemalol; skript esa shu chegara
   * bilan foydalanuvchilar ro'yxatini yig'a olmaydi.
   */
  userSearch: { limit: 60, windowSeconds: 60 },
  /**
   * Bloklash va blokdan chiqarish: daqiqasiga 20 marta.
   *
   * Odam uchun bemalol, skript esa shu chegara bilan minglab odamni
   * ketma-ket bloklab, bazani to'ldira olmaydi.
   */
  userBlock: { limit: 20, windowSeconds: 60 },
  /**
   * Shikoyat: soatiga 20 marta.
   *
   * ── Nima uchun chegara QATTIQ ───────────────────────────────────────
   * Shikoyatni odam o'qiydi. Cheksiz shikoyat — moderatorning vaqtini
   * o'g'irlash usuli, ya'ni haqiqiy shikoyatlar ko'milib qolardi.
   */
  userReport: { limit: 20, windowSeconds: 60 * 60 },
  /**
   * Post yozish: soatiga 20 ta.
   *
   * Har bir post obunachilarning lentasiga tushadi. Odam uchun soatiga
   * yigirmata juda bemalol, skript uchun esa lentani egallab olishga
   * yetmaydi.
   */
  postCreate: { limit: 20, windowSeconds: 60 * 60 },
  /**
   * Izoh: daqiqasiga 20 ta.
   *
   * Izoh postdan tez-tez yoziladi (suhbat kabi), lekin u ham begona
   * odamga bildirishnoma yuboradi.
   */
  postComment: { limit: 20, windowSeconds: 60 },
  /**
   * Yoqtirish: daqiqasiga 120 ta.
   *
   * Lentani aylanib chiqib ko'plab post yoqtirish tabiiy holat.
   * Cheklov faqat robotni to'xtatish uchun.
   */
  postLike: { limit: 120, windowSeconds: 60 },
  /**
   * Rasm yuklash: soatiga 60 ta.
   *
   * ── Nima uchun chegara KERAK ────────────────────────────────────────
   * Har bir rasm joy egallaydi va u PULGA tushadi. Cheklovsiz skript
   * bir kechada saqlash limitini to'ldirib, hisobni to'xtatib
   * qo'yishi mumkin edi — shunda hamma rasmlar ochilmay qolardi.
   */
  upload: { limit: 60, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export type PublicRateLimitScope = keyof typeof PUBLIC_RATE_LIMITS;

/**
 * Berilgan qoida bo'yicha cheklovni majburlaydi.
 *
 * `enforceRateLimit` va `enforcePublicRateLimit` ikkalasi shu yerga
 * tayanadi — xato matni va soniyalarni ikki joyda yozib yurmaslik uchun.
 */
async function enforce(scope: string, identifier: string, rule: RateLimitRule, message?: string): Promise<void> {
  const result = await consumeRateLimit(scope, identifier, rule);

  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterSeconds / 60);
    throw new RateLimitError(
      result.retryAfterSeconds,
      message ?? `Juda ko'p urinish. ${minutes} daqiqadan so'ng qayta urinib ko'ring.`,
    );
  }
}

/**
 * Chegaradan oshsa darhol `RateLimitError` tashlaydi.
 * API route'larida shu funksiya ishlatiladi.
 */
export async function enforceRateLimit(
  scope: AuthRateLimitScope,
  identifier: string,
  message?: string,
): Promise<void> {
  return enforce(scope, identifier, AUTH_RATE_LIMITS[scope], message);
}

/** Ochiq endpointlar uchun — `PUBLIC_RATE_LIMITS` qoidalari bo'yicha. */
export async function enforcePublicRateLimit(
  scope: PublicRateLimitScope,
  identifier: string,
  message?: string,
): Promise<void> {
  return enforce(scope, identifier, PUBLIC_RATE_LIMITS[scope], message);
}

/** Hisoblagichni nolga qaytaradi (masalan muvaffaqiyatli kirishdan keyin). */
export async function resetRateLimit(scope: string, identifier: string): Promise<void> {
  try {
    await getRedis().del(cacheKey.rateLimit(scope, identifier));
  } catch (error) {
    logger.warn({ err: error, scope, identifier }, "Rate limit hisoblagichini tozalab bo'lmadi");
  }
}
