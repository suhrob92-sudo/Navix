import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '@/generated/prisma/client';
import { isProduction, serverEnv } from '@/lib/env';

/**
 * Prisma klientining yagona (singleton) nusxasi — "dangasa" (lazy) yaratiladi.
 *
 * Nima uchun singleton: Next.js development rejimida fayl o'zgarganda modul
 * qayta yuklanadi. Agar har safar `new PrismaClient()` chaqirilsa — bazaga
 * ulanishlar soni tez orada tugab qoladi. Shuning uchun global obyektda saqlaymiz.
 *
 * Nima uchun "dangasa": klient faqat BIRINCHI marta ishlatilganda yaratiladi.
 * Aks holda `npm run build` paytida ham ulanish ochilishga urinardi — build esa
 * bazasiz muhitda (masalan CI serverida) bajarilishi mumkin.
 *
 * Prisma 7'dan boshlab ulanish "driver adapter" orqali amalga oshadi —
 * bu yerda PostgreSQL uchun `@prisma/adapter-pg` ishlatilgan.
 */

const globalForPrisma = globalThis as unknown as { navixPrisma?: PrismaClient };

/** Klientni qaytaradi; kerak bo'lsa yaratadi. */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.navixPrisma) {
    return globalForPrisma.navixPrisma;
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: serverEnv().DATABASE_URL }),
    log: isProduction() ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

  // Production'da ham saqlaymiz — bu serverless muhitda ulanishlarni tejaydi.
  globalForPrisma.navixPrisma = client;
  return client;
}

/**
 * Kundalik foydalanish uchun qulay ko'rinish: `prisma.user.findMany()`.
 * Proxy ostida `getPrisma()` chaqiriladi, ya'ni ulanish birinchi so'rovda ochiladi.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property) as unknown;

    return typeof value === 'function' ? value.bind(client) : value;
  },
});
