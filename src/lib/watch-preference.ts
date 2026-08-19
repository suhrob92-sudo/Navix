/**
 * Tomosha sozlamalari — ovoz va tezlik.
 *
 * ── Nima uchun ESLAB QOLINADI ─────────────────────────────────────────
 * Ilgari ikkala sozlama ham sahifa bilan birga yashardi: odam ovozni
 * yoqib, videolarni ko'rar, keyin lentaga qaytib yana kirsa — ovoz
 * yana o'chiq bo'lardi.
 *
 * Kuniga o'n marta bosiladigan tugma — ilovaning eng charchatadigan
 * joyi. Sozlama esa aynan shuning uchun bor: bir marta aytilgan
 * narsani qayta so'ramaslik kerak.
 *
 * ── Nima uchun `localStorage`, serverda emas ──────────────────────────
 * Bu sozlama QURILMAGA tegishli, odamga emas. Telefonda ovozsiz
 * ko'rish (masalan ishxonada) va uyda kompyuterda ovozli ko'rish
 * butunlay normal holat.
 *
 * Serverda saqlansa, bir joydagi tanlov boshqa joyga majburan
 * ko'chirilardi — va odam "nega ovoz o'zi yonib ketdi?" deb
 * hayron bo'lardi.
 *
 * ── Nima uchun alohida do'kon (store) ─────────────────────────────────
 * `localStorage` — React'dan TASHQARIDAGI holat. Uni `useEffect`
 * ichida o'qish ortiqcha qayta chizishga olib keladi va serverda
 * chizilgan sahifa bilan mos kelmaslik (hydration mismatch)
 * chiqaradi.
 *
 * `useSyncExternalStore` esa aynan shu holat uchun yasalgan:
 * server bir qiymat, brauzer boshqa qiymat qaytaradi va React
 * ikkalasini to'g'ri boshqaradi.
 */

const MUTED_KEY = 'navix.watch.muted';
const SPEED_KEY = 'navix.watch.speed';

/**
 * Ruxsat etilgan tezliklar.
 *
 * Ro'yxat SHU YERDA: `localStorage` dagi qiymatni odam qo'lda
 * o'zgartira oladi. Tekshirilmasa, "100" degan qiymat o'qilib,
 * video eshitib bo'lmaydigan holga kelardi.
 */
export const WATCH_SPEEDS: readonly number[] = [1, 1.5, 2, 0.5];

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Oxirgi o'qilgan qiymatlar.
 *
 * `useSyncExternalStore` snapshot'i HAR RENDER'da bir xil qiymat
 * qaytarishi shart. `localStorage` ni har safar o'qisak, u cheksiz
 * qayta chizishga olib kelardi.
 */
let cachedMuted: boolean | null = null;
let cachedSpeed: number | null = null;

export function subscribeWatchPreference(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Ovoz o'chiqmi.
 *
 * ── Nima uchun ODATDA o'chiq ──────────────────────────────────────────
 * Brauzerlar ovozli videoni O'ZI ishga tushirishga ruxsat bermaydi.
 * Ovoz bilan boshlashga urinilsa, video UMUMAN o'ynamaydi va odam
 * qotib qolgan kadrni ko'radi.
 *
 * Ya'ni bu qiymat shunchaki afzallik emas — u texnik talab.
 */
export function getWatchMuted(): boolean {
  if (cachedMuted !== null) return cachedMuted;

  if (typeof window === 'undefined') return true;

  const saved = window.localStorage.getItem(MUTED_KEY);

  // Hech narsa saqlanmagan bo'lsa — o'chiq (birinchi tashrif).
  cachedMuted = saved === null ? true : saved === 'on';

  return cachedMuted;
}

/** Serverda ovoz tushunchasi yo'q — u yerda har doim o'chiq. */
export function getWatchMutedOnServer(): boolean {
  return true;
}

export function setWatchMuted(muted: boolean): void {
  cachedMuted = muted;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MUTED_KEY, muted ? 'on' : 'off');
  }

  for (const listener of listeners) listener();
}

/** Tomosha tezligi. */
export function getWatchSpeed(): number {
  if (cachedSpeed !== null) return cachedSpeed;

  if (typeof window === 'undefined') return 1;

  const saved = Number(window.localStorage.getItem(SPEED_KEY));

  /*
    Ro'yxatda yo'q qiymat — ODATIYSIGA qaytariladi.

    Saqlangan qiymatni odam qo'lda o'zgartira oladi. Tekshirilmasa,
    "0" tezlik videoni butunlay to'xtatib qo'yardi va odam buni
    tuzatishning yo'lini topa olmasdi.
  */
  cachedSpeed = WATCH_SPEEDS.includes(saved) ? saved : 1;

  return cachedSpeed;
}

export function getWatchSpeedOnServer(): number {
  return 1;
}

export function setWatchSpeed(speed: number): void {
  cachedSpeed = WATCH_SPEEDS.includes(speed) ? speed : 1;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SPEED_KEY, String(cachedSpeed));
  }

  for (const listener of listeners) listener();
}
