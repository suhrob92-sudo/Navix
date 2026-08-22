/**
 * Ishga tushirilgan saytni TASHQARIDAN tekshiradi.
 *
 * ── `deploy:check` dan farqi ──────────────────────────────────────────
 * `deploy:check` — chiqarishdan OLDIN, fayllar va sozlamalarni
 * tekshiradi. Bu skript esa chiqarishdan KEYIN, haqiqiy manzilga
 * murojaat qilib, sayt ROSTDAN ishlayotganini tekshiradi.
 *
 * Ikkalasi ham kerak: sozlama to'g'ri bo'lib, sayt baribir ochilmasligi
 * mumkin (migratsiya bajarilmagan, Blob ulanmagan, domen noto'g'ri).
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run smoke -- https://navix.uz
 *
 * Manzil berilmasa, NEXT_PUBLIC_APP_URL ishlatiladi.
 *
 * ── Nima uchun HECH NARSA yozilmaydi ──────────────────────────────────
 * Skript faqat O'QIYDI: hisob yaratmaydi, xabar yubormaydi, ma'lumot
 * o'zgartirmaydi. Shuning uchun uni ishlab turgan saytda istalgan
 * paytda, xavfsiz bajarish mumkin.
 *
 * ── Nima uchun ranglar ishlatilmagan ──────────────────────────────────
 * Natija telefon terminalida o'qiladi. Termux'ning ba'zi mavzularida
 * rangli matn deyarli ko'rinmaydi, shuning uchun belgi sifatida faqat
 * emoji ishlatiladi — u har joyda bir xil ko'rinadi.
 */

process.removeAllListeners('warning');

const problems = [];
const warnings = [];
let okCount = 0;

function ok(text, extra) {
  okCount += 1;
  console.log(`  ✅ ${text}${extra ? `  ${extra}` : ''}`);
}

function fail(text, advice) {
  problems.push({ text, advice });
  console.log(`  ❌ ${text}`);
}

function warn(text, advice) {
  warnings.push({ text, advice });
  console.log(`  ⚠️  ${text}`);
}

/** Manzilni argumentdan yoki muhitdan oladi. */
function resolveBaseUrl() {
  const fromArgs = process.argv.slice(2).find((value) => value.startsWith('http'));

  if (fromArgs) return fromArgs.replace(/\/+$/, '');

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;

  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  return null;
}

