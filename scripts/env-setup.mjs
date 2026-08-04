/**
 * ".env.production" faylini savol-javob bilan to'g'ri yozadi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Telefonda `nano` bilan uzun ulanish manzillarini tahrirlash juda
 * noqulay: qator ekranga sig'maydi, kursor sakraydi, nusxalashda
 * ortiqcha belgilar qo'shilib ketadi.
 *
 * Amalda uchragan xatolar:
 *   DATABASE_URL="<postgresql://...>"        ← qavslar qolib ketgan
 *   REDIS_URL="REDIS_URL="rediss://..."      ← nomi ikki marta
 *   JWT_ACCESS_SECRET=" abc "                ← ortiqcha probel
 *
 * Bu skript har bir qiymatni tozalaydi, tekshiradi va faylni o'zi
 * yozadi. JWT kalitlarini esa umuman so'ramaydi — ularni o'zi yaratadi.
 *
 * ── Xavfsizlik ────────────────────────────────────────────────────────
 * Fayl faqat egasi o'qiy oladigan qilib yoziladi (chmod 600) va
 * ".gitignore" tufayli Git'ga hech qachon tushmaydi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run env:setup
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { pathToFileURL } from 'node:url';

const TARGET = path.resolve(process.cwd(), '.env.production');

/**
 * Nusxalashda qo'shilib ketadigan ortiqcha narsalarni olib tashlaydi.
 *
 * Tartib muhim: avval nomi ("REDIS_URL=") olib tashlanadi, keyin
 * qo'shtirnoq, keyin qavslar. Aks holda ichma-ich joylashgan
 * belgilarning bittasi qolib ketadi.
 */
