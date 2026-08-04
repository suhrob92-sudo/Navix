/**
 * Production'ga chiqarishdan OLDIN hamma narsani tekshiradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Vercel'da xato chiqsa, uni telefondan topish juda qiyin: log uzun,
 * ekran kichik, xato matni ingliz tilida va ko'pincha sababni
 * ko'rsatmaydi ("Internal Server Error").
 *
 * Shuning uchun barcha tekshiruvlar SHU YERDA, deploy'dan oldin
 * bajariladi va natija o'zbekcha, aniq qadamlar bilan yoziladi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run deploy:check
 *
 * Skript ".env.production" faylini o'qiydi (bo'lmasa ".env").
 * Ya'ni PRODUCTION qiymatlarini alohida faylga yozib, lokal ishingizni
 * buzmasdan tekshirasiz.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** Tekshiruv natijalari. */
const problems = [];
const warnings = [];
let checks = 0;

function ok(label, extra = '') {
  checks += 1;
  console.info(`  ✅ ${label}${extra ? ` — ${extra}` : ''}`);
}

function bad(label, fix) {
  checks += 1;
  problems.push({ label, fix });
  console.info(`  ❌ ${label}`);
}

function warn(label, note) {
  checks += 1;
  warnings.push({ label, note });
  console.info(`  ⚠️  ${label}`);
}

function head(title) {
  console.info(`\n${title}`);
}

// ── .env faylini o'qish ───────────────────────────────────────────────

/**
 * ".env" ko'rinishidagi faylni o'qiydi.
 *
 * Tashqi kutubxona ishlatmaymiz: bu skript `npm install` dan oldin ham
 * ishlashi mumkin bo'lishi kerak.
 */
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;

  const values = {};

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) continue;

    const equals = line.indexOf('=');
    if (equals === -1) continue;

    const key = line.slice(0, equals).trim();
    let value = line.slice(equals + 1).trim();

    // Qo'shtirnoqlarni olib tashlaymiz: KEY="qiymat" → qiymat
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

const productionEnvPath = path.join(ROOT, '.env.production');
const localEnvPath = path.join(ROOT, '.env');

const usingProduction = fs.existsSync(productionEnvPath);
const env = readEnvFile(usingProduction ? productionEnvPath : localEnvPath) ?? {};

console.info('\n═══ Production tayyorligini tekshirish ═══');
console.info(
  usingProduction
    ? '\nManba: .env.production'
    : "\nManba: .env  (⚠️  bu LOKAL sozlama — production uchun .env.production yarating)",
);

// ── 1. Majburiy o'zgaruvchilar ────────────────────────────────────────

head("1) Majburiy o'zgaruvchilar");

const REQUIRED = [
  {
    key: 'DATABASE_URL',
    check: (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    fix: 'Neon.tech da baza yarating va POOLED ulanish satrini nusxalang',
  },
  {
    key: 'REDIS_URL',
    check: (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
    fix: "Upstash.com da Redis yarating va ulanish satrini nusxalang (rediss:// bilan boshlanadi)",
  },
  {
    key: 'JWT_ACCESS_SECRET',
    check: (value) => value.length >= 32,
    fix: "Yangi kalit yarating:  openssl rand -base64 48",
  },
  {
    key: 'JWT_REFRESH_SECRET',
    check: (value) => value.length >= 32,
    fix: "Yangi kalit yarating:  openssl rand -base64 48",
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    check: (value) => value.startsWith('https://') || value.startsWith('http://'),
    fix: 'Vercel bergan manzilni yozing, masalan https://navix.vercel.app',
  },
];

for (const { key, check, fix } of REQUIRED) {
  const value = env[key];

  if (!value) {
    bad(`${key} — yo'q`, fix);
  } else if (!check(value)) {
    bad(`${key} — qiymati noto'g'ri`, fix);
  } else {
    ok(key, mask(key, value));
  }
}

/** Maxfiy qiymatlarni ekranga to'liq chiqarmaymiz. */
function mask(key, value) {
  if (key.startsWith('NEXT_PUBLIC_')) return value;
  if (key.includes('SECRET')) return `${value.length} belgi`;

  // Ulanish satridan parolni olib tashlaymiz.
  return value.replace(/\/\/[^@]*@/, '//***@').slice(0, 60);
}

// ── 2. Lokal qiymatlar production'ga tushib qolmaganmi ────────────────

head('2) Lokal qiymatlar qolib ketmaganmi');

const LOCALHOST_PATTERN = /localhost|127\.0\.0\.1/;

for (const key of ['DATABASE_URL', 'REDIS_URL', 'NEXT_PUBLIC_APP_URL']) {
  const value = env[key] ?? '';

  if (!value) continue;

  if (LOCALHOST_PATTERN.test(value)) {
    bad(
      `${key} hali "localhost" ga qarab turibdi`,
      'Vercel serveri sizning kompyuteringizga ulana olmaydi — bulutdagi manzilni yozing',
    );
  } else {
    ok(`${key} tashqi manzilga qarab turibdi`);
  }
}

const WEAK_SECRETS = ['bu-qiymatni-almashtiring', 'bu-qiymatni-ham-almashtiring', 'secret', 'changeme'];

for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
  const value = (env[key] ?? '').toLowerCase();

  if (WEAK_SECRETS.some((weak) => value.includes(weak))) {
    bad(`${key} — namunadagi qiymat qolib ketgan`, 'openssl rand -base64 48 bilan yangisini yarating');
  }
}

if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
  bad(
    'JWT_ACCESS_SECRET va JWT_REFRESH_SECRET bir xil',
    "Ular HAR XIL bo'lishi shart: aks holda qisqa muddatli token uzoq muddatlisi o'rniga ishlatilishi mumkin",
  );
}

