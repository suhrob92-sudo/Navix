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

/**
 * Foydalanuvchi hozir shu suhbatni ochib turganini belgilaydi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Yangi xabar kelganda telefonga push yuboriladi. Lekin odam AYNAN
 * shu suhbatni ochib o'tirgan bo'lsa, xabarni allaqachon ko'rib
 * turibdi — unga push yuborish bezovta qilishdan boshqa narsa emas.
 *
 * Belgi qisqa yashaydi: suhbat yopilishi bilan o'zi so'nadi va
 * "yopdim" degan alohida so'rov kerak bo'lmaydi.
 */
export async function markViewing(userId: string, conversationId: string): Promise<void> {
  try {
    await getRedis().set(cacheKey.viewing(userId), conversationId, 'EX', PRESENCE_TTL_SECONDS);
  } catch (error) {
    logger.warn({ err: error, userId }, "Ochiq suhbat belgisini yozib bo'lmadi");
  }
}

/**
 * Foydalanuvchi shu suhbatni ochib turibdimi.
 *
 * Redis ishlamasa "yo'q" deymiz: push kelib qolgani — xabar umuman
 * kelmaganidan yaxshiroq.
 */
export async function isViewing(userId: string, conversationId: string): Promise<boolean> {
  try {
    return (await getRedis().get(cacheKey.viewing(userId))) === conversationId;
  } catch (error) {
    logger.warn({ err: error, userId }, "Ochiq suhbat belgisini o'qib bo'lmadi");
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

/**
 * Guruhda "yozmoqda" belgisini qo'yadi.
 *
 * Yozuvlar TARTIBLANGAN to'plamda saqlanadi, ball sifatida esa vaqt
 * turadi. Shu sababli eskirganlarini o'chirish uchun alohida vazifa
 * kerak emas: o'qiyotganda vaqt oralig'i bo'yicha kesib olinadi.
 */
export async function markGroupTyping(conversationId: string, userId: string): Promise<void> {
  try {
    const key = cacheKey.groupTyping(conversationId);
    const now = Date.now();

    await getRedis()
      .multi()
      .zadd(key, now, userId)
      /**
       * Eskirganlari SHU YERDA tozalanadi.
       *
       * Aks holda guruhdan chiqib ketgan odamning yozuvi to'plamda
       * abadiy qolardi va to'plam cheksiz o'sardi.
       */
      .zremrangebyscore(key, 0, now - TYPING_TTL_SECONDS * 1000)
      /**
       * Kalitning o'ziga ham muddat qo'yiladi: guruhda uzoq vaqt
       * hech kim yozmasa, kalit butunlay yo'qoladi.
       */
      .expire(key, TYPING_TTL_SECONDS * 4)
      .exec();
  } catch (error) {
    logger.warn({ err: error, conversationId }, "Guruhda yozmoqda belgisini yozib bo'lmadi");
  }
}

/**
 * Guruhda hozir yozayotganlarning ID'lari (o'zimdan tashqari).
 *
 * @param limit Eng ko'pi bilan nechta ism kerak. Ekranda uchtadan
 *   ortig'i baribir sig'maydi.
 */
export async function groupTypingUserIds(conversationId: string, viewerId: string, limit = 3): Promise<string[]> {
  try {
    const since = Date.now() - TYPING_TTL_SECONDS * 1000;

    const ids = await getRedis().zrangebyscore(cacheKey.groupTyping(conversationId), since, '+inf');

    return ids.filter((id) => id !== viewerId).slice(0, limit);
  } catch (error) {
    logger.warn({ err: error, conversationId }, "Guruhda yozmoqda belgisini o'qib bo'lmadi");
    return [];
  }
}

/** Guruhdan chiqqan odamning "yozmoqda" belgisini olib tashlaydi. */
export async function clearGroupTyping(conversationId: string, userId: string): Promise<void> {
  try {
    await getRedis().zrem(cacheKey.groupTyping(conversationId), userId);
  } catch (error) {
    logger.warn({ err: error, conversationId }, "Guruhda yozmoqda belgisini o'chirib bo'lmadi");
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
