import { CALL_ALIVE_TTL_SECONDS, SIGNAL_TTL_SECONDS } from '@/config/calls';
import { logger } from '@/lib/logger';
import { cacheKey, getRedis } from '@/lib/redis';
import type { CallEvent } from '@/modules/call/call.types';

/**
 * Qo'ng'iroq hodisalarini yetkazish.
 *
 * ── Nima uchun NAVBAT (Redis list), oddiy kalit emas ──────────────────
 * Bitta qo'ng'iroq davomida o'nlab xabar almashiladi (ayniqsa tarmoq
 * manzillari). Oddiy kalitga yozilsa, keyingisi oldingisini o'chirib
 * yuborardi va ulanish o'rnatilmasdi.
 *
 * ── Nima uchun o'qilgan xabar O'CHIRILMAYDI ───────────────────────────
 * Birinchi yechimda o'qigan navbatni bo'shatardi. Lekin bir odamda
 * ikkita oyna ochiq bo'lsa (masalan, eski varaq fonda qolgan), ular
 * navbatni BO'LIB olardi: yarim xabar bir oynaga, yarmi ikkinchisiga
 * tushib, qo'ng'iroq ulanmay qolardi.
 *
 * Shuning uchun navbat o'chirilmaydi: har bir ulanish o'z JOYINI
 * (kursor) eslab qoladi va faqat yangilarini o'qiydi. Navbatning o'zi
 * muddat tugagach yo'qoladi.
 */

/** Bitta o'qishda qaytariladigan natija. */
export interface CallEventBatch {
  events: CallEvent[];
  /** Keyingi o'qish shu joydan davom etadi. */
  cursor: number;
}

/** Foydalanuvchiga bitta hodisa yuboradi. */
export async function pushCallEvent(userId: string, event: CallEvent): Promise<void> {
  try {
    const key = cacheKey.callInbox(userId);

    /**
     * Ikki amal BIR YO'LDA yuboriladi (pipeline).
     *
     * Alohida yuborilsa ikki marta tarmoq kutish vaqti sarflanardi —
     * qo'ng'iroqda esa har millisekund seziladi.
     */
    await getRedis().pipeline().rpush(key, JSON.stringify(event)).expire(key, SIGNAL_TTL_SECONDS).exec();
  } catch (error) {
    /**
     * Redis ishlamasa qo'ng'iroq amalga oshmaydi, lekin ilova
     * yiqilmasligi kerak: qolgan barcha bo'limlar ishlayveradi.
     */
    logger.error({ err: error, userId }, "Qo'ng'iroq hodisasini yuborib bo'lmadi");
  }
}

function parseEvents(raw: string[]): CallEvent[] {
  return raw.flatMap((item) => {
    try {
      return [JSON.parse(item) as CallEvent];
    } catch {
      // Buzilgan yozuv — o'tkazib yuboramiz, qolgani ishlayveradi.
      return [];
    }
  });
}

/**
 * "Qo'ng'iroq hali ketmoqda" belgisini yangilaydi.
 *
 * Belgi muddat bilan yashaydi: brauzer yopilsa u o'z-o'zidan so'nadi va
 * qo'ng'iroq tugagan deb hisoblanadi.
 */
export async function touchCallAlive(callId: string): Promise<void> {
  try {
    await getRedis().set(cacheKey.callAlive(callId), '1', 'EX', CALL_ALIVE_TTL_SECONDS);
  } catch (error) {
    logger.warn({ err: error, callId }, "Qo'ng'iroq belgisini yangilab bo'lmadi");
  }
}

/**
 * Qo'ng'iroq hali tirikmi.
 *
 * Redis ishlamasa TIRIK deb hisoblaymiz: ketayotgan suhbatni xatolik
 * tufayli uzib qo'yish — eng yomon natija.
 */
export async function isCallAlive(callId: string): Promise<boolean> {
  try {
    return (await getRedis().exists(cacheKey.callAlive(callId))) === 1;
  } catch (error) {
    logger.warn({ err: error, callId }, "Qo'ng'iroq belgisini o'qib bo'lmadi");
    return true;
  }
}

/**
 * Navbatning HOZIRGI oxirini qaytaradi.
 *
 * ── Nima uchun yangi ulanish OXIRIDAN boshlaydi ───────────────────────
 * Boshidan o'qilsa, ilova ochilgan zahoti allaqachon TUGAGAN
 * qo'ng'iroqning "chalinmoqda" xabari kelib, telefon bekorga
 * chalinardi — sinovda aynan shunday "arvoh qo'ng'iroq" chiqdi.
 *
 * Ulanishdan OLDIN bo'lgan hodisalar ta'rifiga ko'ra o'tmishda qolgan.
 * Davom etayotgan haqiqiy qo'ng'iroq esa yo'qolmaydi: u oqim ochilishida
 * alohida (`live`) yuboriladi.
 */
export async function callQueueTail(userId: string): Promise<number> {
  try {
    return await getRedis().llen(cacheKey.callInbox(userId));
  } catch (error) {
    logger.warn({ err: error, userId }, "Qo'ng'iroq navbati uzunligini o'qib bo'lmadi");
    return 0;
  }
}

/**
 * Kursordan keyingi yangi hodisalarni o'qiydi.
 *
 * @param cursor oldingi o'qishda qaytarilgan joy.
 */
export async function readCallEvents(userId: string, cursor: number): Promise<CallEventBatch> {
  const key = cacheKey.callInbox(userId);

  try {
    const result = await getRedis().pipeline().llen(key).lrange(key, cursor, -1).exec();

    const length = (result?.[0]?.[1] ?? 0) as number;
    const slice = (result?.[1]?.[1] ?? []) as string[];

    /**
     * Navbat kursordan QISQA bo'lib qolgan.
     *
     * Bu navbat muddati tugab, keyin yangisi boshlanganini bildiradi
     * (uzoq jim suhbatda shunday bo'ladi). Kursor eski joyda qolsa,
     * yangi xabarlar butunlay o'tkazib yuborilardi — masalan
     * "qo'ng'iroq tugadi" xabari.
     *
     * Shuning uchun boshidan qayta o'qiymiz.
     */
    if (length < cursor) {
      const fresh = await getRedis().lrange(key, 0, -1);

      return { events: parseEvents(fresh), cursor: fresh.length };
    }

    return { events: parseEvents(slice), cursor: length };
  } catch (error) {
    logger.warn({ err: error, userId }, "Qo'ng'iroq navbatini o'qib bo'lmadi");

    // Kursor o'zgarmaydi: keyingi urinishda o'sha joydan davom etadi.
    return { events: [], cursor };
  }
}
