/**
 * "Ovozli javob" kalitining saqlanishi.
 *
 * ── Nima uchun alohida do'kon (store) ─────────────────────────────────
 * Tanlov `localStorage` da yashaydi — bu React'dan TASHQARIDAGI holat.
 * Uni to'g'ridan-to'g'ri `useEffect` ichida o'qish React'ning yangi
 * qoidalarini buzadi (effekt ichida `setState` — ortiqcha render).
 *
 * Kichkina do'kon esa `useSyncExternalStore` bilan to'g'ri ishlaydi:
 * server `false` deydi, brauzer haqiqiy qiymatni beradi va
 * mos kelmaslik (hydration mismatch) chiqmaydi.
 *
 * Yon foyda: bu fayl sof va uni test qilish mumkin.
 */

const STORAGE_KEY = 'navix.assistant.voice';

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Oxirgi o'qilgan qiymat.
 *
 * `useSyncExternalStore` snapshot'i HAR RENDER'da bir xil havola
 * qaytarishi shart. `localStorage` ni har safar o'qisak, u har
 * chaqiruvda yangi qiymat hisoblab, cheksiz render'ga olib kelardi.
 */
let cached: boolean | null = null;

export function subscribeVoicePreference(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/** Brauzerdagi qiymat. */
export function getVoicePreference(): boolean {
  if (cached !== null) return cached;

  if (typeof window === 'undefined') return false;

  cached = window.localStorage.getItem(STORAGE_KEY) === 'on';

  return cached;
}

/** Serverda ovoz yo'q — u yerda kalit har doim o'chiq. */
export function getVoicePreferenceOnServer(): boolean {
  return false;
}

export function setVoicePreference(enabled: boolean): void {
  cached = enabled;

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  }

  for (const listener of listeners) listener();
}
