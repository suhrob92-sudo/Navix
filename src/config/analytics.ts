/**
 * Ijodkor analitikasi — YAGONA sozlama.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * "Videolarim natijasi" sahifasida sonlar bor edi: ko'rishlar,
 * bosishlar, buyurtmalar. Lekin ular BOSHIDAN BERI yig'ilgan yig'indi.
 *
 * Bloger esa boshqa savolga javob izlaydi: "men o'syapmanmi?".
 * Yig'indi bu savolga javob bermaydi — u faqat o'sadi va hech qachon
 * kamaymaydi. Bir yil ishlagan odam ham, kecha to'xtagan odam ham
 * bir xil chiroyli sonni ko'radi.
 *
 * ── Yechim: DAVR va TAQQOSLASH ────────────────────────────────────────
 * Har bir ko'rsatkich ikki marta hisoblanadi: shu davrda va undan
 * OLDINGI xuddi shunday davrda. Ikkisining farqi — javob.
 *
 *     Bu hafta: 12 obunachi
 *     O'tgan hafta: 8 obunachi        →   +50%
 */

/**
 * Tanlash mumkin bo'lgan davrlar (kunlarda).
 *
 * ── Nima uchun aynan bu uchtasi ───────────────────────────────────────
 * 7 kun — hafta ritmi. Odamlar dam olish kunlari boshqacha tomosha
 * qiladi, shuning uchun 7 kun to'liq siklni qamrab oladi va
 * taqqoslash halol bo'ladi.
 *
 * 30 kun — oylik surat, mavsumiy o'zgarishlar ko'rinadi.
 *
 * 90 kun — chorak. Undan uzunini ko'rsatishning ma'nosi yo'q: u
 * yerda "o'sish" emas, "tarix" boshlanadi va u boshqa ekran.
 */
export const ANALYTICS_PERIODS = [7, 30, 90] as const;

export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const DEFAULT_ANALYTICS_PERIOD: AnalyticsPeriod = 7;

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  7: '7 kun',
  30: '30 kun',
  90: '90 kun',
};

export function isAnalyticsPeriod(value: number): value is AnalyticsPeriod {
  return (ANALYTICS_PERIODS as readonly number[]).includes(value);
}

/**
 * O'zgarish foizi.
 *
 * ── Nima uchun oldingi davr NOL bo'lsa `null` qaytadi ─────────────────
 * Noldan birga o'sish matematik jihatdan cheksiz foiz. Ekranda
 * "+∞%" yoki "+100%" ko'rsatish yolg'on bo'lardi: birinchi
 * obunachi paydo bo'lgani "ikki barobar o'sish" emas.
 *
 * `null` da ekran foiz o'rniga oddiy sonni ko'rsatadi ("+1").
 */
export function changePercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;

  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Kunlik ustunchalar uchun eng baland qiymat.
 *
 * Hammasi nol bo'lsa `1` qaytadi: nolga bo'lish o'rniga bo'sh
 * diagramma chiziladi.
 */
export function chartMax(values: readonly number[]): number {
  return Math.max(1, ...values);
}