export function cleanValue(raw, key) {
  let value = raw.trim();

  // Bir necha marta takrorlangan bo'lishi mumkin: KEY="KEY="qiymat""
  for (let pass = 0; pass < 4; pass += 1) {
    const before = value;

    // 1. Boshidagi "KEY=" qismi
    value = value.replace(new RegExp(`^${key}\\s*=\\s*`, 'i'), '');

    // 2. Ikkala uchidagi qo'shtirnoq
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    }

    // 3. Namunadan qolgan burchakli qavslar
    if (value.startsWith('<') && value.endsWith('>') && value.length > 1) {
      value = value.slice(1, -1);
    }

    // 4. Yopilmagan qo'shtirnoq (nusxalash yarim qolganda)
    value = value.replace(/^["'<]+/, '').replace(/["'>]+$/, '');

    value = value.trim();

    if (value === before) break;
  }

  return value;
}

/** Yangi maxfiy kalit — har safar boshqacha. */
function generateSecret() {
  return crypto.randomBytes(48).toString('base64');
}

const FIELDS = [
  {
    key: 'DATABASE_URL',
    title: 'Neon baza manzili',
    hint: 'Neon → Connect → Copy snippet.  "postgresql://" bilan boshlanadi.',
    validate: (value) =>
      value.startsWith('postgresql://') || value.startsWith('postgres://')
        ? null
        : '"postgresql://" bilan boshlanishi kerak',
  },
  {
    key: 'REDIS_URL',
    title: 'Upstash Redis manzili',
    hint: 'Upstash → Connect → TCP tab.  "rediss://" bilan boshlanadi (ikkita s).',
    validate: (value) => {
      if (value.startsWith('rediss://')) return null;
      if (value.startsWith('redis://')) {
        return "Bu REST yoki redis-cli manzili. Upstash'da 'TCP' tabini oching — u 'rediss://' beradi";
      }
      return '"rediss://" bilan boshlanishi kerak';
    },
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    title: 'Sayt manzili',
    hint: "Vercel bergan manzil. Hali bilmasangiz — Enter bosing, keyin o'zgartirasiz.",
    fallback: 'https://navix.vercel.app',
    validate: (value) => (value.startsWith('https://') ? null : '"https://" bilan boshlanishi kerak'),
  },
];

/**
 * Savol-javob oynasi FAQAT kerak bo'lganda ochiladi.
 *
 * Testlar bu fayldan `cleanValue` ni import qiladi. Agar oyna modul
 * yuklanishida ochilsa, testlar terminalni band qilib qo'yardi.
 */
let rl = null;

function prompt() {
  rl ??= readline.createInterface({ input: stdin, output: stdout });
  return rl;
}

/** Bitta qiymatni to'g'ri kiritilgunicha so'raydi. */
async function askField(field) {
  console.info(`\n── ${field.title} ${'─'.repeat(Math.max(0, 50 - field.title.length))}`);
  console.info(`   ${field.hint}\n`);

  for (;;) {
    const answer = await prompt().question('   > ');
    const value = cleanValue(answer, field.key);

    if (value === '' && field.fallback) {
      console.info(`   ℹ️  Hozircha: ${field.fallback}`);
      return field.fallback;
    }

    if (value === '') {
      console.info("   ❌ Bo'sh qoldirib bo'lmaydi. Qaytadan urinib ko'ring.\n");
      continue;
    }

    const problem = field.validate(value);

    if (problem) {
      console.info(`   ❌ ${problem}\n`);
      continue;
    }

    // Nima yozilganini ko'rsatamiz, lekin parolni yashirib.
    console.info(`   ✅ ${hidePassword(value)}`);
    return value;
  }
}

/** Ekranga chiqarishda parolni yashiradi — skrinshot yuborilsa ham xavfsiz. */
function hidePassword(url) {
  return url.replace(/:\/\/([^:/@]+):[^@]*@/, '://$1:•••@');
}

async function main() {
  console.info('\n═══ Production sozlamalarini yozish ═══');
  console.info('\nHar bir manzilni nusxalab, shu yerga tashlang.');
  console.info("Ortiqcha qavs yoki qo'shtirnoq bo'lsa — o'zim tozalayman.");

  if (fs.existsSync(TARGET)) {
    console.info('\n⚠️  ".env.production" allaqachon bor va QAYTA YOZILADI.');
    const answer = await prompt().question('   Davom etamizmi? (ha / yo\'q): ');

    if (!/^(ha|h|yes|y)$/i.test(answer.trim())) {
      console.info('\n   Bekor qilindi. Hech narsa o\'zgarmadi.\n');
      prompt().close();
      return;
    }
  }

  const values = {};

  for (const field of FIELDS) {
    values[field.key] = await askField(field);
  }

  prompt().close();

  /**
   * Migratsiya uchun to'g'ridan-to'g'ri manzil.
   *
   * Neon'da u pooled manzildan faqat "-pooler" so'zi bilan farq qiladi.
   * Foydalanuvchidan alohida so'rasak — chalkashtirish ehtimoli katta,
   * shuning uchun o'zimiz hosil qilamiz. To'g'riligini keyin
   * `npm run deploy:check` haqiqiy ulanish bilan tekshiradi.
   */
  const directUrl = values.DATABASE_URL.includes('-pooler')
    ? values.DATABASE_URL.replace('-pooler', '')
    : null;

  const lines = [
    '# Production sozlamalari — "npm run env:setup" tomonidan yozilgan.',
    '#',
    '# BU FAYLNI HECH KIMGA YUBORMANG va Git\'ga qo\'shmang.',
    '# (.gitignore uni allaqachon chetlab o\'tadi.)',
    '',
    `DATABASE_URL="${values.DATABASE_URL}"`,
    ...(directUrl ? ['', '# Migratsiya uchun — pooled manzildan "-pooler"siz.', `DIRECT_URL="${directUrl}"`] : []),
    '',
    `REDIS_URL="${values.REDIS_URL}"`,
    '',
    '# Har ishga tushirishda yangidan yaratildi.',
    `JWT_ACCESS_SECRET="${generateSecret()}"`,
    `JWT_REFRESH_SECRET="${generateSecret()}"`,
    '',
    `NEXT_PUBLIC_APP_URL="${values.NEXT_PUBLIC_APP_URL}"`,
    'NEXT_PUBLIC_APP_NAME="Navix"',
    '',
    'SMS_PROVIDER=console',
    'NODE_ENV=production',
    '',
  ];

  // Faqat egasi o'qiy oladi.
  fs.writeFileSync(TARGET, lines.join('\n'), { mode: 0o600 });

  console.info('\n' + '─'.repeat(56));
  console.info('\n✅ ".env.production" yozildi\n');
  console.info('   • JWT kalitlari yangidan yaratildi (siz yozishingiz shart emas)');

  if (directUrl) {
    console.info('   • DIRECT_URL avtomatik hosil qilindi');
  }

  console.info('   • Faylni faqat siz o\'qiy olasiz\n');
  console.info('   Endi tekshiring:\n');
  console.info('      npm run deploy:check\n');
}

/**
 * Faqat to'g'ridan-to'g'ri ishga tushirilganda bajariladi.
 * Testlar `cleanValue` ni import qilganda savol berilmasligi kerak.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    rl?.close();
    console.error('\n❌ Bajarilmadi:', error.message, '\n');
    process.exitCode = 1;
  });
}
