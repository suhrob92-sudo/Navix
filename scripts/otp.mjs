import { readFileSync } from 'node:fs';

/**
 * Oxirgi SMS tasdiqlash kodini log fayldan topib beradi.
 *
 * Nima uchun kerak: ishlab chiqish rejimida haqiqiy SMS yuborilmaydi —
 * kod terminalga yoziladi. Uzun log ichidan kodni qidirib o'tirmaslik uchun
 * shu skript oxirgisini o'zi topadi.
 *
 * Ishlatish: npm run otp
 * Shart: server `npm run dev:bg` bilan ishga tushirilgan bo'lishi kerak.
 */

const LOG_FILE = 'dev.log';

/** Log'dagi "... kodi 123456 ..." qatoridan 6 xonali kodni ajratadi. */
const CODE_PATTERN = /kodi (\d{6})/g;

let content;

try {
  content = readFileSync(LOG_FILE, 'utf8');
} catch {
  console.info(`\n❌ "${LOG_FILE}" topilmadi.\n`);
  console.info('   Avval serverni fonda ishga tushiring:  npm run dev:bg\n');
  process.exit(1);
}

const matches = [...content.matchAll(CODE_PATTERN)];

if (matches.length === 0) {
  console.info('\n❌ Kod topilmadi.\n');
  console.info("   Avval saytda ro'yxatdan o'ting yoki parolni tiklashni so'rang.\n");
  process.exit(1);
}

// Oxirgi kod — eng yangi so'rovga tegishli.
const latestCode = matches[matches.length - 1][1];

console.info(`\n📩 Oxirgi tasdiqlash kodi:\n`);
console.info(`   ${latestCode}\n`);
