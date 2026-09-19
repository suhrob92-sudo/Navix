import { execFileSync } from 'node:child_process';

/**
 * E2E sinovlari uchun yordamchi funksiyalar.
 *
 * Bazaga tegadigan ish alohida jarayonda bajariladi — sababi
 * `scripts/e2e-user.ts` boshida yozilgan.
 */

export interface SinovOdam {
  userId: string;
  phone: string;
  password: string;
}

/** Skript chiqargan JSON qatorni ajratib oladi (log aralashib ketishi mumkin). */
function jsonAjrat(chiqish: string): unknown {
  const qator = chiqish
    .split('\n')
    .reverse()
    .find((row) => row.trim().startsWith('{'));

  if (!qator) {
    throw new Error(`Skript JSON qaytarmadi:\n${chiqish}`);
  }

  return JSON.parse(qator);
}

function skript(...args: string[]): unknown {
  const chiqish = execFileSync('npx', ['tsx', 'scripts/e2e-user.ts', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return jsonAjrat(chiqish);
}

/**
 * Parol o'rnatilgan, hamyoni to'ldirilgan foydalanuvchi yaratadi.
 *
 * `sumSom` — hamyondagi summa. Qimmatroq narsa sotib oladigan
 * sinovlar (masalan mehmonxona) ko'proq so'raydi.
 */
export function odamYarat(sumSom?: number): SinovOdam {
  return (sumSom === undefined ? skript('create') : skript('create', String(sumSom))) as SinovOdam;
}

/** Foydalanuvchini va u bilan bog'liq hamma narsani o'chiradi. */
export function odamOchir(userId: string): void {
  skript('cleanup', userId);
}

/** Sutka bo'yi ochiq sinov restorani. */
export interface SinovRestoran {
  restaurantId: string;
  slug: string;
}

/**
 * Sinov uchun restoran yaratadi.
 *
 * Nima uchun tayyor restoran ishlatilmasligi `scripts/e2e-user.ts`
 * da yozilgan: ularning ish vaqti bor va sinov kechqurun yiqilardi.
 */
export function restoranYarat(): SinovRestoran {
  return skript('restaurant') as SinovRestoran;
}

export function restoranOchir(restaurantId: string): void {
  skript('cleanup-restaurant', restaurantId);
}
