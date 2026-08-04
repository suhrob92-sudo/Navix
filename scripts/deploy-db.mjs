/**
 * Bulutdagi bazaga jadval va boshlang'ich ma'lumotlarni yozadi.
 *
 * ── Nima uchun alohida skript kerak ───────────────────────────────────
 * Oddiygina `prisma migrate deploy` xavfli edi: Prisma `.env` faylini
 * o'qiydi, unda esa LOKAL baza manzili turadi. Ya'ni "bulutdagi bazani
 * tayyorlayapman" deb o'ylab, aslida codespace'dagi bazani
 * o'zgartirgan bo'lardingiz — va hech qanday xato chiqmasdi.
 *
 * Buni chetlab o'tish uchun terminalda:
 *
 *     set -a && source .env.production && set +a
 *
 * degan qatorni yozish kerak edi. Telefonda buni har safar to'g'ri
 * yozish — xatoga chaqiriq.
 *
 * Endi skript ".env.production" ni O'ZI o'qiydi, qaysi bazaga
 * yozayotganini EKRANDA ko'rsatadi va shundan keyingina bajaradi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run deploy:db
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.production');

/** ".env" ko'rinishidagi faylni o'qiydi. */
function readEnvFile(filePath) {
  const values = {};

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
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

    values[key] = value;
  }

  return values;
}

/** Ulanish satridan faqat manzilni ajratadi — parol ekranga chiqmasin. */
function describeTarget(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "noma'lum manzil";
  }
}

function fail(message, hint) {
  console.info(`\n❌ ${message}\n`);
  if (hint) console.info(`   ${hint}\n`);
  process.exit(1);
}

// ── 1. Sozlamalar ─────────────────────────────────────────────────────

if (!fs.existsSync(ENV_PATH)) {
  fail('".env.production" fayli topilmadi', 'Avval sozlamalarni yozing:  npm run env:setup');
}

const env = readEnvFile(ENV_PATH);

if (!env.DATABASE_URL) {
  fail('".env.production" da DATABASE_URL yo\'q', 'Qaytadan yozing:  npm run env:setup');
}

if (/localhost|127\.0\.0\.1/.test(env.DATABASE_URL)) {
  fail(
    'DATABASE_URL lokal bazaga qarab turibdi',
    "Bu buyruq BULUTDAGI baza uchun. Lokal baza uchun:  npm run db:migrate",
  );
}

/**
 * Migratsiya "direct" manzil orqali bajarilishi kerak.
 * Sababi `prisma.config.ts` da yozilgan.
 */
const migrationUrl = env.DIRECT_URL ?? env.DATABASE_URL;

console.info('\n═══ Bulutdagi bazani tayyorlash ═══\n');
console.info(`   Baza:       ${describeTarget(env.DATABASE_URL)}`);
console.info(`   Migratsiya: ${describeTarget(migrationUrl)}`);
console.info(
  env.DIRECT_URL
    ? '\n   ℹ️  Migratsiya "direct" manzil orqali — shunday bo\'lishi kerak.\n'
    : '\n   ⚠️  DIRECT_URL yo\'q. Migratsiya "pooled" manzil orqali ketadi —\n' +
        '      bu ishonchsiz. "npm run deploy:check" tayyor qatorni aytadi.\n',
);

// ── 2. Bajarish ───────────────────────────────────────────────────────

/**
 * Bola jarayonga TO'LIQ muhitni beramiz.
 *
 * `.env.production` qiymatlari `process.env` ustiga qo'yiladi. Prisma
 * ichida `dotenv` `.env` ni o'qiydi, lekin u ALLAQACHON o'rnatilgan
 * qiymatlarni almashtirmaydi — shuning uchun bizniki ustun turadi.
 */
const childEnv = { ...process.env, ...env };

function run(label, command, args) {
  console.info(`   ⏳ ${label}...\n`);

  const result = spawnSync(command, args, { stdio: 'inherit', env: childEnv, shell: false });

  if (result.status !== 0) {
    fail(`${label} — bajarilmadi`, 'Yuqoridagi xato matnini menga ko\'rsating');
  }

  console.info('');
}

run('Jadvallar yaratilmoqda', 'npx', ['prisma', 'migrate', 'deploy']);
run("Boshlang'ich ma'lumotlar yozilmoqda", 'npx', ['tsx', 'prisma/seed.ts']);

// ── 3. Yakun ──────────────────────────────────────────────────────────

console.info('─'.repeat(56));
console.info('\n✅ Bulutdagi baza tayyor\n');
console.info('   Tekshirish uchun:\n');
console.info('      npm run deploy:check\n');
