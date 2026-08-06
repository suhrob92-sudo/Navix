import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

/**
 * Bazani kodga moslashtiradi — QO'LDA emas, AVTOMATIK.
 *
 * ── Nima uchun kerak (HAQIQIY XATO) ───────────────────────────────────
 * `git pull` yangi kodni olib keladi, lekin bazani o'zgartirmaydi.
 * Agar kodda yangi ustun paydo bo'lgan bo'lsa, ilova o'sha ustunni
 * so'raydi va baza "bunday ustun yo'q" deydi:
 *
 *     The column `sessions.previousTokenHash` does not exist
 *
 * Foydalanuvchi uchun bu shunchaki "Serverda kutilmagan xatolik" —
 * sababi ko'rinmaydi va nima qilishni bilmaydi.
 *
 * `npm run status` buni aytardi, lekin uni hech kim ishlatmaydi:
 * odam `npm run go` yozadi va ishlashini kutadi. Shuning uchun
 * tekshiruv ESLATMA emas, AMAL bo'lishi kerak.
 *
 * Endi bu skript `npm run go` ichida ishlaydi va migratsiyani o'zi
 * qo'llaydi.
 */

const execFileAsync = promisify(execFile);

/** Baza ko'tarilishini shuncha kutamiz (Docker bir necha soniya oladi). */
const WAIT_TIMEOUT_MS = 60_000;
const WAIT_STEP_MS = 2_000;

function log(message) {
  console.info(message);
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, { timeout: 120_000, ...options });
}

/**
 * Bazaning holatini BITTA buyruq bilan aniqlaydi.
 *
 * `prisma migrate status` ham ulanishni, ham migratsiyalarni
 * tekshiradi. Shuning uchun alohida "ping" so'rovi kerak emas —
 * kamroq buyruq, kamroq xato ehtimoli.
 *
 * Uch xil javob:
 *   'ready'       — hammasi joyida;
 *   'pending'     — qo'llanmagan migratsiya bor;
 *   'unreachable' — bazaga ulanib bo'lmadi.
 */
async function checkDatabase() {
  try {
    await run('npx', ['prisma', 'migrate', 'status']);
    return 'ready';
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;

    if (/P1001|Can't reach database|Kan't reach|ECONNREFUSED/i.test(output)) {
      return 'unreachable';
    }

    if (/not yet been applied|following migration/i.test(output)) {
      return 'pending';
    }

    // Boshqa har qanday xato — sababi noaniq, matnini ko'rsatamiz.
    log(output.trim());
    return 'unreachable';
  }
}

/**
 * Baza ulanishga tayyor bo'lgunicha kutadi va holatini qaytaradi.
 *
 * `docker compose up -d` konteynerni ISHGA TUSHIRADI, lekin
 * PostgreSQL ichida yana bir necha soniya tayyorlanadi. Shu vaqtda
 * migratsiya yuborilsa, u "ulanib bo'lmadi" deb yiqilardi.
 */
async function waitForDatabase() {
  const startedAt = Date.now();
  let state = await checkDatabase();

  while (state === 'unreachable' && Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
    state = await checkDatabase();
  }

  return state;
}

async function main() {
  log('\n⏳ Baza tekshirilmoqda...');

  const state = await waitForDatabase();

  if (state === 'unreachable') {
    log('\n❌ Bazaga ulanib bo\'lmadi.\n');
    log('   Tekshiring:  npm run docker:up');
    log('   Keyin:       npm run go\n');
    process.exit(1);
  }

  if (state === 'ready') {
    log('✅ Baza kodga mos\n');
    return;
  }

  log('🔧 Yangi jadvallar qo\'shilmoqda...');

  try {
    await run('npx', ['prisma', 'migrate', 'deploy']);
  } catch (error) {
    log('\n❌ Migratsiyani qo\'llab bo\'lmadi.\n');
    log(`${error.stdout ?? ''}${error.stderr ?? ''}`);
    log('   Agar baza chalkashib ketgan bo\'lsa (faqat LOKAL bazada):');
    log('      npm run db:reset\n');
    process.exit(1);
  }

  /**
   * Migratsiyadan keyin Prisma klienti ham qayta yaratiladi.
   *
   * Aks holda TypeScript eski ustunlarni bilardi va yangi kod
   * "bunday maydon yo'q" deb yiqilardi.
   */
  await run('npx', ['prisma', 'generate']);

  log('✅ Baza yangilandi\n');
}

main().catch((error) => {
  console.error('❌ Bajarilmadi:', error);
  process.exit(1);
});
