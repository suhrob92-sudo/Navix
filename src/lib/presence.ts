import { cacheKey, getRedis } from '@/lib/redis';
import { logger } from '@/lib/logger';

/**
 * Kim hozir ilovada va kim yozmoqda.
 *
 * ── Nima uchun REDIS, baza emas ───────────────────────────────────────
 * Bu ma'lumot bir necha soniya yashaydi va uni saqlashning ma'nosi
 * yo'q: server o'chib yonsa, "kim online edi" degan savol o'z-o'zidan
 * ahamiyatsiz bo'lib qoladi.
 *
 * Bazaga yozilsa, har bir foydalanuvchi uchun bir necha soniyada bir
 * marta YOZISH amali bajarilardi — bu bazani bekorga charchatadi.
 * Redis'da esa kalitning o'zi muddat tugagach yo'qoladi.
 */

/**
 * "Onlayn" belgisining umri.
 *
 * Jonli ulanish har 20 soniyada yangilab turadi, shuning uchun 60
 * soniya xavfsiz oraliq: bitta yangilanish o'tkazib yuborilsa ham
 * odam "chiqib ketdi" deb belgilanmaydi.
 */
const PRESENCE_TTL_SECONDS = 60;

/**
 * "Yozmoqda" belgisining umri.
 *
 * Qisqa: odam yozishni to'xtatsa, belgi o'zi so'nishi kerak. Har
 * bosilgan harfda yangilanadi.
 */
const TYPING_TTL_SECONDS = 6;

/** Foydalanuvchini "onlayn" deb belgilaydi. */
export async function markOnline(userId: string): Promise<void> {
  try {
    await getRedis().set(cacheKey.presence(userId), '1', 'EX', PRESENCE_TTL_SECONDS);
  } catch (error) {
    // Redis ishlamasa "onlayn" belgisi ko'rinmaydi — bu jiddiy emas.
    logger.warn({ err: error, userId }, "Onlayn belgisini yozib bo'lmadi");
  }
}

/** Foydalanuvchini darhol "oflayn" qiladi (chiqib ketganda). */
export async function markOffline(userId: string): Promise<void> {
  try {
    await getRedis().del(cacheKey.presence(userId));
  } catch (error) {
    logger.warn({ err: error, userId }, "Onlayn belgisini o'chirib bo'lmadi");
  }
}

/** Foydalanuvchi hozir ilovadami. */
export async function isOnline(userId: string): Promise<boolean> {
  try {
    return (await getRedis().exists(cacheKey.presence(userId))) === 1;
  } catch (error) {
    /**
     * Redis ishlamasa "oflayn" deymiz.
     *
     * Noto'g'ri "onlayn" ko'rsatish yomonroq: odam javob kutib
     * o'tirardi.
     */
    logger.warn({ err: error, userId }, "Onlayn holatini o'qib bo'lmadi");
    return false;
  }
}

/** "Yozmoqda" belgisini qo'yadi. */
export async function markTyping(conversationId: string, userId: string): Promise<void> {
  try {
    await getRedis().set(cacheKey.typing(conversationId, userId), '1', 'EX', TYPING_TTL_SECONDS);
  } catch (error) {
    logger.warn({ err: error, conversationId }, "“Yozmoqda” belgisini yozib bo'lmadi");
  }
}

/** Suhbatdagi BOSHQA odam yozmoqdami. */
export async function isTyping(conversationId: string, otherUserId: string): Promise<boolean> {
  try {
    return (await getRedis().exists(cacheKey.typing(conversationId, otherUserId))) === 1;
  } catch (error) {
    logger.warn({ err: error, conversationId }, "“Yozmoqda” belgisini o'qib bo'lmadi");
    return false;
  }
}