// ── 3. Bazaga ulanish ─────────────────────────────────────────────────

head('3) Bazaga ulanish');

const databaseUrl = env.DATABASE_URL;

if (!databaseUrl || LOCALHOST_PATTERN.test(databaseUrl)) {
  console.info('  ⏭️  (manzil to\'g\'ri emas — o\'tkazib yuborildi)');
} else {
  await checkDatabase(databaseUrl, env.DIRECT_URL);
}

async function checkDatabase(url, directUrl) {
  let Client;

  try {
    ({ Client } = await import('pg'));
  } catch {
    warn("'pg' kutubxonasi topilmadi — ulanish tekshirilmadi", 'npm install bajaring');
    return;
  }

  const client = new Client({ connectionString: url, connectionTimeoutMillis: 15_000 });

  try {
    await client.connect();
    ok('Bazaga ulanish');

    // Migratsiyalar qo'llanganmi.
    const { rows } = await client.query(
      "SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public' AND table_name='users'",
    );

    if (rows[0].total === 0) {
      bad(
        "Jadvallar yo'q — migratsiya bajarilmagan",
        'npm run deploy:db  buyrug\'ini bajaring',
      );
      return;
    }

    ok('Jadvallar mavjud');

    // Seed bajarilganmi: rollarsiz hech kim ro'yxatdan o'ta olmaydi.
    const roles = await client.query('SELECT count(*)::int AS total FROM roles');

    if (roles.rows[0].total === 0) {
      bad(
        "Rollar yo'q — seed bajarilmagan",
        "npm run deploy:db  buyrug'ini bajaring (u seed'ni ham ishga tushiradi)",
      );
    } else {
      ok('Boshlang\'ich ma\'lumotlar yozilgan', `${roles.rows[0].total} ta rol`);
    }

    // Ulanish birlashtiruvchi (pooler) ishlatilyaptimi.
    if (!/pooler|pgbouncer|-pooler\./.test(url)) {
      warn(
        "DATABASE_URL 'pooled' manzilga o'xshamaydi",
        "Serverless'da har so'rov yangi ulanish ochadi va baza chegarasi tez tugaydi. " +
          "Neon'da 'Pooled connection' bandidagi manzilni oling.",
      );
    } else {
      ok('Pooled ulanish ishlatilyapti');
    }

    if (!directUrl) {
      warn(
        "DIRECT_URL berilmagan",
        "Migratsiya pooled manzil orqali ishonchsiz. Neon'dagi 'Direct connection' manzilini DIRECT_URL ga yozing.",
      );
    } else {
      ok('DIRECT_URL berilgan (migratsiya uchun)');
    }
  } catch (error) {
    bad(`Bazaga ulanib bo'lmadi: ${error.message}`, 'DATABASE_URL to\'g\'riligini tekshiring');
  } finally {
    await client.end().catch(() => {});
  }
}

// ── 4. Redis'ga ulanish ───────────────────────────────────────────────

head("4) Redis'ga ulanish");

const redisUrl = env.REDIS_URL;

if (!redisUrl || LOCALHOST_PATTERN.test(redisUrl)) {
  console.info("  ⏭️  (manzil to'g'ri emas — o'tkazib yuborildi)");
} else {
  await checkRedis(redisUrl);
}

