/**
 * Ilovani telefon brauzeridan ochish uchun portni OCHIQ (public) qiladi
 * va to'liq havolani chiqaradi.
 *
 * ── Muammo nima edi ───────────────────────────────────────────────────
 * GitHub Codespaces'da ishga tushgan server avtomatik ravishda tashqi
 * manzilga ulanmaydi. Port ikki shartni bajarishi kerak:
 *
 *   1. Kimdir uni "eshitib" turishi kerak (server ishlayotgan bo'lsin);
 *   2. Ko'rinishi "public" bo'lishi kerak.
 *
 * Shart bajarilmasa brauzer `HTTP ERROR 404` qaytaradi — sahifa yo'q
 * degani emas, balki port umuman ochilmagan degani.
 *
 * Bu skript ikkalasini ham tekshiradi va o'zi tuzatadi.
 *
 * Ishlatish: npm run share
 */

import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = process.env.PORT ?? '3000';
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

/** Server portni eshitayaptimi — bitta urinish. */
function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port: Number(port) });

    const finish = (result) => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

/**
 * Server ko'tarilishini kutadi.
 *
 * Nima uchun kutish kerak: `npm run go` serverni fonda ishga tushiradi va
 * darhol shu skriptga o'tadi. Next.js esa bir necha soniyada tayyor bo'ladi.
 */
async function waitForPort(port, timeoutMs = 40_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isPortOpen(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

console.info('\n⏳ Server tekshirilmoqda...');

const serverIsUp = await waitForPort(PORT);

if (!serverIsUp) {
  console.info(`\n❌ ${PORT}-portda hech narsa ishlamayapti.\n`);
  console.info('   Avval serverni ishga tushiring:');
  console.info('      npm run go\n');
  console.info("   Xatolikni ko'rish uchun:");
  console.info('      npm run dev:log\n');
  process.exit(1);
}

console.info(`✅ Server ishlayapti (${PORT}-port)`);

// Codespaces'dan tashqarida (masalan, o'z kompyuteringizda) hech narsa
// ochishning hojati yo'q — localhost baribir ishlaydi.
if (!codespaceName || !forwardingDomain) {
  console.info(`\n🌐 Ilova manzili:\n`);
  console.info(`   http://localhost:${PORT}\n`);
  process.exit(0);
}

const url = `https://${codespaceName}-${PORT}.${forwardingDomain}`;

console.info('⏳ Port ochilmoqda (public)...');

try {
  await execFileAsync('gh', ['codespace', 'ports', 'visibility', `${PORT}:public`, '--codespace', codespaceName], {
    timeout: 60_000,
  });

  console.info("✅ Port ochiq — havolani istalgan brauzerda ochsa bo'ladi\n");
  console.info('🌐 Ilova manzili:\n');
  console.info(`   ${url}\n`);
} catch (error) {
  const details = `${error.stderr ?? ''}${error.stdout ?? ''}`.trim();

  console.info("\n⚠️  Portni avtomatik ochib bo'lmadi.\n");

  if (details) {
    console.info(`   Sabab: ${details.split('\n')[0]}\n`);
  }

  // `gh` ruxsati yetmasa — eng ko'p uchraydigan sabab.
  if (/scope|auth|permission|HTTP 40[13]/i.test(details)) {
    console.info("   Ruxsatni yangilang, so'ng qaytadan urinib ko'ring:\n");
    console.info('      gh auth refresh -h github.com -s codespace');
    console.info('      npm run share\n');
  } else {
    console.info("   Qo'lda ochish (bir marta qilinsa yetarli):\n");
    console.info('      1. github.com/codespaces sahifasini oching');
    console.info("      2. Shu codespace'ni brauzerda oching");
    console.info('      3. Pastdagi "PORTS" bo\'limiga o\'ting');
    console.info(`      4. ${PORT}-port ustiga bosib turing → Port Visibility → Public\n`);
  }

  console.info('   Havola (port ochilgach ishlaydi):\n');
  console.info(`   ${url}\n`);
  process.exit(1);
}
