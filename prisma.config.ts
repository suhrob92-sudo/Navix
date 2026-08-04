import 'dotenv/config';

import path from 'node:path';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 konfiguratsiyasi.
 *
 * Prisma 7'dan boshlab bazaga ulanish satri `schema.prisma` ichida emas,
 * shu faylda ko'rsatiladi. Bu migratsiya (migrate) buyruqlari uchun kerak.
 * Ilova ichida esa `src/lib/prisma.ts` dagi adapter ishlatiladi.
 *
 * ── Nima uchun DIRECT_URL ─────────────────────────────────────────────
 * Bulutdagi bazalar (Neon, Supabase) ikkita manzil beradi:
 *
 *   · POOLED  — ulanishlarni birlashtiruvchi (PgBouncer) orqali.
 *     Serverless uchun shart: har bir so'rov yangi ulanish ochsa,
 *     baza ulanishlari tez orada tugab qoladi.
 *
 *   · DIRECT  — to'g'ridan-to'g'ri bazaga.
 *
 * Migratsiya POOLED manzil orqali ishonchli bajarilmaydi: u jadval
 * qulflari va sessiya sozlamalarini ishlatadi, PgBouncer esa ularni
 * yo'qotadi. Shuning uchun migratsiya DIRECT, ilova esa POOLED
 * manzildan foydalanadi.
 *
 * Lokal ishlashda `DIRECT_URL` kerak emas — bitta manzil yetarli.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
