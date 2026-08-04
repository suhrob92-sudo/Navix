/**
 * Kodni xavfsiz yangilaydi: tortadi va kutubxonalarni o'rnatadi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Oddiy `git pull` tez-tez shu xato bilan to'xtaydi:
 *
 *   error: Your local changes to the following files would be
 *   overwritten by merge:  package-lock.json
 *
 * Sababi shundaki, `npm install` `package-lock.json` ni QAYTA YOZADI —
 * bu fayl qo'lda tahrirlanmaydi, uni npm o'zi hosil qiladi. Ya'ni
 * yo'qotadigan ish yo'q, lekin git buni bilmaydi va to'xtaydi.
 *
 * Telefonda bu xatoni yechish uchun git buyruqlarini eslab yurish
 * kerak. Skript esa buni o'zi qiladi — LEKIN faqat hosil qilinadigan
 * fayllar uchun. Siz yozgan kod o'zgargan bo'lsa, u to'xtaydi va
 * ogohlantiradi: qo'lda yozilgan ishni hech qachon o'chirmaydi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run update
 */

import { execFileSync, spawnSync } from 'node:child_process';

/**
 * Qo'lda tahrirlanmaydigan, npm/asboblar hosil qiladigan fayllar.
 * Faqat SHULARNI tashlab yuborish xavfsiz.
 */
const GENERATED_FILES = new Set(['package-lock.json']);

/** Tarmoq uzilsa qayta urinishlar orasidagi kutish (soniya). */
const RETRY_DELAYS = [2, 4, 8, 16];

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options }).trim();
}

/**
 * `git status --porcelain` natijasidagi fayl nomlarini qaytaradi.
 *
 * ── Nima uchun alohida funksiya ───────────────────────────────────────
 * Har qator ikkita HOLAT belgisi bilan boshlanadi, ulardan biri probel
 * bo'lishi mumkin: " M fayl" (o'zgartirilgan), "M  fayl" (indeksga
 * qo'shilgan), "?? fayl" (yangi).
 *
 * Natijani `.trim()` qilib bo'lmaydi — u birinchi qatorning boshidagi
 * probelni ham olib tashlaydi va fayl nomining birinchi harfi kesilib
 * ketadi ("package.json" → "ackage.json"). Shuning uchun bu yerda
 * naqsh ishlatiladi, kesish emas.
 */
function listChangedFiles() {
  const raw = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });

  return raw
    .split('\n')
    .map((line) => line.match(/^(..)\s+(.+)$/))
    .filter((match) => match !== null)
    .map(([, state, file]) => ({ state, file: file.trim() }));
}

function fail(message, hint) {
  console.info(`\n❌ ${message}\n`);
  if (hint) console.info(`   ${hint}\n`);
  process.exit(1);
}

// ── 1. Qaysi tarmoqdamiz ──────────────────────────────────────────────

let branch;

try {
  branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
} catch {
  fail('Bu papka git ombori emas', 'Loyiha papkasida turganingizni tekshiring: cd /workspaces/Navix');
}

console.info(`\n═══ Kodni yangilash ═══\n`);
console.info(`   Tarmoq: ${branch}\n`);

// ── 2. O'zgargan fayllarni ko'ramiz ───────────────────────────────────

/**
 * Bizni faqat git KUZATAYOTGAN o'zgarishlar qiziqtiradi. Yangi fayllar
 * ("??" — masalan `.env.production`) merge'ga xalaqit bermaydi va
 * ularga tegmaymiz.
 */
const trackedChanges = listChangedFiles()
  .filter((entry) => entry.state !== '??')
  .map((entry) => entry.file);

const generated = trackedChanges.filter((file) => GENERATED_FILES.has(file));
const handwritten = trackedChanges.filter((file) => !GENERATED_FILES.has(file));

if (handwritten.length > 0) {
  console.info("   ⚠️  Quyidagi fayllarda SIZNING o'zgarishlaringiz bor:\n");

  for (const file of handwritten) {
    console.info(`      • ${file}`);
  }

  console.info('\n   Ularni yo\'qotib qo\'ymaslik uchun to\'xtadim.\n');
  console.info('   Ikki yo\'ldan birini tanlang:\n');
  console.info('      O\'zgarishlarni SAQLAB qolish:');
  console.info('         git stash');
  console.info('         npm run update');
  console.info('         git stash pop\n');
  console.info('      O\'zgarishlar KERAK EMAS bo\'lsa:');
  console.info(`         git checkout -- ${handwritten.join(' ')}`);
  console.info('         npm run update\n');
  process.exit(1);
}

if (generated.length > 0) {
  console.info(`   ℹ️  ${generated.join(', ')} — npm o'zi hosil qiladigan fayl, tashlab yuborildi\n`);
  git(['checkout', '--', ...generated]);
}

// ── 3. Tortamiz ───────────────────────────────────────────────────────

console.info('   ⏳ Yangi kod tortilmoqda...\n');

function pull() {
  return spawnSync('git', ['pull', 'origin', branch], { stdio: 'inherit' });
}

let pulled = pull();

for (const delay of RETRY_DELAYS) {
  if (pulled.status === 0) break;

  console.info(`\n   ⏳ Tarmoq uzildi. ${delay} soniyadan keyin qayta urinaman...\n`);

  // Boshqa yo'l yo'q: bu skript sinxron ishlaydi.
  spawnSync('sleep', [String(delay)]);
  pulled = pull();
}

if (pulled.status !== 0) {
  fail("Kodni tortib bo'lmadi", 'Internetni tekshirib, qaytadan urinib ko\'ring: npm run update');
}

// ── 4. Kutubxonalar ───────────────────────────────────────────────────

console.info('\n   ⏳ Kutubxonalar o\'rnatilmoqda...\n');

const installed = spawnSync('npm', ['install'], { stdio: 'inherit' });

if (installed.status !== 0) {
  fail("Kutubxonalarni o'rnatib bo'lmadi", 'Xato matnini menga ko\'rsating');
}

// ── 5. Yakun ──────────────────────────────────────────────────────────

const head = git(['log', '-1', '--pretty=%h %s']);

console.info(`\n${'─'.repeat(56)}`);
console.info('\n✅ Kod yangilandi\n');
console.info(`   Oxirgi o'zgarish: ${head}\n`);
console.info('   Baza sxemasi o\'zgargan bo\'lsa:');
console.info('      npx prisma migrate dev\n');
