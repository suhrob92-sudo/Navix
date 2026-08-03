import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Hammasi ishlayaptimi — bitta buyruq bilan tekshiradi.
 *
 * Nima tekshiriladi:
 *  1. Kod eng yangi versiyadami (git);
 *  2. Dev server javob beryaptimi;
 *  3. Ma'lumotlar bazasi ulanganmi;
 *  4. Redis ulanganmi;
 *  5. Baza jadvallari kodga mos keladimi (migratsiya).
 *
 * 2-4 punktlar `/api/health` endpointidan o'qiladi — u allaqachon shu
 * tekshiruvlarni bajaradi, takrorlashning hojati yo'q.
 *
 * Ishlatish: npm run status
 */

const PORT = process.env.PORT ?? '3000';
const HEALTH_URL = `http://127.0.0.1:${PORT}/api/health`;

/**
 * Kutish vaqti saxiy olingan: ishlab chiqish rejimida sahifa BIRINCHI
 * so'rovda kompilyatsiya qilinadi va bu bir necha soniya davom etadi.
 * Qisqa vaqt qo'yilsa, ishlab turgan server ham "ishlamayapti" deb ko'rsatilardi.
 */
const TIMEOUT_MS = 30_000;

/** Belgi: ✅ yoki ❌ */
const mark = (ok) => (ok ? '✅' : '❌');

/**
 * Lokal kod GitHub'dagi versiyadan orqada qolmaganmi.
 *
 * Nima uchun kerak: yangi bosqichda ko'pincha YANGI BUYRUQ paydo bo'ladi
 * (masalan `npm run role:grant`). `git pull` unutilsa, buyruq
 * "Missing script" deb yiqiladi va sababi umuman ko'rinmaydi —
 * xato buyruq haqida gapiradi, aslida esa kod eski.
 *
 * Xuddi shu holat migratsiya va seed uchun ham amal qiladi.
 */
async function checkCodeFreshness() {
  try {
    const { stdout: head } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
    const branch = head.trim();

    // Internet yo'q bo'lsa shu joyda uzilib qoladi — pastdagi `catch`
    // tekshiruvni jimgina o'tkazib yuboradi.
    await execFileAsync('git', ['fetch', 'origin', branch], { timeout: 30_000 });

    const { stdout } = await execFileAsync('git', ['rev-list', '--count', `HEAD..origin/${branch}`]);
    const behind = Number(stdout.trim());

    return { ok: behind === 0, behind, branch };
  } catch {
    // Git yo'q, internet yo'q yoki shox hali push qilinmagan —
    // bularning hech biri xato emas, shuning uchun tekshiruv o'tkaziladi.
    return { ok: true, skipped: true };
  }
}

const freshness = await checkCodeFreshness();

if (!freshness.ok) {
  console.info('\n⚠️  KOD ESKIRGAN\n');
  console.info(`   GitHub'da ${freshness.behind} ta yangi commit bor.`);
  console.info("   Yangi buyruqlar va jadvallar hali sizda yo'q.\n");
  console.info('   Tuzatish:\n');
  console.info(`      git pull origin ${freshness.branch}`);
  console.info('      npm run db:migrate:deploy');
  console.info('      npm run db:seed\n');
  console.info('   ────────────────────────────────────────');
}

let response;

try {
  response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
} catch {
  console.info(`\n❌ Server javob bermadi (${PORT}-port)\n`);
  console.info('   Ishga tushirish:      npm run go');
  console.info("   Xatolikni ko'rish:    npm run dev:log\n");
  process.exit(1);
}

let body;

try {
  body = await response.json();
} catch {
  console.info('\n❌ Server javobini oʻqib boʻlmadi\n');
  process.exit(1);
}

const health = body?.data;

if (!health) {
  console.info('\n❌ Kutilmagan javob\n');
  process.exit(1);
}

const database = health.dependencies?.database?.status === 'ok';
const redis = health.dependencies?.redis?.status === 'ok';

console.info('\n📊 Tizim holati\n');

if (!freshness.skipped) {
  console.info(
    `   ${mark(freshness.ok)} Kod           — ${freshness.ok ? 'eng yangi' : `ESKIRGAN (${freshness.behind} ta commit orqada)`}`,
  );
}

console.info(`   ${mark(true)} Server        — ishlayapti (${PORT}-port)`);
console.info(`   ${mark(database)} Baza          — ${database ? 'ulangan' : 'ULANMAGAN'}`);
console.info(`   ${mark(redis)} Redis         — ${redis ? 'ulangan' : 'ULANMAGAN'}`);

if (!database || !redis) {
  console.info('\n   Tuzatish:  npm run docker:up\n');
  process.exit(1);
}

/**
 * Baza jadvallari kodga mos keladimi.
 *
 * Nima uchun kerak: yangi modul qo'shilganda jadval ham qo'shiladi.
 * `git pull` dan keyin migratsiya bajarilmasa, sahifa "Serverda
 * kutilmagan xatolik" deb yiqiladi va sababi ko'rinmaydi. Shu tekshiruv
 * buni oldindan aytadi.
 */
async function checkMigrations() {
  try {
    await execFileAsync('npx', ['prisma', 'migrate', 'status'], { timeout: 60_000 });
    return { ok: true };
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    // Prisma qo'llanmagan migratsiya bo'lsa nolga teng bo'lmagan kod qaytaradi.
    return { ok: false, pending: /not yet been applied|following migration/i.test(output) };
  }
}

const migrations = await checkMigrations();

console.info(`   ${mark(migrations.ok)} Jadvallar     — ${migrations.ok ? 'kodga mos' : 'MOS EMAS'}`);

if (!migrations.ok) {
  console.info('\n   Baza kodga mos emas. Tuzatish:\n');
  console.info('      npm run db:migrate:deploy');
  console.info('      npm run db:seed\n');
  process.exit(1);
}

if (!freshness.ok) {
  console.info(`\n   ⚠️  Kod eskirgan. Avval:  git pull origin ${freshness.branch}\n`);
  process.exit(1);
}

console.info('\n   Hammasi joyida. Havolani olish:  npm run url\n');