/**
 * Bitta so'rov yuboradi.
 *
 * Vaqt chegarasi 20 soniya: uxlab turgan server birinchi so'rovda
 * sekin javob beradi va uni darhol xato deb hisoblash noto'g'ri
 * bo'lardi.
 *
 * `redirect: 'manual'` — yo'naltirish AVTOMATIK bajarilmaydi.
 * Aks holda "kirmagan odam hamyonga kira oladimi" degan tekshiruv
 * doim 200 ko'rardi: brauzer kirish sahifasiga o'zi o'tib ketardi.
 */
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'navix-smoke/1.0', ...options.headers },
      ...options,
    });

    const body = await response.text().catch(() => '');

    return { ok: true, status: response.status, headers: response.headers, body, ms: Date.now() - startedAt };
  } catch (error) {
    return { ok: false, error: error.name === 'AbortError' ? '20 soniyada javob bermadi' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

const BASE = resolveBaseUrl();

if (!BASE) {
  console.log("\nManzil ko'rsatilmadi.\n");
  console.log('  Namuna:  npm run smoke -- https://navix.uz\n');
  process.exit(1);
}

const LINE = '────────────────────────────────────────────────────────────────';

console.log(`\n${LINE}`);
console.log(`  Tekshirilmoqda: ${BASE}`);
console.log(LINE);

// ── 1. Salomatlik ────────────────────────────────────────────────────
console.log('\n1) Tizim salomatligi');

const health = await request(`${BASE}/api/health`);

if (!health.ok) {
  fail(`Sayt javob bermadi: ${health.error}`, "Manzil to'g'rimi? Vercel'da deploy tugaganmi?");
} else if (health.status === 503) {
  let payload = null;

  try {
    payload = JSON.parse(health.body);
  } catch {
    payload = null;
  }

  const deps = payload?.data?.dependencies ?? {};

  fail(
    "Sayt ishlayapti, lekin bog'liqliklardan biri ishlamayapti",
    `Baza: ${deps.database?.status ?? '?'}, Redis: ${deps.redis?.status ?? '?'}. Vercel -> Settings -> Environment Variables dagi DATABASE_URL va REDIS_URL ni tekshiring.`,
  );
} else if (health.status !== 200) {
  fail(`/api/health javob berdi: ${health.status}`, 'Kutilgan javob — 200.');
} else {
  const data = JSON.parse(health.body).data;

  ok('Sayt ishlayapti', `${health.ms}ms`);
  ok('Baza ulangan', `${data.dependencies.database.latencyMs}ms`);
  ok('Redis ulangan', `${data.dependencies.redis.latencyMs}ms`);
  ok(`Versiya: ${data.version}`, data.environment);

  /**
   * Sekin baza — xato emas, lekin ogohlantirish.
   *
   * Bir soniyadan ortiq kechikish odatda bitta sababdan: baza boshqa
   * qit'ada. Vercel mintaqasi (fra1) bilan baza mintaqasi bir xil
   * bo'lishi kerak.
   */
  if (data.dependencies.database.latencyMs > 1_000) {
    warn(
      `Baza sekin javob beryapti (${data.dependencies.database.latencyMs}ms)`,
      "Baza va Vercel bir mintaqadami? vercel.json da fra1 (Frankfurt) yozilgan — Neon ham Frankfurt bo'lsin.",
    );
  }

  if (data.environment !== 'production') {
    warn(
      `Muhit "${data.environment}" — "production" emas`,
      "Bu sinov (preview) manzili bo'lishi mumkin. Haqiqiy domenni tekshiring.",
    );
  }
}

// ── 2. Sahifalar ochiladimi ──────────────────────────────────────────
console.log('\n2) Asosiy sahifalar');

/**
 * Bu yerda faqat OCHIQ sahifalar.
 *
 * Kirish talab qiladigan sahifa (masalan /welcome yoki /support)
 * bu ro'yxatga yaramaydi: u har doim yo'naltirish qaytaradi va
 * "sahifa ochilyaptimi" degan savolga javob bermaydi.
 */
const PAGES = [
  ['/', 'Bosh sahifa'],
  ['/auth/login', 'Kirish'],
  ['/auth/register', "Ro'yxatdan o'tish"],
  ['/search', 'Qidiruv'],
  ['/legal/oferta', 'Ommaviy oferta'],
  ['/legal/maxfiylik', 'Maxfiylik siyosati'],
  ['/legal/shartlar', 'Foydalanish shartlari'],
];

for (const [path, name] of PAGES) {
  const page = await request(`${BASE}${path}`);

  if (!page.ok) {
    fail(`${name} (${path}) ochilmadi: ${page.error}`);
    continue;
  }

  if (page.status === 200) {
    ok(`${name} ochildi`, `${page.ms}ms`);
  } else if (page.status === 307 || page.status === 308) {
    /**
     * Ochiq sahifa yo'naltirish qaytarsa — bu kutilmagan holat.
     *
     * Masalan yuridik hujjat kirish talab qila boshlasa, uni Google
     * ham, ro'yxatdan o'tayotgan odam ham ocha olmasdi.
     */
    fail(
      `${name} (${path}) yo'naltirdi: ${page.headers.get('location') ?? page.status}`,
      "Bu sahifa ochiq bo'lishi kerak edi.",
    );
  } else {
    fail(`${name} (${path}) javob berdi: ${page.status}`, "Vercel loglarini ochib xatoni ko'ring.");
  }
}

// ── 3. Himoya ────────────────────────────────────────────────────────
console.log('\n3) Himoya');

const guarded = await request(`${BASE}/wallet`);

if (guarded.ok && (guarded.status === 307 || guarded.status === 308)) {
  ok('Kirmagan odam hamyonga kira olmaydi', `${guarded.status} -> kirish sahifasi`);
} else if (guarded.ok && guarded.status === 200) {
  fail('Hamyon sahifasi KIRMASDAN ochildi', 'src/config/protected-routes.ts tekshirilsin — bu jiddiy xavf.');
} else {
  warn(`Hamyon sahifasi kutilmagan javob berdi: ${guarded.status ?? guarded.error}`);
}

const adminApi = await request(`${BASE}/api/v1/admin/errors`);

if (adminApi.ok && (adminApi.status === 401 || adminApi.status === 403)) {
  ok('Admin API tokensiz ishlamaydi', String(adminApi.status));
} else {
  fail(`Admin API tokensiz ${adminApi.status ?? adminApi.error} qaytardi`, 'Kutilgan javob — 401.');
}

// ── 4. Xavfsizlik sarlavhalari ───────────────────────────────────────
console.log('\n4) Xavfsizlik sarlavhalari');

/**
 * Sarlavhalar OCHIQ sahifada tekshiriladi.
 *
 * Yo'naltirish javobida ham sarlavhalar bo'ladi, lekin ochiq
 * sahifa haqiqiy holatni ko'rsatadi.
 */
const front = await request(`${BASE}/auth/login`);

if (front.ok) {
  const required = [
    ['x-frame-options', 'Boshqa sayt ichiga joylashdan himoya'],
    ['x-content-type-options', 'Fayl turini taxmin qilishdan himoya'],
    ['referrer-policy', 'Manzilni begona saytga bermaslik'],
    ['content-security-policy', 'Begona kod ishga tushishidan himoya'],
  ];

  for (const [header, meaning] of required) {
    if (front.headers.get(header)) {
      ok(meaning, header);
    } else {
      fail(`Sarlavha yo'q: ${header}`, 'next.config.ts dagi securityHeaders tekshirilsin.');
    }
  }

  /**
   * HSTS faqat HTTPS'da ma'noga ega — lokal manzilda uni talab qilish
   * noto'g'ri bo'lardi.
   */
  if (BASE.startsWith('https://')) {
    if (front.headers.get('strict-transport-security')) {
      ok('HTTPS majburiy', 'strict-transport-security');
    } else {
      fail("Sarlavha yo'q: strict-transport-security");
    }
  }
}

// ── 5. Telefonga o'rnatish ───────────────────────────────────────────
console.log("\n5) Telefonga o'rnatish");

const manifest = await request(`${BASE}/manifest.webmanifest`);

if (manifest.ok && manifest.status === 200) {
  try {
    const parsed = JSON.parse(manifest.body);

    ok("Ilova ta'rifi topildi", parsed.name ?? '');

    if (!parsed.icons?.length) {
      fail("Ilova belgilari (icons) yo'q", "Bosh ekranga qo'shilgan ilova belgisiz turadi.");
    } else {
      ok(`Belgilar: ${parsed.icons.length} ta`);
    }
  } catch {
    fail("manifest.webmanifest o'qib bo'lmadi");
  }
} else {
  fail(`manifest.webmanifest javob berdi: ${manifest.status ?? manifest.error}`);
}

const sw = await request(`${BASE}/sw.js`);

if (sw.ok && sw.status === 200) {
  ok('Xizmat ishchisi (offline rejim) joyida');
} else {
  warn(`sw.js javob berdi: ${sw.status ?? sw.error}`, 'Offline rejim ishlamaydi.');
}

// ── 6. Qidiruv tizimlari ─────────────────────────────────────────────
console.log('\n6) Qidiruv tizimlari');

for (const [path, name] of [
  ['/robots.txt', 'robots.txt'],
  ['/sitemap.xml', 'sitemap.xml'],
]) {
  const file = await request(`${BASE}${path}`);

  if (file.ok && file.status === 200) {
    ok(`${name} joyida`, `${file.body.length} belgi`);
  } else {
    warn(`${name} javob berdi: ${file.status ?? file.error}`, "Sayt Google'da yomonroq ko'rinadi.");
  }
}

// ── 7. Sir saqlanyaptimi ─────────────────────────────────────────────
console.log('\n7) Sir saqlanyaptimi');

/**
 * Mavjud bo'lmagan manzil.
 *
 * Xato javobida jadval nomi, fayl yo'li yoki ulanish satri
 * ko'rinmasligi kerak: bular hujumchiga ichki tuzilishni ochib
 * beradi.
 */
const notFound = await request(`${BASE}/api/v1/bunday-manzil-yoq`);

if (notFound.ok) {
  const leaks = [
    ['postgres://', 'baza ulanish satri'],
    ['postgresql://', 'baza ulanish satri'],
    ['redis://', 'Redis ulanish satri'],
    ['neon.tech', 'baza manzili'],
    ['upstash.io', 'Redis manzili'],
    ['/var/task/', "server fayl yo'li"],
    ['"_dev"', 'ishlab chiqish tafsilotlari'],
  ];

  const found = leaks.filter(([needle]) => notFound.body.includes(needle));

  if (found.length === 0) {
    ok("Xato javobida ichki tafsilot yo'q");
  } else {
    for (const [needle, meaning] of found) {
      fail(`Xato javobida ${meaning} ko'rindi ("${needle}")`, 'Bu hujumchiga yordam beradi.');
    }
  }

  if (notFound.status === 404) {
    ok("Noma'lum manzil 404 qaytaradi");
  } else {
    warn(`Noma'lum manzil ${notFound.status} qaytardi`, 'Kutilgan javob — 404.');
  }
}

// ── Natija ───────────────────────────────────────────────────────────
console.log(`\n${LINE}`);

if (problems.length === 0 && warnings.length === 0) {
  console.log(`\n✅ Hammasi joyida — ${okCount} ta tekshiruv o'tdi.\n`);
  process.exit(0);
}

if (problems.length > 0) {
  console.log(`\n❌ ${problems.length} ta MUAMMO:\n`);

  problems.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.text}`);
    if (item.advice) console.log(`      → ${item.advice}`);
  });
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} ta OGOHLANTIRISH:\n`);

  warnings.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.text}`);
    if (item.advice) console.log(`      → ${item.advice}`);
  });
}

console.log(`\n   O'tgan tekshiruvlar: ${okCount} ta\n`);

process.exit(problems.length > 0 ? 1 : 0);
