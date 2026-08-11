import { clientEnv } from '@/lib/env';

/**
 * Xato kuzatuvi (Sentry) uchun umumiy sozlamalar.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Sozlama TO'RT joyda kerak: server, edge, brauzer va `next.config.ts`.
 * Har joyda qayta yozilsa, ertaga namuna (sample) darajasi
 * o'zgarganda to'rtta joyni tahrirlash kerak bo'lardi va bittasi
 * albatta unutilardi.
 *
 * ── Nima uchun DSN sir emas ───────────────────────────────────────────
 * DSN — bu faqat "xatolarni shu loyihaga yoz" degan manzil. U bilan
 * hech narsani o'qib bo'lmaydi, shuning uchun u brauzerga ham beriladi
 * (aks holda brauzerdagi xatolar umuman yig'ilmasdi).
 */

export const SENTRY_DSN = clientEnv.NEXT_PUBLIC_SENTRY_DSN;

/** Kuzatuv yoqilganmi. Berilmasa — butunlay o'chiq va ilova bemalol ishlaydi. */
export const isObservabilityEnabled = Boolean(SENTRY_DSN);

/**
 * Muhit nomi: xatolar shu bo'yicha ajratiladi.
 *
 * Ishlab chiqishdagi xatolar production hisobotiga aralashib ketmasligi
 * kerak — aks holda haqiqiy muammolar ko'milib qolardi.
 */
export const SENTRY_ENVIRONMENT = process.env.NODE_ENV ?? 'development';

/**
 * Tezlik o'lchovlarining ULUSHI.
 *
 * ── Nima uchun hammasi emas ───────────────────────────────────────────
 * Har bir so'rov o'lchansa, bepul limit bir necha kunda tugaydi va
 * shundan keyin XATOLAR ham qabul qilinmay qoladi — ya'ni asosiy
 * vazifa ishlamay qolardi.
 *
 * 10% — o'rtacha tezlikni ko'rish uchun yetarli namuna.
 */
export const TRACES_SAMPLE_RATE = 0.1;

/**
 * Yuborilmaydigan xatolar.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Bu "xatolar" biz tuzata oladigan narsa emas: ular brauzer
 * kengaytmalari, tarmoq uzilishi yoki foydalanuvchi sahifani yopib
 * yuborgani sababli chiqadi.
 *
 * Ular filtrlanmasa, hisobot shovqinga to'lib ketadi va haqiqiy
 * xatolar orasidan ko'rinmay qoladi.
 */
export const IGNORED_ERRORS = [
  // Foydalanuvchi so'rovni bekor qildi (sahifadan chiqdi).
  'AbortError',
  'The operation was aborted',
  // Tarmoq uzildi — bu bizning xatomiz emas.
  'Failed to fetch',
  'NetworkError when attempting to fetch resource',
  'Load failed',
  // Brauzer kengaytmalari kiritadigan skriptlar.
  'ResizeObserver loop',
  'Non-Error promise rejection captured',
];
