import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Hammasi ishlayaptimi — bitta buyruq bilan tekshiradi.
 *
 * Nima tekshiriladi:
 *  1. Dev server javob beryaptimi;
 *  2. Ma'lumotlar bazasi ulanganmi;
 *  3. Redis ulanganmi;
 *  4. Baza jadvallari kodga mos keladimi (migratsiya).
 *
 * Uchalasi ham `/api/health` endpointidan o'qiladi — u allaqachon shu
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

console.info('\n   Hammasi joyida. Havolani olish:  npm run url\n');
