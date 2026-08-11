/**
 * Xatolar jurnali — brauzer va server uchun umumiy turlar.
 */

export type ErrorSourceName = 'SERVER' | 'BROWSER';

export const ERROR_SOURCE_LABELS: Record<ErrorSourceName, string> = {
  SERVER: 'Server',
  BROWSER: 'Brauzer',
};

export interface ErrorLogView {
  id: string;
  source: ErrorSourceName;
  kind: string;
  message: string;
  path: string;
  method: string | null;
  stack: string | null;
  count: number;
  isResolved: boolean;
  version: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface ErrorLogListResponse {
  errors: ErrorLogView[];
  /** Ko'rib chiqilmagan xatolar soni — admin panelidagi nishon uchun. */
  openCount: number;
}

/** Matn uzunligi chegaralari — baza ustunlari bilan bir xil. */
export const ERROR_LIMITS = {
  kind: 120,
  message: 1_000,
  path: 300,
  stack: 4_000,
} as const;

/**
 * Yozilmaydigan xatolar.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Bu "xatolar" biz tuzata oladigan narsa emas: ular brauzer
 * kengaytmalari, tarmoq uzilishi yoki foydalanuvchi sahifani yopib
 * yuborgani sababli chiqadi.
 *
 * Ular filtrlanmasa, ro'yxat shovqinga to'lib ketadi va haqiqiy
 * xatolar orasidan ko'rinmay qoladi.
 */
const IGNORED_PATTERNS = [
  // Foydalanuvchi so'rovni bekor qildi (sahifadan chiqdi).
  'AbortError',
  'The operation was aborted',
  'The user aborted a request',
  // Tarmoq uzildi — bu bizning xatomiz emas.
  'Failed to fetch',
  'NetworkError',
  'Load failed',
  'network error',
  // Brauzer kengaytmalari va o'lchov halqasi — zararsiz shovqin.
  'ResizeObserver loop',
  'Non-Error promise rejection captured',
  'Script error.',
];

export function isIgnoredError(message: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Manzildan so'rov parametrlarini OLIB TASHLAYDI.
 *
 * ── Nima uchun MAJBURIY ───────────────────────────────────────────────
 * Manzilda qidiruv so'zi, telefon raqami yoki (eng yomoni) token
 * bo'lishi mumkin: `/api/v1/x?token=abc`. Ular jurnalga tushsa,
 * jurnalni ko'ra oladigan har bir odam ularni o'qiy olardi.
 *
 * Xatoni tushunish uchun esa manzilning o'zi yetarli.
 */
export function cleanPath(raw: string): string {
  const withoutQuery = raw.split('?')[0].split('#')[0];

  try {
    // To'liq manzil bo'lsa (brauzerdan keladi) faqat yo'l qismi olinadi.
    return new URL(withoutQuery).pathname.slice(0, ERROR_LIMITS.path);
  } catch {
    return withoutQuery.slice(0, ERROR_LIMITS.path) || '/';
  }
}

/**
 * Bir xil xatolarni birlashtiruvchi kalit uchun matn.
 *
 * ── Nima uchun matndan SONLAR olib tashlanadi ─────────────────────────
 * "Foydalanuvchi 8f3a... topilmadi" va "Foydalanuvchi 21b9... topilmadi"
 * — bu BITTA xato. ID'lar qoldirilsa, har bir foydalanuvchi uchun
 * alohida qator yaratilardi va ro'yxat bir kunda ishlatib bo'lmas
 * holga kelardi.
 *
 * Shuning uchun uzun sonlar va ID'lar `#` bilan almashtiriladi.
 */
export function normalizeMessage(message: string): string {
  return (
    message
      // UUID
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '#')
      // Uzun o'n oltilik yoki raqamli ketma-ketliklar
      .replace(/\b[0-9a-f]{12,}\b/gi, '#')
      .replace(/\b\d{4,}\b/g, '#')
      .trim()
      .slice(0, ERROR_LIMITS.message)
  );
}

/**
 * Xato matnini O'QILADIGAN holga keltiradi.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Prisma xatosi shunday ko'rinishda keladi:
 *
 *   Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib
 *   $2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"]
 *   .post.findFirst()` invocation in /home/user/... Invalid input value:
 *   invalid input syntax for type uuid: "salom"
 *
 * Telefon ekranida bu — bir necha ekran to'la shovqin. Sabab esa
 * eng OXIRIDA yozilgan.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 * Modul nomlari va fayl yo'llari olib tashlanadi, bo'sh joylar
 * yig'iladi. Matn uzun bo'lsa OXIRI qoldiriladi — sabab o'sha yerda.
 */
export function cleanErrorMessage(message: string, maxLength = 400): string {
  const cleaned = message
    // Turbopack modul nomlari: `__TURBOPACK__imported__module__$5b$...`
    .replace(/__TURBOPACK__[A-Za-z0-9_$]+__/g, '…')
    // Ichki fayl yo'llari: /home/user/Navix/.next/dev/server/chunks/...
    .replace(/\/[^\s"']*\/\.next\/[^\s"')]*/g, '…')
    // Ko'p bo'sh joy va yangi qatorlar bitta probelga.
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > maxLength ? `…${cleaned.slice(-maxLength)}` : cleaned;
}

/** Takrorlanish sonini qisqartiradi: 1250 → "1.2K". */
export function formatErrorCount(count: number): string {
  if (count < 1_000) return String(count);

  const thousands = Math.floor((count / 1_000) * 10) / 10;

  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
}
