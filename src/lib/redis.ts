import Redis from 'ioredis';

import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Redis klientining yagona (singleton) nusxasi — "dangasa" (lazy) yaratiladi.
 *
 * Redis nima uchun kerak:
 *  - Kesh (tez-tez so'raladigan ma'lumotlarni xotirada saqlash);
 *  - Sessiya va refresh token ro'yxati;
 *  - Rate limiting (so'rovlar sonini cheklash);
 *  - Real-time navbatlar (taxi buyurtmasi, kuryer holati).
 *
 * Klient faqat birinchi ishlatilganda ochiladi — shunda `npm run build`
 * Redis'siz muhitda ham muvaffaqiyatli bajariladi.
 */

const globalForRedis = globalThis as unknown as { navixRedis?: Redis };

/** Redis klientini qaytaradi; kerak bo'lsa ulanishni ochadi. */
export function getRedis(): Redis {
  if (globalForRedis.navixRedis) {
    return globalForRedis.navixRedis;
  }

  const client = new Redis(serverEnv().REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    // Har bir qayta urinishda kutish vaqti ortadi, lekin 5 soniyadan oshmaydi.
    retryStrategy: (times) => Math.min(times * 200, 5_000),
  });

  client.on('error', (error: Error) => {
    logger.error({ err: error }, 'Redis ulanishida xatolik');
  });

  client.on('connect', () => {
    logger.info('Redis ulandi');
  });

  globalForRedis.navixRedis = client;
  return client;
}

/** Kesh kalitlari uchun yagona prefiks — modullar bir-biriga xalaqit bermasligi uchun. */
export const cacheKey = {
  user: (userId: string) => `navix:user:${userId}`,
  session: (sessionId: string) => `navix:session:${sessionId}`,
  refreshToken: (tokenId: string) => `navix:refresh:${tokenId}`,
  rateLimit: (scope: string, identifier: string) => `navix:ratelimit:${scope}:${identifier}`,
  /** Foydalanuvchi hozir ilovadami. */
  presence: (userId: string) => `navix:presence:${userId}`,
  /** Kim qaysi suhbatda yozayotgani. */
  typing: (conversationId: string, userId: string) => `navix:typing:${conversationId}:${userId}`,
  /**
   * Guruhda hozir kim yozayotgani — BITTA to'plamda.
   *
   * ── Nima uchun alohida kalit ──────────────────────────────────────
   * Yuqoridagi `typing` har bir odam uchun alohida kalit yasaydi.
   * Ikki kishilik suhbatda bu yetarli: bitta tekshiruv kifoya.
   * 200 a'zoli guruhda esa har bir yangilanishda 199 ta tekshiruv
   * kerak bo'lardi — bu Redis'ni har 1.5 soniyada minglab so'rov
   * bilan ko'mib tashlardi.
   *
   * To'plamda esa a'zolar soni qanday bo'lishidan qat'i nazar
   * BITTA so'rov bilan o'qiladi.
   */
  groupTyping: (conversationId: string) => `navix:typing:group:${conversationId}`,
  /** Foydalanuvchiga kelgan qo'ng'iroq signallari navbati. */
  callInbox: (userId: string) => `navix:call:inbox:${userId}`,
  /** Qo'ng'iroq hali tirikmi (brauzer yopilib qolmadimi). */
  callAlive: (callId: string) => `navix:call:alive:${callId}`,
  /** Foydalanuvchi hozir qaysi suhbatni ochib turgani. */
  viewing: (userId: string) => `navix:viewing:${userId}`,
  /**
   * Bloklangan odamlar ro'yxati.
   *
   * ── Nima uchun keshlanadi ───────────────────────────────────────────
   * Bu ro'yxat lentaning HAR BIR so'rovida o'qiladi: qidiruvda,
   * mavzu sahifasida, mahsulot sahifasidagi videolarda ham. Ya'ni
   * bitta ekranni ochish bir necha marta bir xil so'rovni yuboradi.
   *
   * Ro'yxat esa deyarli o'zgarmaydi — odam kuniga bir marta ham
   * bloklamaydi.
   */
  blockedIds: (userId: string) => `navix:blocked:${userId}`,
  /** Lenta sozlamalari — har bir lenta so'rovida o'qiladi. */
  feedSettings: (userId: string) => `navix:feed:settings:${userId}`,
} as const;

/**
 * Keshdan o'qiydi, bo'lmasa `loader` ni ishga tushirib natijani keshga yozadi.
 * Bu "cache-aside" nomli standart usul.
 *
 * @param key kesh kaliti (`cacheKey` yordamchisidan foydalaning)
 * @param ttlSeconds necha soniya saqlansin
 * @param loader kesh bo'sh bo'lsa ma'lumotni oluvchi funksiya
 */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const redis = getRedis();

  try {
    const hit = await redis.get(key);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch (error) {
    // Kesh ishlamasa ham ilova to'xtamasligi kerak — faqat log yozamiz.
    logger.warn({ err: error, key }, "Keshdan o'qib bo'lmadi, manbadan olinadi");
  }

  const value = await loader();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.warn({ err: error, key }, "Keshga yozib bo'lmadi");
  }

  return value;
}
