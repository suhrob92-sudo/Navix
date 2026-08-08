import fs from 'node:fs';
import path from 'node:path';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../../src/generated/prisma/client';

/**
 * Skript QAYSI bazaga ulanishini hal qiladi.
 *
 * ── Nima uchun kerak (HAQIQIY MUAMMO) ─────────────────────────────────
 * Rollar va biriktirishlar HAR BAZADA ALOHIDA yashaydi. Lokal bazada
 * admin qilingan odam bulutdagi (Neon) bazada oddiy foydalanuvchi
 * bo'lib qolaveradi.
 *
 * Aynan shu sabab production'da "Admin panel" havolasi ko'rinmasdi:
 * rol lokal bazada berilgan edi.
 *
 * Ilgari buni tuzatish uchun `.env` faylini qo'lda o'zgartirish kerak
 * bo'lardi — telefondan bu noqulay va xavfli (production manzilini
 * `.env` da unutib qoldirish oson).
 *
 * Endi bitta bayroq yetadi:
 *
 *     npm run role:grant -- 901234567 ADMIN --prod
 *
 * ── Xavfsizlik ────────────────────────────────────────────────────────
 * Skript qaysi bazaga ulanayotganini HAR DOIM ekranga yozadi. Shunda
 * "lokal deb o'ylab, production'ni o'zgartirib qo'yish" holati
 * ko'rinmay qolmaydi.
 */

const ROOT = process.cwd();
const PRODUCTION_ENV_PATH = path.join(ROOT, '.env.production');

/** ".env" ko'rinishidagi faylni o'qiydi. */
function readEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    // Qo'shtirnoq ichidagi qiymatlardan tirnoqni olib tashlaymiz.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/** Manzilni parolsiz, o'qishga qulay ko'rinishda beradi. */
function describeTarget(url: string): string {
  try {
    const parsed = new URL(url);

    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "noma'lum manzil";
  }
}

export interface DatabaseTarget {
  prisma: PrismaClient;
  isProduction: boolean;
}

/**
 * Argumentlarda `--prod` bo'lsa bulutdagi bazaga, aks holda lokalga
 * ulanadi.
 *
 * @param argv skriptga berilgan argumentlar (`--prod` shu yerdan izlanadi)
 */
export function connectDatabase(argv: string[]): DatabaseTarget {
  const isProduction = argv.includes('--prod');

  let connectionString: string | undefined;

  if (isProduction) {
    if (!fs.existsSync(PRODUCTION_ENV_PATH)) {
      console.error('❌ ".env.production" fayli topilmadi.');
      console.error('   Avval sozlamalarni yozing:  npm run env:setup\n');
      process.exit(1);
    }

    const env = readEnvFile(PRODUCTION_ENV_PATH);

    /**
     * Migratsiya emas, oddiy so'rov — shuning uchun `DATABASE_URL`
     * (pooler) yetarli. `DIRECT_URL` faqat zaxira sifatida.
     */
    connectionString = env.DATABASE_URL ?? env.DIRECT_URL;

    if (!connectionString) {
      console.error('❌ ".env.production" da DATABASE_URL yo\'q.');
      console.error('   Qaytadan yozing:  npm run env:setup\n');
      process.exit(1);
    }

    if (/localhost|127\.0\.0\.1/.test(connectionString)) {
      console.error('❌ ".env.production" dagi DATABASE_URL lokal bazaga qarab turibdi.');
      console.error('   Bulutdagi baza manzilini yozing:  npm run env:setup\n');
      process.exit(1);
    }
  } else {
    connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      console.error('❌ DATABASE_URL topilmadi. ".env" faylini tekshiring.\n');
      process.exit(1);
    }
  }

  // Qaysi bazaga tegayotganimiz HAR DOIM ko'rinadi.
  console.info(
    `\n${isProduction ? '☁️  BULUTDAGI' : '💻 Lokal'} baza: ${describeTarget(connectionString)}\n`,
  );

  return {
    prisma: new PrismaClient({ adapter: new PrismaPg({ connectionString }) }),
    isProduction,
  };
}

/**
 * Argumentlardan bayroqlarni olib tashlaydi.
 *
 * Shunda skriptlar `--prod` ni telefon raqami deb o'ylamaydi.
 */
export function stripFlags(argv: string[]): string[] {
  return argv.filter((item) => !item.startsWith('--'));
}
