import { execSync } from 'node:child_process';

import { stopTunnel } from './lib/tunnel.mjs';

/**
 * Fonda ishlayotgan dev serverni (va ochiq havolani) to'xtatadi.
 *
 * Nima uchun alohida skript, oddiy `pkill` emas:
 * `pkill -f "next dev"` buyrug'ining O'ZI ham "next dev" matnini o'z ichiga
 * oladi, shuning uchun u o'zini ham o'ldiradi va xabar chiqarmaydi.
 * Bu yerda jarayonlar ro'yxati o'qiladi va faqat kerakligi to'xtatiladi.
 *
 * Ishlatish: npm run dev:stop
 */

/** Shu naqshlarga mos jarayonlar to'xtatiladi. */
const TARGET_PATTERNS = [/\bnext dev\b/, /\bnext-server\b/];

function listProcesses() {
  try {
    return execSync('ps -eo pid=,args=', { encoding: 'utf8' }).split('\n');
  } catch {
    return [];
  }
}

const currentPid = process.pid;
const stopped = [];

for (const line of listProcesses()) {
  const match = line.trim().match(/^(\d+)\s+(.*)$/);
  if (!match) continue;

  const [, pidText, args] = match;
  const pid = Number(pidText);

  // O'zimizni va shu skriptni ishga tushirgan npm'ni tegmaymiz.
  if (pid === currentPid || args.includes('dev-stop.mjs')) continue;

  if (!TARGET_PATTERNS.some((pattern) => pattern.test(args))) continue;

  try {
    process.kill(pid, 'SIGTERM');
    stopped.push(pid);
  } catch {
    // Jarayon allaqachon tugagan bo'lishi mumkin — bu xatolik emas.
  }
}

// Server o'chgach ommaviy havola ham keraksiz — uni ochiq qoldirmaymiz.
const tunnelStopped = stopTunnel();

if (stopped.length > 0) {
  console.info(`\n⏹  Server toʻxtatildi (${stopped.length} ta jarayon)`);
} else {
  console.info('\nℹ️  Ishlayotgan server topilmadi');
}

console.info(tunnelStopped ? '⏹  Ommaviy havola yopildi\n' : '');
