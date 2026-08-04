/**
 * Vercel'ga qo'yiladigan o'zgaruvchilarni tayyor ko'rinishda chiqaradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Vercel'ning "Environment Variables" bo'limi butun `.env` matnini
 * bir marta qabul qila oladi: birinchi katakka tashlasangiz, u o'zi
 * qatorlarga ajratadi. Telefonda bu 8 marta yozib o'tirishdan ancha
 * qulay.
 *
 * Lekin `.env.production` ni to'g'ridan-to'g'ri ko'chirib bo'lmaydi:
 *
 *  · `NODE_ENV` — Vercel uni O'ZI qo'yadi. Qo'lda qo'shilsa build
 *    paytida ogohlantirish beradi va chalkashlik tug'diradi.
 *  · Izoh qatorlari ("# ...") — keraksiz.
 *
 * Bu skript ularni chiqarib tashlaydi va faqat kerakli qatorlarni
 * beradi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run deploy:vars
 */

import fs from 'node:fs';
import path from 'node:path';

const ENV_PATH = path.join(process.cwd(), '.env.production');

/** Vercel o'zi boshqaradigan o'zgaruvchilar — qo'lda qo'shilmaydi. */
const MANAGED_BY_VERCEL = new Set(['NODE_ENV', 'PORT', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL']);

if (!fs.existsSync(ENV_PATH)) {
  console.info('\n❌ ".env.production" topilmadi\n');
  console.info('   Avval sozlamalarni yozing:  npm run env:setup\n');
  process.exit(1);
}

const lines = fs
  .readFileSync(ENV_PATH, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .filter((line) => {
    const key = line.slice(0, line.indexOf('='));
    return !MANAGED_BY_VERCEL.has(key);
  });

if (lines.length === 0) {
  console.info('\n❌ ".env.production" bo\'sh\n');
  process.exit(1);
}

console.info('\n═══ Vercel uchun o\'zgaruvchilar ═══\n');
console.info('   Quyidagi matnni TO\'LIQ nusxalang va Vercel\'dagi');
console.info('   "Environment Variables" bo\'limining BIRINCHI katagiga tashlang.');
console.info('   Vercel uni o\'zi qatorlarga ajratadi.\n');
console.info('   ⚠️  Bu matnda parollar bor — SKRINSHOT QILIB YUBORMANG.\n');
console.info('─'.repeat(56));
console.info('');

for (const line of lines) {
  console.info(line);
}

console.info('');
console.info('─'.repeat(56));
console.info(`\n   ${lines.length} ta o'zgaruvchi.\n`);
console.info('   NODE_ENV qo\'shilmadi — uni Vercel o\'zi qo\'yadi.\n');
