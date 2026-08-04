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

  console.info(`\n⏳ ${host} loglari o'qilmoqda...`);

  /**
   * `--json` MUHIM: usiz Vercel CLI xabarni terminal kengligiga
   * qarab qisqartiradi va kod aynan kesilgan qismda qolib ketadi
   * ("{"level":…"). JSON rejimida esa to'liq matn keladi.
   */
  const attempts = [
    ['vercel', 'logs', host, '--json'],
    ['vercel', 'logs', host],
  ];

  let output = '';

  for (const args of attempts) {
    const result = spawnSync('npx', args, { encoding: 'utf8', timeout: 90_000 });

    output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

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
      "   Vercel loglari qisqa muddat saqlanadi. Saytda \"Yangi kod so'rash\"\n" +
        '   tugmasini bosing va DARHOL shu buyruqni qaytadan bajaring:\n\n' +
        '      npm run otp -- --prod',
    );
  }

  show(code, host);
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
