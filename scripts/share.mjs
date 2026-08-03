/**
 * Ilovani telefon brauzeridan ochish uchun ommaviy havola beradi.
 *
 * ── Muammo nima edi ───────────────────────────────────────────────────
 * Codespaces'da ishga tushgan server tashqaridan avtomatik ko'rinmaydi.
 * Brauzer `HTTP ERROR 404` qaytaradi — sahifa yo'q degani emas, port
 * ochilmagan degani.
 *
 * ── Ikki yo'l ─────────────────────────────────────────────────────────
 * 1. GitHub'ning o'z porti (tez, qulay). Lekin u faqat codespace
 *    BRAUZERDA ochilganda ishlaydi: portni tunnelga ro'yxatdan
 *    o'tkazuvchi muharrir shunda ishga tushadi. Faqat SSH bilan
 *    ulanilganda `error getting tunnel port: 404` xatosi chiqadi.
 *
 * 2. Cloudflare tunneli — GitHub'ga umuman bog'liq emas. Faqat
 *    telefondan ishlaganda ham ishlaydi.
 *
 * Skript avval birinchisini sinaydi, ishlamasa ikkinchisiga o'tadi.
 * Ya'ni foydalanuvchi hech narsani tanlashi shart emas.
 *
 * Ishlatish: npm run share
 */

import { execFile } from 'node:child_process';
import net from 'node:net';
import { promisify } from 'node:util';

import { getRunningTunnelUrl, startTunnel, stopTunnel } from './lib/tunnel.mjs';

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

/**
 * Ommaviy havola HAQIQATAN ishlayaptimi.
 *
 * ── Nima uchun jarayonni tekshirish yetarli emas ──────────────────────
 * `cloudflared` jarayoni tirik bo'lsa ham, uning Cloudflare bilan aloqasi
 * uzilgan bo'lishi mumkin (mobil internet, codespace uyqusi). Bunda
 * brauzerda quyidagi xato chiqadi:
 *
 *     Error 1033 — Cloudflare Tunnel error
 *
 * Skript esa "havola ochiq" deb aldab qo'yardi.
 *
 * ── Nima uchun HTTP kodini tekshirish ham yetarli emas ────────────────
 * Yo'lda turgan proxy yoki Cloudflare xato sahifasi ham "chiroyli" javob
 * qaytarishi mumkin. Shuning uchun havola BIZNING serverimizga yetib
 * borganini isbotlash kerak: `/api/health` so'raladi va javob ichida
 * ilovaning o'z belgisi (`success: true`) borligi tekshiriladi.
 * Buni boshqa hech qanday sahifa qaytara olmaydi.
 */
async function isTunnelReachable(url) {
  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      redirect: 'manual',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) return false;

    const body = await response.json();
    return body?.success === true && typeof body?.data?.status === 'string';
  } catch {
    // Ulanib bo'lmadi yoki javob bizniki emas — havola ishlamayapti.
    return false;
  }
}

/** Havolani ko'zga tashlanadigan qilib chiqaradi. */
function printUrl(url, note) {
  console.info('\n🌐 Ilova manzili (brauzerda oching):\n');
  console.info(`   ${url}\n`);

  if (note) console.info(`   ${note}\n`);
}

/**
 * GitHub'ning o'z portini ochishga urinadi.
 *
 * @returns {Promise<string|null>} Havola yoki `null` (ishlamadi)
 */
async function tryGithubPort() {
  if (!codespaceName || !forwardingDomain) return null;

  try {
    await execFileAsync(
      'gh',
      ['codespace', 'ports', 'visibility', `${PORT}:public`, '--codespace', codespaceName],
      { timeout: 60_000 },
    );

    return `https://${codespaceName}-${PORT}.${forwardingDomain}`;
  } catch {
    // Sababi deyarli har doim bitta: port GitHub tunnelida ro'yxatga
    // olinmagan. Foydalanuvchini xato matni bilan qo'rqitmaymiz —
    // pastda ishlaydigan yo'lga o'tamiz.
    return null;
  }
}

// ── Asosiy oqim ────────────────────────────────────────────────────────

console.info('\n⏳ Server tekshirilmoqda...');

if (!(await waitForPort(PORT))) {
  console.info(`\n❌ ${PORT}-portda hech narsa ishlamayapti.\n`);
  console.info('   Avval serverni ishga tushiring:');
  console.info('      npm run go\n');
  console.info("   Xatolikni ko'rish uchun:");
  console.info('      npm run dev:log\n');
  process.exit(1);
}

console.info(`✅ Server ishlayapti (${PORT}-port)`);

// Codespaces'dan tashqarida (o'z kompyuteringizda) hech narsa ochish shart emas.
if (!codespaceName) {
  printUrl(`http://localhost:${PORT}`);
  process.exit(0);
}

// Tunnel allaqachon ishlab tursa — qayta ochmaymiz. Ammo avval uning
// HAQIQATAN javob berayotganini tekshiramiz (pastdagi izohga qarang).
const activeTunnel = getRunningTunnelUrl();

if (activeTunnel) {
  if (await isTunnelReachable(activeTunnel)) {
    console.info('✅ Ommaviy havola allaqachon ochiq');
    printUrl(activeTunnel, 'Yopish uchun:  npm run dev:stop');
    process.exit(0);
  }

  console.info('ℹ️  Eski havola javob bermayapti — yangisi ochiladi');
  stopTunnel();
}

console.info('⏳ Port ochilmoqda...');

const githubUrl = await tryGithubPort();

if (githubUrl) {
  console.info('✅ Port ochiq (GitHub)');
  printUrl(githubUrl);
  process.exit(0);
}

console.info("ℹ️  GitHub porti ochilmadi — zaxira yo'lga o'tilmoqda");

try {
  const tunnelUrl = await startTunnel(PORT, (message) => console.info(`⏳ ${message}`));

  console.info('✅ Ommaviy havola tayyor');
  printUrl(tunnelUrl, 'Yopish uchun:  npm run dev:stop');
} catch (error) {
  console.info(`\n❌ Havola ochib bo'lmadi: ${error.message}\n`);
  console.info("   Qo'lda ochish (bir marta qilinsa yetarli):\n");
  console.info('      1. github.com/codespaces sahifasini oching');
  console.info("      2. Shu codespace'ni brauzerda oching");
  console.info('      3. Pastdagi "PORTS" bo\'limiga o\'ting');
  console.info(`      4. ${PORT}-port ustiga bosib turing → Port Visibility → Public\n`);

  if (forwardingDomain) {
    console.info('   Shundan keyin ishlaydigan havola:\n');
    console.info(`   https://${codespaceName}-${PORT}.${forwardingDomain}\n`);
  }

  process.exit(1);
}
