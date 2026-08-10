import { readFileSync, existsSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/**
 * Oxirgi SMS tasdiqlash kodini topib beradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * `SMS_PROVIDER=console` bo'lganda haqiqiy SMS yuborilmaydi — kod
 * server logiga yoziladi. Uni qo'lda qidirish noqulay, ayniqsa
 * telefonda.
 *
 * ── Ikki rejim ────────────────────────────────────────────────────────
 *   npm run otp            — lokal server logidan (dev.log)
 *   npm run otp -- --prod  — Vercel'dagi saytning logidan
 *
 * ── Nima uchun bazadan o'qib bo'lmaydi ────────────────────────────────
 * Kod Redis'ga HASH ko'rinishida yoziladi (`otp.service.ts`). Bu
 * ataylab: baza o'g'irlansa ham kodlar foydasiz bo'ladi. Shuning uchun
 * yagona manba — server logi.
 */

const LOG_FILE = 'dev.log';
const ENV_FILE = '.env.production';

/** Log'dagi "... kodi 123456 ..." qatoridan 6 xonali kodni ajratadi. */
const CODE_PATTERN = /kodi (\d{6})/g;

const useProduction = process.argv.includes('--prod');

/** Matndan ENG OXIRGI kodni ajratadi. */
function findLatestCode(text) {
  const matches = [...text.matchAll(CODE_PATTERN)];
  return matches.length > 0 ? matches[matches.length - 1][1] : null;
}

function show(code, source) {
  console.info('\n📩 Oxirgi tasdiqlash kodi:\n');
  console.info(`   ${code}\n`);
  console.info(`   Manba: ${source}\n`);
}

/**
 * Kodning umri (soniyalarda) — `.env` dan.
 *
 * Sozlama o'zgarsa ogohlantirish ham o'ziga qarab o'zgarishi kerak:
 * bu yerda qattiq son yozilsa, ular bir-biridan ajralib ketardi.
 */
function readOtpTtlSeconds() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue;

    const line = readFileSync(file, 'utf8')
      .split('\n')
      .find((row) => row.trim().startsWith('OTP_TTL='));

    if (!line) continue;

    const value = Number(line.slice(line.indexOf('=') + 1).replace(/["']/g, '').trim());

    if (Number.isFinite(value) && value > 0) return value;
  }

  // `src/lib/env.ts` dagi standart qiymat.
  return 300;
}

/** "125" → "2 daqiqa 5 soniya". */
function formatAge(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return minutes > 0 ? `${minutes} daqiqa ${rest} soniya` : `${rest} soniya`;
}

function fail(message, hint) {
  console.info(`\n❌ ${message}\n`);
  if (hint) console.info(`${hint}\n`);
  process.exit(1);
}

// ── Production: Vercel loglari ────────────────────────────────────────

if (useProduction) {
  if (!existsSync(ENV_FILE)) {
    fail(`"${ENV_FILE}" topilmadi`, '   Avval sozlamalarni yozing:  npm run env:setup');
  }

  const appUrl = readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .find((line) => line.trim().startsWith('NEXT_PUBLIC_APP_URL='));

  if (!appUrl) {
    fail(`"${ENV_FILE}" da NEXT_PUBLIC_APP_URL yo'q`, '   npm run env:setup');
  }

  // "NEXT_PUBLIC_APP_URL=https://navix-iota.vercel.app" → "navix-iota.vercel.app"
  const host = appUrl
    .slice(appUrl.indexOf('=') + 1)
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  /**
   * Urinishlar tartibi MUHIM.
   *
   * Avval MANZILSIZ so'raymiz: bunda Vercel bog'langan loyihaning
   * o'zining oxirgi deploy'ini oladi. Bu eng ishonchli yo'l, chunki
   * hech narsani taxmin qilmaydi.
   *
   * Faqat u ishlamasa `.env.production` dagi manzilga murojaat
   * qilamiz. Aks holda o'sha manzil eskirgan bo'lsa (masalan Vercel
   * boshqa manzil bergan bo'lsa) skript butunlay ishlamay qolardi —
   * aynan shunday xato uchradi.
   *
   * `--json` ham MUHIM: usiz Vercel CLI xabarni terminal kengligiga
   * qarab qisqartiradi va kod aynan kesilgan qismda qolib ketadi
   * ("{"level":…"). JSON rejimida to'liq matn keladi.
   */
  const attempts = [
    { label: 'bog\'langan loyiha', args: ['vercel', 'logs', '--json'] },
    { label: host, args: ['vercel', 'logs', host, '--json'] },
    { label: host, args: ['vercel', 'logs', host] },
  ];

  let output = '';
  let usedLabel = host;

  for (const attempt of attempts) {
    console.info(`\n⏳ ${attempt.label} loglari o'qilmoqda...`);

    const result = spawnSync('npx', attempt.args, { encoding: 'utf8', timeout: 90_000 });

    output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    usedLabel = attempt.label;

    if (findLatestCode(output)) break;
  }

  const code = findLatestCode(output);

  if (!code) {
    if (/isn't linked|not linked/.test(output)) {
      fail(
        "Loyiha Vercel bilan bog'lanmagan",
        '   Bir marta bajaring:  npx vercel link',
      );
    }

    fail(
      'Kod topilmadi',
      `   Tekshirilgan manzil: ${host}\n\n` +
        "   Sabablari:\n" +
        "   1. Vercel loglari qisqa muddat saqlanadi. Saytda \"Yangi kod\n" +
        '      so\'rash" tugmasini bosing va DARHOL buyruqni qaytaring.\n' +
        `   2. ".env.production" dagi NEXT_PUBLIC_APP_URL noto'g'ri bo'lishi\n` +
        '      mumkin. Haqiqiy manzilni bilish uchun:  npx vercel ls\n' +
        '      Tuzatish uchun:  npm run env:setup',
    );
  }

  show(code, usedLabel);
  process.exit(0);
}

// ── Lokal: dev.log ────────────────────────────────────────────────────

let content;

try {
  content = readFileSync(LOG_FILE, 'utf8');
} catch {
  fail(
    `"${LOG_FILE}" topilmadi`,
    '   Lokal server uchun:  npm run dev:bg\n' +
      '   Internetdagi sayt uchun:  npm run otp -- --prod',
  );
}

const code = findLatestCode(content);

if (!code) {
  fail(
    'Kod topilmadi',
    "   Avval saytda ro'yxatdan o'ting yoki parolni tiklashni so'rang.\n" +
      '   Internetdagi sayt uchun:  npm run otp -- --prod',
  );
}

/**
 * Log ESKI bo'lsa ogohlantiramiz.
 *
 * ── Qanday tuzoq bo'lgan edi ──────────────────────────────────────────
 * `npm run dev` serverni EKRANGA yozadi, `dev.log` ga emas. Faqat
 * `npm run dev:bg` shu faylga yozadi.
 *
 * Shu sababli oldingi sessiyadan qolgan `dev.log` joyida turaverardi
 * va skript har safar bir XIL, allaqachon muddati o'tgan kodni
 * qaytaraverardi. Saytda esa "Kod noto'g'ri yoki muddati tugagan"
 * chiqardi — sabab esa hech qayerda ko'rinmasdi.
 *
 * Endi fayl qachon yangilangani tekshiriladi.
 */
const ageSeconds = Math.round((Date.now() - statSync(LOG_FILE).mtimeMs) / 1_000);
const ttlSeconds = readOtpTtlSeconds();

if (ageSeconds > ttlSeconds) {
  console.info(`\n⚠️  "${LOG_FILE}" ${formatAge(ageSeconds)} oldin yangilangan.\n`);
  console.info(`   Kod umri ${Math.round(ttlSeconds / 60)} daqiqa, ya'ni bu kod ALLAQACHON ESKIRGAN.\n`);
  console.info('   Sabab: server logni bu faylga yozmayapti.\n');
  console.info('   Tuzatish:\n');
  console.info('     1. npm run dev:stop\n');
  console.info('     2. npm run dev:bg        ← "dev.log" ga yozadigan rejim\n');
  console.info('     3. Saytda "Yangi kod" tugmasini bosing\n');
  console.info('     4. npm run otp\n');
  console.info('   Internetdagi sayt (vercel) uchun:  npm run otp -- --prod\n');

  process.exit(1);
}

show(code, `${LOG_FILE} (${formatAge(ageSeconds)} oldin)`);
