/**
 * Moliya markazi — modul nomlari va ranglari.
 *
 * ── Nima uchun `APP_MODULES` dan olinmaydi ────────────────────────────
 * Tranzaksiyadagi `sourceModule` va modullar reyestridagi `id` HAR
 * DOIM mos kelmaydi:
 *
 *   sourceModule   reyestrdagi id
 *   'payments'  →  'payments' (bor)
 *   'jobs'      →  'jobs'     (bor)
 *   'parcel'    →  YO'Q — u 'delivery' modulining ichida
 *   'seller'    →  YO'Q — u 'market' ning kabineti
 *   'auth'      →  YO'Q — bu modul emas, tizim qismi
 *
 * Ya'ni reyestrga tayansak, ba'zi xarajatlar "noma'lum" bo'lib
 * qolardi. Bu yerdagi ro'yxat esa TRANZAKSIYA tomonidan yozilgan
 * qiymatlarga to'g'ridan-to'g'ri javob beradi.
 *
 * ── Ranglar nima uchun bu yerda ───────────────────────────────────────
 * Diagramma va ro'yxat BIR XIL rangni ishlatishi kerak: odam
 * diagrammadagi bo'lakni ro'yxatdagi qator bilan rang orqali
 * bog'laydi. Ikki joyda alohida yozilsa, ular ertaga ajralib
 * qolardi.
 */

/** Ekranda ko'rsatiladigan modul. */
export interface FinanceCategory {
  /** Tranzaksiyadagi `sourceModule` qiymati. */
  code: string;
  label: string;
  /** Diagramma rangi — CSS qiymati. */
  color: string;
}

/**
 * Xarajat toifalari.
 *
 * Tartib MUHIM: diagrammada ranglar shu tartibda beriladi va u
 * har safar bir xil bo'lishi kerak.
 */
export const FINANCE_CATEGORIES: readonly FinanceCategory[] = [
  { code: 'food', label: 'Ovqat', color: 'oklch(0.62 0.19 25)' },
  { code: 'market', label: 'Marketplace', color: 'oklch(0.55 0.2 268)' },
  { code: 'taxi', label: 'Taksi', color: 'oklch(0.7 0.16 75)' },
  { code: 'delivery', label: 'Yetkazib berish', color: 'oklch(0.6 0.18 340)' },
  { code: 'parcel', label: 'Posilka', color: 'oklch(0.6 0.18 340)' },
  { code: 'hotel', label: 'Mehmonxona', color: 'oklch(0.62 0.19 305)' },
  { code: 'travel', label: 'Sayohat', color: 'oklch(0.6 0.15 195)' },
  { code: 'payments', label: "Kommunal to'lovlar", color: 'oklch(0.58 0.16 150)' },
  { code: 'wallet', label: "Pul o'tkazmalari", color: 'oklch(0.55 0.02 260)' },
  { code: 'jobs', label: 'Ish qidirish', color: 'oklch(0.6 0.14 230)' },
  { code: 'live', label: 'Jonli efir', color: 'oklch(0.65 0.2 15)' },
  { code: 'feed', label: 'Lenta', color: 'oklch(0.6 0.16 290)' },
  { code: 'collab', label: 'Hamkorlik', color: 'oklch(0.62 0.14 120)' },
  { code: 'call', label: "Qo'ng'iroqlar", color: 'oklch(0.6 0.12 210)' },
] as const;

/**
 * Ro'yxatda yo'q modul uchun zaxira.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Ertaga yangi modul qo'shilib, bu ro'yxatga yozilmasligi mumkin.
 * O'shanda uning xarajati YO'QOLIB qolmasligi kerak: jami summa
 * bo'laklar yig'indisiga teng bo'lmay qolardi va odam buni
 * darhol sezardi.
 *
 * Shuning uchun noma'lum modul "Boshqa" bo'lib ko'rinadi.
 */
export const OTHER_CATEGORY: FinanceCategory = {
  code: 'other',
  label: 'Boshqa',
  color: 'oklch(0.6 0.02 260)',
};

const BY_CODE = new Map(FINANCE_CATEGORIES.map((item) => [item.code, item]));

/** Modul kodidan toifani topadi. Topilmasa — "Boshqa". */
export function financeCategory(code: string): FinanceCategory {
  return BY_CODE.get(code) ?? { ...OTHER_CATEGORY, code };
}

/**
 * Diagrammada alohida ko'rsatiladigan eng ko'p bo'lak.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * O'n to'rtta bo'lakli halqa o'qib bo'lmaydigan bo'ladi: eng
 * kichiklari ip kabi ingichka chiziqqa aylanadi va ularning
 * yorlig'i ham sig'maydi.
 *
 * Beshta katta bo'lak + "Boshqa" — telefon ekranida o'qiladigan
 * eng katta miqdor.
 */
export const MAX_CHART_SLICES = 5;
