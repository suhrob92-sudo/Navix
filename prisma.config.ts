import 'dotenv/config';

import path from 'node:path';

import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 konfiguratsiyasi.
 *
 * Prisma 7'dan boshlab bazaga ulanish satri `schema.prisma` ichida emas,
 * shu faylda ko'rsatiladi. Bu migratsiya (migrate) buyruqlari uchun kerak.
 * Ilova ichida esa `src/lib/prisma.ts` dagi adapter ishlatiladi.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
