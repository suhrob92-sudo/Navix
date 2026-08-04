/**
 * ".env.production" dagi qiymatlarni Vercel'ga TERMINALDAN yuboradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Vercel'ning "Environment Variables" bo'limiga butun `.env` matnini
 * bir marta tashlash mumkin — lekin FAQAT kompyuterda. Telefonda
 * Android klaviaturasi qator ajratgichlarini probelga aylantiradi va
 * 8 ta qator bitta katakka tushib qoladi:
 *
 *     DsrvtOMR" JWT_REFRESH_SECRET="NZI...
 *
 * Qolgan yo'l — 8 marta qo'lda kiritish. Har safar Termux va brauzer
 * orasida sakrash kerak, uzun qiymatni belgilash esa alohida azob.
 *
 * Bu skript hammasini bitta buyruq bilan yuboradi. Qo'shimcha foyda:
 * parollar EKRANDA UMUMAN KO'RINMAYDI — ular fayldan to'g'ridan-to'g'ri
 * Vercel'ga uzatiladi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npx vercel login      (bir marta)
 *   npx vercel link       (bir marta — loyihani tanlaysiz)
 *   npm run deploy:push-env
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.production');
const LINK_PATH = path.join(ROOT, '.vercel', 'project.json');

/** Vercel o'zi boshqaradi — qo'lda yuborilmaydi. */
const MANAGED_BY_VERCEL = new Set(['NODE_ENV', 'PORT', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL']);

/**
 * Qaysi muhitlarga yuboriladi.
 *
 * "production" — asosiy sayt; "preview" — har bir tarmoq uchun
 * alohida nusxa. Ikkalasiga ham yuboramiz, aks holda tarmoqdagi
 * sinov nusxasi ishlamaydi va sababi tushunarsiz bo'ladi.
 */
const ENVIRONMENTS = ['production', 'preview'];

function fail(message, hint) {
  console.info(`\n❌ ${message}\n`);
  if (hint) console.info(`${hint}\n`);
  process.exit(1);
}

// ── 1. Tekshiruvlar ───────────────────────────────────────────────────

if (!fs.existsSync(ENV_PATH)) {
  fail('".env.production" topilmadi', '   Avval sozlamalarni yozing:  npm run env:setup');
}

if (!fs.existsSync(LINK_PATH)) {
  fail(
    'Loyiha Vercel bilan bog\'lanmagan',
    '   Ikkita buyruqni bir marta bajaring:\n\n' +
      '      npx vercel login\n' +
      '      npx vercel link\n\n' +
      "   `link` sizdan loyihani so'raydi — ro'yxatdan `navix` ni tanlang.\n" +
      '   Keyin qaytadan:  npm run deploy:push-env',
  );
}

// ── 2. Qiymatlarni o'qiymiz ───────────────────────────────────────────

const variables = [];

for (const rawLine of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
  const line = rawLine.trim();

  if (!line || line.startsWith('#')) continue;

  const equals = line.indexOf('=');
  if (equals === -1) continue;

  const key = line.slice(0, equals).trim();
  let value = line.slice(equals + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  if (MANAGED_BY_VERCEL.has(key) || value === '') continue;

  variables.push({ key, value });
}

if (variables.length === 0) {
  fail('".env.production" da yuboriladigan qiymat yo\'q');
}

console.info('\n═══ Vercel\'ga o\'zgaruvchilarni yuborish ═══\n');
console.info(`   ${variables.length} ta o'zgaruvchi · ${ENVIRONMENTS.join(' va ')} muhitlari uchun\n`);

// ── 3. Yuborish ───────────────────────────────────────────────────────

/**
 * Vercel CLI mavjud qiymatni QAYTA YOZMAYDI — "already exists" deb
 * xato beradi. Shuning uchun avval o'chiramiz. O'chirish muvaffaqiyatsiz
 * bo'lsa (qiymat umuman yo'q edi) — bu normal holat, davom etamiz.
 */
function removeExisting(key, environment) {
  spawnSync('npx', ['vercel', 'env', 'rm', key, environment, '--yes'], {
    stdio: ['ignore', 'ignore', 'ignore'],
  });
}

/** Qiymat STDIN orqali uzatiladi — buyruq satrida ko'rinmaydi. */
function push(key, value, environment) {
  return spawnSync('npx', ['vercel', 'env', 'add', key, environment], {
    input: value,
    stdio: ['pipe', 'ignore', 'pipe'],
    encoding: 'utf8',
  });
}

let sent = 0;
const failures = [];

for (const { key, value } of variables) {
  for (const environment of ENVIRONMENTS) {
    removeExisting(key, environment);

    const result = push(key, value, environment);

    if (result.status === 0) {
      sent += 1;
    } else {
      const reason = (result.stderr ?? '').trim().split('\n').pop() ?? "noma'lum xato";
      failures.push({ key, environment, reason });
    }
  }

  // Parol EKRANGA CHIQMAYDI — faqat nomi.
  console.info(`   ${failures.some((f) => f.key === key) ? '❌' : '✅'} ${key}`);
}

// ── 4. Yakun ──────────────────────────────────────────────────────────

console.info(`\n${'─'.repeat(56)}`);

if (failures.length === 0) {
  console.info(`\n✅ ${sent} ta qiymat yuborildi\n`);
  console.info('   Endi saytni qaytadan yig\'ish kerak:\n');
  console.info('      npx vercel --prod\n');
  console.info('   yoki Vercel sahifasida: Deployments → oxirgisi → Redeploy\n');
} else {
  console.info(`\n⚠️  ${failures.length} ta qiymat yuborilmadi:\n`);

  for (const failure of failures) {
    console.info(`   • ${failure.key} (${failure.environment})`);
    console.info(`     ${failure.reason}\n`);
  }

  console.info('   Kirganingizni tekshiring:  npx vercel whoami\n');
  process.exitCode = 1;
}
