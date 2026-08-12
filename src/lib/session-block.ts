import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { cacheKey, getRedis } from '@/lib/redis';

/**
 * Bekor qilingan sessiyalarning qora ro'yxati.
 *
 * ── HAQIQIY XATO, tekshiruvda topilgan ────────────────────────────────
 * Sessiya bekor qilinganda bazaga `revokedAt` yoziladi. Lekin har bir
 * so'rovda faqat JWT tekshirilardi — bazaga umuman qaralmasdi. Access
 * token esa 15 daqiqa yashaydi.
 *
 * Natijada bekor qilish 15 daqiqagacha KUCHGA KIRMASDI:
 *
 *   · "Barcha qurilmalardan chiqish" — o'g'ri telefon 15 daqiqa
 *     ishlatib turaverardi. Bu tugmaning butun ma'nosi shu edi;
 *   · parol o'zgartirilgach eski qurilmalar chiqarilardi — lekin
 *     amalda emas;
 *   · admin foydalanuvchini bloklagach, u 15 daqiqa yozishda davom
 *     etardi;
 *   · hisob yopilgach, eski token bilan ish qilish mumkin edi.
 *
 * ── Nima uchun REDIS, baza emas ───────────────────────────────────────
 * Har so'rovda bazaga murojaat qilish sekin va qimmat. Bekor qilingan
 * sessiyalar esa kam va qisqa umrli: token muddati tugagach ular
 * ahamiyatsiz bo'ladi. Shuning uchun ular Redis'da aynan SHU muddatga
 * saqlanadi va o'zi yo'qoladi — tozalash kerak emas.
 *
 * ── Nima uchun sessiya bo'yicha, foydalanuvchi bo'yicha emas ──────────
 * "Boshqa qurilmalardan chiqish" amalida joriy qurilma QOLISHI kerak.
 * Foydalanuvchi bo'yicha bloklansa, odam o'zini ham chiqarib yuborardi.
 */

/** Kalitni yasaydi. */
function blockKey(sessionId: string): string {
  return `${cacheKey.session(sessionId)}:blocked`;
}

/**
 * Sessiyalarni qora ro'yxatga qo'shadi.
 *
 * ── Nima uchun xato YUTILADI ──────────────────────────────────────────
 * Redis o'chib qolsa, bloklash yozilmaydi. Bu yomon, lekin bekor
 * qilishning O'ZINI to'xtatish undan ham yomon: bazadagi `revokedAt`
 * baribir yoziladi va refresh token darhol ishlamay qoladi. Ya'ni
 * eng ko'pi bilan 15 daqiqa kechikish bo'ladi — avvalgi holat.
 */
export async function blockSessions(sessionIds: readonly string[]): Promise<void> {
  if (sessionIds.length === 0) return;

  try {
    const ttl = serverEnv().JWT_ACCESS_TTL;
    const pipeline = getRedis().pipeline();

    for (const id of sessionIds) {
      pipeline.set(blockKey(id), '1', 'EX', ttl);
    }

    await pipeline.exec();
  } catch (error) {
    logger.warn({ err: error, count: sessionIds.length }, "Sessiya bloklanmadi (Redis)");
  }
}

/**
 * Sessiya bekor qilinganmi.
 *
 * ── Nima uchun xatoda "bloklanmagan" deb qaytariladi ──────────────────
 * Redis o'chib qolsa va bu yerda "bloklangan" deb qaytarilsa, BUTUN
 * ilova ishlamay qolardi: hech kim hech qayerga kira olmasdi.
 *
 * Redis ishlamayotgani — infratuzilma nosozligi, foydalanuvchining
 * aybi emas. Shuning uchun tanlov: kichik xavf (bekor qilingan
 * sessiya 15 daqiqa ishlaydi) yoki to'liq to'xtash. Birinchisi
 * afzal, chunki u avvalgi holatdan yomonroq emas.
 */
export async function isSessionBlocked(sessionId: string): Promise<boolean> {
  try {
    return (await getRedis().exists(blockKey(sessionId))) === 1;
  } catch (error) {
    logger.warn({ err: error }, "Sessiya bloklanganini tekshirib bo'lmadi (Redis)");

    return false;
  }
}
