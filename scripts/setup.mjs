import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Loyihani noldan ishga tayyorlaydi — bitta buyruq bilan.
 *
 * Nima qiladi:
 *  1. `.env` faylini namunadan yaratadi (agar yo'q bo'lsa);
 *  2. PostgreSQL va Redis konteynerlarini ko'taradi;
 *  3. Baza javob berishini kutadi (konteyner darhol tayyor bo'lmaydi);
 *  4. Jadvallarni yaratadi (migratsiya);
 *  5. Rollar va ruxsatlarni yozadi (seed).
 *
 * Ishlatish: npm run setup
 *
 * Skript "idempotent" — bir necha marta ishga tushirsa ham zarari yo'q.
 */

/** Baza tayyor bo'lishini shuncha marta tekshiramiz. */
const DB_MAX_ATTEMPTS = 15;
const DB_RETRY_DELAY_MS = 2000;

/** Buyruqni bajaradi va chiqishini terminalga ko'rsatadi. */
function run(command) {
  execSync(command, { stdio: 'inherit' });
}

/** Buyruqni jim bajaradi; xatolik bo'lsa `false` qaytaradi. */
function runQuiet(command) {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function step(number, text) {
  console.info(`\n[${number}/5] ${text}`);
}

// --- 1. Muhit fayli -------------------------------------------------------
step(1, 'Muhit fayli (.env)');

if (existsSync('.env')) {
  console.info('      Mavjud — tegilmadi.');
} else {
  copyFileSync('.env.example', '.env');
  console.info('      ✅ .env.example dan yaratildi.');
  console.info('      ⚠️  Production uchun JWT kalitlarini almashtiring!');
}

// --- 2. Baza va Redis -----------------------------------------------------
step(2, 'PostgreSQL va Redis konteynerlari');

try {
  run('docker compose up -d');
} catch {
  console.info('\n❌ Docker konteynerlarini koʻtarib boʻlmadi.');
  console.info('   Docker ishlayaptimi? Tekshiring:  docker ps\n');
  process.exit(1);
}

// --- 3. Baza tayyorligini kutish ------------------------------------------
step(3, 'Baza javob berishini kutish');

let isDatabaseReady = false;

for (let attempt = 1; attempt <= DB_MAX_ATTEMPTS; attempt += 1) {
  // Konteyner ishga tushgan bo'lsa ham PostgreSQL bir necha soniya
  // ichida tayyor bo'ladi — shuning uchun takroriy tekshiruv.
  if (runQuiet('docker compose exec -T postgres pg_isready -U navix -d navix')) {
    isDatabaseReady = true;
    console.info(`      ✅ Baza tayyor (${attempt}-urinish).`);
    break;
  }

  await sleep(DB_RETRY_DELAY_MS);
}

if (!isDatabaseReady) {
  console.info('\n❌ Baza javob bermadi.');
  console.info('   Log:  npm run docker:logs\n');
  process.exit(1);
}

// --- 4. Jadvallar ---------------------------------------------------------
step(4, 'Jadvallarni yaratish (migratsiya)');

try {
  run('npx prisma migrate deploy');
} catch {
  console.info('\n❌ Migratsiya bajarilmadi.\n');
  process.exit(1);
}

// --- 5. Boshlangʻich maʼlumotlar ------------------------------------------
step(5, 'Rollar va ruxsatlarni yozish');

try {
  run('npm run db:seed');
} catch {
  console.info('\n❌ Seed bajarilmadi.\n');
  process.exit(1);
}

console.info('\n🎉 Tayyor! Ilovani ishga tushirish uchun:\n');
console.info('   npm run go\n');
