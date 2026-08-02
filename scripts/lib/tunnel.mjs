/**
 * Ommaviy havola ochish uchun Cloudflare tunneli.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * GitHub Codespaces portni faqat brauzerdagi muharrir (VS Code) ishga
 * tushganda o'z tunneliga ro'yxatdan o'tkazadi. Termux'dan `gh codespace
 * ssh` bilan ulanilganda muharrir ishlamaydi — port ro'yxatga tushmaydi
 * va `gh codespace ports visibility` quyidagi xatoni beradi:
 *
 *     error getting tunnel port: ... response: 404 Not Found
 *
 * Cloudflare tunneli bu zanjirga umuman bog'liq emas: u codespace ichidan
 * TASHQARIGA ulanadi va o'zi `https://...trycloudflare.com` havolasini
 * beradi. Shu sababli faqat telefondan ishlaganda ham ishlaydi.
 *
 * Hisob (account) talab qilinmaydi — "quick tunnel" rejimi.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

/** Yuklab olingan fayllar loyihaga aralashmasligi uchun alohida papka. */
const CACHE_DIR = path.resolve(process.cwd(), '.cache');

const BINARY_PATH = path.join(CACHE_DIR, 'cloudflared');
const LOG_PATH = path.join(CACHE_DIR, 'tunnel.log');
const PID_PATH = path.join(CACHE_DIR, 'tunnel.pid');
const URL_PATH = path.join(CACHE_DIR, 'tunnel-url.txt');

/** Havolani logdan ajratib olish uchun naqsh. */
const URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;

/** Codespaces odatda x64, lekin ARM mashinalar ham bo'ladi. */
function getDownloadUrl() {
  const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
  return `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}`;
}

/** Jarayon hali tirikmi. */
function isProcessAlive(pid) {
  try {
    // 0-signal jarayonni o'ldirmaydi, faqat mavjudligini tekshiradi.
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Saqlangan tunnel jarayonining PID'i (bo'lmasa — null). */
function readPid() {
  try {
    const pid = Number(fs.readFileSync(PID_PATH, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

/**
 * Ishlab turgan tunnel havolasini qaytaradi.
 *
 * Jarayon o'lgan bo'lsa `null` qaytadi — havola ham eskirgan hisoblanadi,
 * chunki har safar yangi manzil beriladi.
 */
export function getRunningTunnelUrl() {
  const pid = readPid();
  if (!pid || !isProcessAlive(pid)) return null;

  try {
    const url = fs.readFileSync(URL_PATH, 'utf8').trim();
    return URL_PATTERN.test(url) ? url : null;
  } catch {
    return null;
  }
}

/** `cloudflared` faylini (bir marta) yuklab oladi. */
async function ensureBinary(onProgress) {
  await fsp.mkdir(CACHE_DIR, { recursive: true });

  try {
    await fsp.access(BINARY_PATH, fs.constants.X_OK);
    return BINARY_PATH;
  } catch {
    // Hali yuklanmagan — davom etamiz.
  }

  onProgress?.('Cloudflare tunneli yuklab olinmoqda (~40 MB, bir martalik)...');

  const response = await fetch(getDownloadUrl(), {
    redirect: 'follow',
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Yuklab bo'lmadi (HTTP ${response.status})`);
  }

  // Yarim yuklangan fayl ishlatilib qolmasligi uchun avval vaqtinchalik nomga.
  const tempPath = `${BINARY_PATH}.download`;

  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tempPath));
  await fsp.chmod(tempPath, 0o755);
  await fsp.rename(tempPath, BINARY_PATH);

  return BINARY_PATH;
}

/** Log faylida havola paydo bo'lishini kutadi. */
async function waitForUrl(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const match = fs.readFileSync(LOG_PATH, 'utf8').match(URL_PATTERN);
      if (match) return match[0];
    } catch {
      // Log fayli hali yaratilmagan bo'lishi mumkin.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return null;
}

/**
 * Tunnelni ishga tushiradi va ommaviy havolani qaytaradi.
 *
 * Allaqachon ishlab turgan bo'lsa — yangisini ochmaydi, eskisini qaytaradi.
 *
 * @param {number|string} port Ilova ishlayotgan port
 * @param {(message: string) => void} [onProgress] Jarayon haqida xabar
 * @returns {Promise<string>} `https://...trycloudflare.com`
 */
export async function startTunnel(port, onProgress) {
  const existing = getRunningTunnelUrl();
  if (existing) return existing;

  const binary = await ensureBinary(onProgress);

  // Eski log yangi havola bilan aralashib ketmasligi uchun tozalaymiz.
  await fsp.rm(LOG_PATH, { force: true });

  onProgress?.('Ommaviy havola ochilmoqda...');

  const logFile = fs.openSync(LOG_PATH, 'a');

  const child = spawn(binary, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], {
    detached: true,
    stdio: ['ignore', logFile, logFile],
  });

  // Terminal yopilganda ham tunnel ishlab turishi uchun ajratamiz.
  child.unref();

  await fsp.writeFile(PID_PATH, String(child.pid), 'utf8');

  const url = await waitForUrl(60_000);

  if (!url) {
    let reason = '';

    try {
      const log = await fsp.readFile(LOG_PATH, 'utf8');
      reason = log.split('\n').filter((line) => /ERR|error/i.test(line))[0] ?? '';
    } catch {
      // Log o'qilmasa ham xato matnisiz davom etamiz.
    }

    throw new Error(reason || 'Havola olinmadi (tunnel javob bermadi)');
  }

  await fsp.writeFile(URL_PATH, url, 'utf8');

  return url;
}

/**
 * Ishlab turgan tunnelni to'xtatadi.
 *
 * @returns {boolean} To'xtatildimi
 */
export function stopTunnel() {
  const pid = readPid();
  if (!pid || !isProcessAlive(pid)) return false;

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return false;
  }

  fs.rmSync(PID_PATH, { force: true });
  fs.rmSync(URL_PATH, { force: true });

  return true;
}