async function checkRedis(url) {
  let Redis;

  try {
    ({ default: Redis } = await import('ioredis'));
  } catch {
    warn("'ioredis' kutubxonasi topilmadi — ulanish tekshirilmadi", 'npm install bajaring');
    return;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 15_000,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  /**
   * ioredis xatoni HAM `connect()` orqali, HAM alohida hodisa orqali
   * beradi. Ikkinchisini ushlamasak, ekranga tushunarsiz ingliz tilidagi
   * "Unhandled error event" chiqadi va bizning o'zbekcha xabarimizni
   * bosib ketadi.
   *
   * Ayni paytda BIRINCHI xatoni saqlab qo'yamiz: `connect()` ko'pincha
   * foydasiz "Connection is closed" beradi, haqiqiy sabab esa aynan
   * shu hodisada bo'ladi (DNS topilmadi, TLS mos kelmadi va h.k.).
   */
  let firstError = null;

  client.on('error', (error) => {
    firstError ??= error;
  });

  try {
    await client.connect();
    const answer = await client.ping();

    if (answer === 'PONG') {
      ok("Redis javob berdi");
    } else {
      bad(`Redis kutilmagan javob qaytardi: ${answer}`, 'REDIS_URL to\'g\'riligini tekshiring');
    }

    if (!url.startsWith('rediss://')) {
      warn(
        "REDIS_URL 'rediss://' emas",
        "Internet orqali ulanishda shifrlash bo'lishi kerak. Upstash 'rediss://' manzil beradi.",
      );
    }
  } catch (error) {
    bad(`Redis'ga ulanib bo'lmadi: ${(firstError ?? error).message}`, redisFixHint(firstError, url));
  } finally {
    client.disconnect();
  }
}

/**
 * Redis xatosiga qarab aniq maslahat beradi.
 *
 * Umumiy "manzilni tekshiring" degan javob foydasiz — telefonda
 * ishlaydigan odam nimani tekshirishni bilishi kerak.
 */
function redisFixHint(error, url) {
  const message = error?.message ?? '';

  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/.test(message)) {
    return "Manzil (host) topilmadi — REDIS_URL dagi nomni Upstash'dan qaytadan nusxalang";
  }

  if (/ECONNREFUSED/.test(message)) {
    return 'Server ulanishni rad etdi — port raqami yoki manzil xato';
  }

  if (/WRONGPASS|NOAUTH|invalid password/i.test(message)) {
    return "Parol xato — Upstash'dagi to'liq ulanish satrini (parol bilan) nusxalang";
  }

  if (url.startsWith('rediss://')) {
    return (
      "Shifrlangan ulanish (rediss://) o'rnatilmadi. Upstash aynan shu ko'rinishni beradi — " +
      "manzilni to'liq nusxalaganingizni tekshiring"
    );
  }

  return "REDIS_URL to'g'riligini tekshiring";
}

// ── 5. SMS ────────────────────────────────────────────────────────────

head('5) SMS xizmati');

if (env.SMS_PROVIDER === 'eskiz') {
  if (env.ESKIZ_EMAIL && env.ESKIZ_SECRET) {
    ok('Eskiz.uz sozlangan — haqiqiy SMS yuboriladi');
  } else {
    bad(
      'SMS_PROVIDER=eskiz, lekin kalitlar berilmagan',
      'ESKIZ_EMAIL va ESKIZ_SECRET ni to\'ldiring',
    );
  }
} else {
  warn(
    "SMS_PROVIDER=console — haqiqiy SMS YUBORILMAYDI",
    "Tasdiqlash kodi Vercel loglarida ko'rinadi. Ya'ni saytga faqat SIZ kira olasiz, " +
      "boshqa odamlar ro'yxatdan o'ta olmaydi. Haqiqiy foydalanuvchilar uchun eskiz.uz kerak.",
  );
}

// ── 6. Loyiha fayllari ────────────────────────────────────────────────

head('6) Loyiha fayllari');

for (const file of ['vercel.json', 'prisma/schema.prisma', 'package.json']) {
  if (fs.existsSync(path.join(ROOT, file))) {
    ok(file);
  } else {
    bad(`${file} topilmadi`, 'Kod to\'liq yuklanganini tekshiring: git pull');
  }
}

// Migratsiya papkasi bo'sh bo'lsa, bazada jadval yaratilmaydi.
const migrationsDir = path.join(ROOT, 'prisma', 'migrations');

if (fs.existsSync(migrationsDir)) {
  const count = fs.readdirSync(migrationsDir).filter((name) => !name.startsWith('.')).length;
  ok('Migratsiyalar', `${count} ta`);
} else {
  bad("Migratsiyalar papkasi yo'q", 'git pull bajaring');
}

// ── Yakun ─────────────────────────────────────────────────────────────

console.info(`\n${'─'.repeat(64)}`);

if (problems.length === 0 && warnings.length === 0) {
  console.info(`🎉 HAMMASI TAYYOR — ${checks} ta tekshiruv o'tdi\n`);
  console.info('   Endi deploy qilishingiz mumkin:');
  console.info('      git push\n');
} else {
  if (problems.length > 0) {
    console.info(`\n❌ ${problems.length} ta MUAMMO — bularsiz sayt ishlamaydi:\n`);

    for (const [index, item] of problems.entries()) {
      console.info(`   ${index + 1}. ${item.label}`);
      console.info(`      → ${item.fix}\n`);
    }
  }

  if (warnings.length > 0) {
    console.info(`\n⚠️  ${warnings.length} ta OGOHLANTIRISH — sayt ishlaydi, lekin e'tibor bering:\n`);

    for (const [index, item] of warnings.entries()) {
      console.info(`   ${index + 1}. ${item.label}`);
      console.info(`      → ${item.note}\n`);
    }
  }

  console.info(`${'─'.repeat(64)}`);
  console.info(
    problems.length > 0
      ? "\n   Muammolarni tuzatib, qaytadan bajaring:  npm run deploy:check\n"
      : '\n   Muammo yo\'q — deploy qilishingiz mumkin.\n',
  );
}

process.exitCode = problems.length > 0 ? 1 : 0;
