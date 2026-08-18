import { logger } from '@/lib/logger';
import { getRedis } from '@/lib/redis';
import { MIN_SEARCH_LENGTH } from '@/modules/feed/discover.types';

/**
 * Qidiruv tarixi — "oxirgi qidiruvlaringiz".
 *
 * ── Nima uchun bu KERAK ───────────────────────────────────────────────
 * Odam qidiruvni deyarli har doim TAKRORLAYDI: bir marta "ijara
 * kvartira" deb qidirgan odam ertaga ham shuni qidiradi. Har safar
 * to'liq yozish esa telefonda uzoq ish.
 *
 * Bundan tashqari, bo'sh qidiruv maydoni odamni orqaga qaytarib
 * yuboradi: yozadigan narsa esiga kelmaydi. Tarix esa unga o'z
 * so'zlarini qaytarib beradi.
 *
 * ── Nima uchun Redis, baza EMAS ───────────────────────────────────────
 * Har bir harf emas, har bir qidiruv yozib boriladi — ya'ni yozuv
 * juda ko'p. Baza jadvali bunday yukdan tez shishib ketardi va
 * uni tozalab turish kerak bo'lardi.
 *
 * Tarix esa YO'QOLSA ham hech narsa buzilmaydi: bu ma'lumot emas,
 * qulaylik. Aynan shunday narsalar uchun Redis mo'ljallangan.
 *
 * ── Nima uchun har birining O'Z muddati YO'Q ──────────────────────────
 * Butun ro'yxatga bitta muddat qo'yiladi. Har bir yozuvga alohida
 * muddat qo'yish uchun har biri alohida kalit bo'lishi kerak edi —
 * o'nta kalit, o'nta so'rov va tartibni saqlash uchun yana bittasi.
 */

/**
 * Ro'yxatda nechta so'z saqlanadi.
 *
 * ── Nima uchun 10 ta ──────────────────────────────────────────────────
 * Tarix qidiruv maydonining OSTIDA, bo'sh holatda ko'rsatiladi.
 * Yigirmata so'z butun ekranni egallab, kashf qilish bo'limini
 * pastga surib yuborardi.
 */
export const MAX_SEARCH_HISTORY = 10;

/**
 * Tarix qancha yashaydi (soniya) — 30 kun.
 *
 * Muddatsiz saqlansa, bir yil oldin bir marta qidirilgan so'z
 * ro'yxatda abadiy turardi. Bu ham foydasiz, ham noqulay: odam uni
 * qo'lda o'chirishga majbur bo'lardi.
 */
const HISTORY_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Yozuvning eng katta uzunligi — cheksiz matn saqlanmasligi uchun. */
const MAX_QUERY_LENGTH = 60;

function historyKey(userId: string): string {
  return `navix:search-history:${userId}`;
}

/**
 * So'zni TOZALAYDI.
 *
 * ── Nima uchun kichik harfga o'tkazilmaydi ────────────────────────────
 * Odam o'zi yozgan ko'rinishda ko'rishi kerak: "Chorsu" ni "chorsu"
 * qilib qaytarsak, u o'z yozganini tanimasdi.
 *
 * Takrorni aniqlashda esa kichik harf ISHLATILADI — bu ikki
 * boshqa masala.
 */
function cleanQuery(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * Qidiruv so'zini tarixga yozadi.
 *
 * ── Nima uchun xato YUTILADI ──────────────────────────────────────────
 * Redis o'chib qolsa, qidiruvning O'ZI ishlashda davom etishi kerak.
 * Tarix — qulaylik, va uning yo'qligi sababli odamni natijasiz
 * qoldirish mumkin emas.
 */
export async function rememberSearch(userId: string, rawQuery: string): Promise<void> {
  const query = cleanQuery(rawQuery);

  if (query.length < MIN_SEARCH_LENGTH) return;

  const key = historyKey(userId);

  try {
    const redis = getRedis();

    /*
      Avval O'CHIRILADI, keyin qo'shiladi.

      Aks holda "burger" ni ikki marta qidirgan odam ro'yxatda
      ikkita "burger" ko'rardi. O'chirish esa uni eng boshiga
      ko'taradi — bu ham to'g'ri: oxirgi qidiruv birinchi turishi
      kerak.

      Taqqoslash KICHIK harfda: "Burger" va "burger" — bir xil
      qidiruv.
    */
    const existing = await redis.lrange(key, 0, MAX_SEARCH_HISTORY * 2);

    for (const item of existing) {
      if (item.toLowerCase() === query.toLowerCase()) {
        await redis.lrem(key, 0, item);
      }
    }

    /*
      Uch amal BITTA yuborishda (`pipeline`).

      Alohida yuborilsa, telefondagi sekin tarmoqda uch marta
      kutish kerak bo'lardi — qidiruv javobi esa shuncha
      kechikardi.
    */
    await redis
      .pipeline()
      .lpush(key, query)
      .ltrim(key, 0, MAX_SEARCH_HISTORY - 1)
      .expire(key, HISTORY_TTL_SECONDS)
      .exec();
  } catch (error) {
    logger.warn({ err: error, userId }, "Qidiruv tarixini yozib bo'lmadi");
  }
}

/** Oxirgi qidiruvlar — yangisi birinchi. */
export async function listSearchHistory(userId: string): Promise<string[]> {
  try {
    return await getRedis().lrange(historyKey(userId), 0, MAX_SEARCH_HISTORY - 1);
  } catch (error) {
    logger.warn({ err: error, userId }, "Qidiruv tarixini o'qib bo'lmadi");

    // Bo'sh ro'yxat — ekranda shunchaki tarix ko'rinmaydi.
    return [];
  }
}

/**
 * Tarixni tozalaydi.
 *
 * @param query Berilsa — faqat shu yozuv, berilmasa — HAMMASI.
 *
 * ── Nima uchun bittalab o'chirish ham kerak ───────────────────────────
 * Tarixda tasodifiy yoki shaxsiy so'z qolib ketishi mumkin (masalan
 * kasallik nomi). Butun tarixni o'chirishga majburlash — odamning
 * qolgan barcha qulayligini yo'q qilish degani.
 */
export async function clearSearchHistory(userId: string, query?: string): Promise<void> {
  const key = historyKey(userId);

  try {
    const redis = getRedis();

    if (query === undefined) {
      await redis.del(key);

      return;
    }

    await redis.lrem(key, 0, cleanQuery(query));
  } catch (error) {
    logger.warn({ err: error, userId }, "Qidiruv tarixini o'chirib bo'lmadi");
  }
}
