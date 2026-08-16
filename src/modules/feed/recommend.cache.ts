import { logger } from '@/lib/logger';
import { getRedis } from '@/lib/redis';

/**
 * Tavsiya keshi — YAGONA joy.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Keshni ikki tomon ishlatadi: tavsiya xizmati (yozadi va o'qiydi) va
 * sozlamalar xizmati (bekor qiladi).
 *
 * Ikkalasi bir-biridan olsa, AYLANMA bog'lanish paydo bo'lardi:
 * sozlamalar tavsiyaga, tavsiya esa sozlamalarga murojaat qiladi.
 * Bu TypeScript'da sezilmaydi, lekin ishga tushirishda bir modul
 * ikkinchisidan `undefined` olib qolishi mumkin.
 *
 * Bu fayl esa hech kimga bog'lanmaydi.
 */

/** Tartiblangan ro'yxat qancha yashaydi (soniya). */
export const RANKING_TTL_SECONDS = 10 * 60;

/** Foydalanuvchining kesh AVLODI — bekor qilish uchun. */
function versionKey(userId: string): string {
  return `feed:rec:v:${userId}`;
}

/**
 * Tartiblangan ro'yxat kaliti.
 *
 * ── HAQIQIY XATO, sinov topgan ────────────────────────────────────────
 * Ilgari kalit faqat foydalanuvchi ID sidan iborat edi. Natijada
 * "Ishlar" bo'limi so'ralganda ham UMUMIY lentaning keshi
 * qaytarilardi — ya'ni bo'lim filtri tavsiyada UMUMAN ishlamasdi.
 *
 * Endi kalitga `scope` ham kiradi: har bir filtr o'z ro'yxatiga ega.
 *
 * ── Nima uchun AVLOD raqami bor ───────────────────────────────────────
 * Sozlama o'zgarganda barcha filtrlarning keshi bekor bo'lishi kerak.
 * Ularni birma-bir o'chirish uchun kalitlarni qidirib yurish
 * kerak bo'lardi (`KEYS` buyrug'i — katta bazada juda sekin).
 *
 * Avlod raqamini bittaga oshirish esa BITTA amal: eski kalitlarga
 * hech kim murojaat qilmaydi va ular o'z muddati bilan o'chadi.
 */
export function rankingCacheKey(userId: string, version: number, scope: string): string {
  return `feed:rec:${userId}:${version}:${scope}`;
}

/**
 * Joriy avlod raqami.
 *
 * Redis yiqilsa `0` qaytadi — kesh o'qish ham, yozish ham baribir
 * xato beradi va lenta keshsiz ishlayveradi.
 */
export async function currentRankingVersion(userId: string): Promise<number> {
  try {
    const raw = await getRedis().get(versionKey(userId));

    return raw ? Number(raw) || 0 : 0;
  } catch (error) {
    logger.warn({ err: error, userId }, "Tavsiya avlodini o'qib bo'lmadi");

    return 0;
  }
}

/**
 * Tavsiya keshini bekor qiladi.
 *
 * Odam "qiziq emas" desa yoki sozlamani o'zgartirsa, lenta DARHOL
 * o'zgarishi kerak — o'n daqiqa kutish "ishlamadi" degan taassurot
 * qoldirardi.
 *
 * ── Nima uchun xato YUTILADI ──────────────────────────────────────────
 * Redis o'chib qolsa ham sozlama saqlanishi kerak. Kesh tozalanmagani
 * eng yomoni — lenta o'n daqiqadan keyin yangilanadi.
 */
export async function invalidateRecommendations(userId: string): Promise<void> {
  try {
    /**
     * Avlod raqami ham MUDDATLI.
     *
     * Cheksiz saqlansa, million foydalanuvchida million kalit
     * to'planardi. Bir sutkalik muddat yetarli: undan keyin
     * ro'yxatlar ham allaqachon o'chgan bo'ladi.
     */
    await getRedis().incr(versionKey(userId));
    await getRedis().expire(versionKey(userId), 24 * 60 * 60);
  } catch (error) {
    logger.warn({ err: error, userId }, "Tavsiya keshini tozalab bo'lmadi");
  }
}
