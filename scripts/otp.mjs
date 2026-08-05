import { readFileSync, existsSync } from 'node:fs';
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

show(code, LOG_FILE);
