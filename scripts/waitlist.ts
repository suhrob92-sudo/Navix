// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import { connectDatabase } from './lib/db-target';
import { formatUzPhone } from '../src/lib/phone';

/**
 * Navbatdagilar ro'yxatini ko'rsatadi va CSV faylga yozadi.
 *
 * ── Nima uchun bu skript kerak ────────────────────────────────────────
 * Navbat sahifasi raqamlarni yig'adi, lekin ular bazada qolib ketsa
 * foydasi yo'q: ilova ochilganda ularga SMS yuborish kerak bo'ladi.
 * Bu skript ro'yxatni telefondan ham ko'rish va yuklab olish imkonini
 * beradi.
 *
 * Buyruqlar:
 *
 *     npm run waitlist                 # lokal baza, oxirgi 20 ta
 *     npm run waitlist -- --all        # hammasi
 *     npm run waitlist -- --csv        # navbat.csv fayliga yozadi
 *     npm run waitlist -- --prod --csv # BULUTDAGI bazadan
 *
 * ── Nima uchun CSV ────────────────────────────────────────────────────
 * SMS yuboradigan xizmatlar (Eskiz va boshqalar) aynan shu ko'rinishni
 * qabul qiladi va uni Excel ham ochadi.
 */

const CSV_PATH = path.join(process.cwd(), 'navbat.csv');

/**
 * CSV katagini xavfsiz qiladi.
 *
 * Vergul yoki qo'shtirnoq bo'lgan matn qo'shtirnoqqa olinadi, ichkaridagi
 * qo'shtirnoq esa ikkilantiriladi — aks holda ustunlar siljib ketardi.
 */
function toCsvCell(value: string | null): string {
  const text = value ?? '';

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const showAll = argv.includes('--all');
  const wantsCsv = argv.includes('--csv');

  const { prisma } = connectDatabase(argv);

  try {
    const total = await prisma.waitlistEntry.count();

    if (total === 0) {
      console.info("\nNavbat hozircha bo'sh.\n");
      return;
    }

    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { position: 'asc' },
      ...(showAll || wantsCsv ? {} : { take: 20, skip: Math.max(0, total - 20) }),
      select: { position: true, phone: true, name: true, city: true, source: true, createdAt: true },
    });

    console.info(`\n📋 Navbatda ${total} ta odam bor.\n`);

    for (const entry of entries.slice(-20)) {
      const parts = [
        String(entry.position).padStart(4, ' '),
        formatUzPhone(entry.phone).padEnd(17, ' '),
        (entry.name ?? '—').padEnd(16, ' '),
        (entry.city ?? '—').padEnd(12, ' '),
        entry.source ?? '—',
      ];

      console.info(`  ${parts.join(' ')}`);
    }

    if (!showAll && !wantsCsv && total > 20) {
      console.info(`\n  … oxirgi 20 tasi ko'rsatildi. Hammasi uchun: npm run waitlist -- --all`);
    }

    // Manbalar bo'yicha hisob — reklama qayerda ishlayotganini ko'rsatadi.
    const bySource = await prisma.waitlistEntry.groupBy({ by: ['source'], _count: { _all: true } });

    console.info('\n  Manbalar:');
    for (const row of bySource.sort((a, b) => b._count._all - a._count._all)) {
      console.info(`    ${(row.source ?? "noma'lum").padEnd(12, ' ')} ${row._count._all}`);
    }

    if (wantsCsv) {
      const header = 'position,phone,name,city,source,createdAt';
      const lines = entries.map((entry) =>
        [
          String(entry.position),
          entry.phone,
          toCsvCell(entry.name),
          toCsvCell(entry.city),
          toCsvCell(entry.source),
          entry.createdAt.toISOString(),
        ].join(','),
      );

      fs.writeFileSync(CSV_PATH, `${[header, ...lines].join('\n')}\n`, 'utf8');
      console.info(`\n💾 ${CSV_PATH} fayliga yozildi (${entries.length} ta yozuv).`);
    }

    console.info('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Xatolik:', error instanceof Error ? error.message : error);
  process.exit(1);
});
