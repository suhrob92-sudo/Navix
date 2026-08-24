/**
 * Sotuvchi ko'rsatkichlari — yagona sozlama.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Internetdan mahsulot olayotgan odamning asosiy qo'rquvi mahsulot
 * emas, SOTUVCHI: "pulni olib yo'qolib qolmaydimi", "javob beradimi",
 * "buni oldin kimdir olganmi".
 *
 * Do'kon sahifasida shu savollarga javob beradigan sonlar turishi
 * kerak. Lekin ular O'YLAB TOPILGAN emas, bazadagi haqiqiy yozuvlardan
 * hisoblanadi:
 *
 *   · nechta mahsulot bor          → `products` jadvali;
 *   · nechta buyurtma yetkazilgan  → `market_orders` (DELIVERED);
 *   · Navixda qancha vaqt          → `shops.createdAt`;
 *   · savolga qancha tez javob     → `product_questions` va
 *                                    `product_answers` orasidagi vaqt.
 *
 * ── Nima uchun "javob berish tezligi" AYNAN shunday o'lchanadi ────────
 * Bu ko'rsatkichni sotuvchining o'zi yozib qo'yishi mumkin emas. U
 * 41-bosqichda qo'shilgan savol-javob jadvalidan kelib chiqadi:
 * savol yozilgan payt va sotuvchining BIRINCHI javobi orasidagi
 * farq.
 *
 * ── Nima uchun O'RTACHA emas, MEDIAN ──────────────────────────────────
 * Oddiy o'rtacha bitta yozuvdan buziladi: sotuvchi 20 ta savolga 10
 * daqiqada javob bergan bo'lsa-yu, bittasini ta'tilda 30 kun
 * unutgan bo'lsa — o'rtacha "36 soat" chiqadi va bu YOLG'ON.
 *
 * Median esa "o'rtadagi" qiymatni oladi va bitta chetdagi yozuv uni
 * qimirlata olmaydi.
 */

/**
 * Tezlik ko'rsatilishi uchun kamida nechta javob kerak.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * Bitta javobdan "bu do'kon 5 daqiqada javob beradi" degan xulosa
 * chiqarib bo'lmaydi — u shunchaki o'sha kuni telefonini ushlab
 * turgan bo'lishi mumkin.
 *
 * Yetarli yozuv bo'lmaganda son UMUMAN ko'rsatilmaydi. Bu 38-bosqichda
 * baho bilan qilingan tanlovning davomi: yolg'on son ko'rsatgandan
 * ko'ra, hech narsa ko'rsatmagan yaxshi.
 */
export const MIN_RESPONSE_SAMPLE = 3;

/**
 * Tezlik oxirgi nechta javob bo'yicha hisoblanadi.
 *
 * ── Nima uchun butun tarix emas ───────────────────────────────────────
 * Do'kon bir yil oldin sekin edi, hozir tez — odamga HOZIRGI holat
 * kerak. Butun tarix o'rtachasi eski holatni abadiy sudrab yurardi
 * va sotuvchining yaxshilanishi ko'rinmasdi.
 */
export const RESPONSE_WINDOW = 200;

/** Shu soatdan tez javob — yaxshi. */
export const FAST_RESPONSE_HOURS = 4;

/** Shu soatdan sekin javob — yomon. */
export const SLOW_RESPONSE_HOURS = 48;

/** Savol-javob ko'rsatkichi. */
export interface ShopResponseStats {
  /** Do'kon mahsulotlariga berilgan JAMI savollar. */
  askedCount: number;
  /** Sotuvchi javob bergan savollar. */
  answeredCount: number;
  /**
   * Javob berish vaqtining medianasi — SOATDA.
   *
   * Yetarli javob bo'lmasa `null`: bu "sekin" degani emas, "hali
   * aytib bo'lmaydi" degani.
   */
  medianHours: number | null;
}

/** Do'kon haqidagi barcha sonlar. */
export interface ShopStatsView {
  /** Sotuvdagi mahsulotlar. */
  productCount: number;
  /** Yetkazib berilgan buyurtmalar. */
  deliveredCount: number;
  /** Do'kon Navixda necha KUN. */
  daysOnNavix: number;
  /**
   * Savol-javob ko'rsatkichi.
   *
   * Savol umuman berilmagan bo'lsa `null` — aytadigan gap yo'q.
   */
  response: ShopResponseStats | null;
}

/** Ko'rsatkichning ohangi — rangni shu belgilaydi. */
export type StatTone = 'good' | 'normal' | 'weak';

/**
 * Sonlar qatorining medianasi.
 *
 * Ro'yxat bo'sh bo'lsa `null` qaytadi: nol qaytarish "bir zumda javob
 * beradi" degan yolg'on ma'no berardi.
 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  // Kirish ro'yxati o'zgartirilmaydi — chaqiruvchi uni boshqa joyda
  // ishlatayotgan bo'lishi mumkin.
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Ikki vaqt orasidagi farq — SOATDA.
 *
 * Manfiy farq nolga tenglashtiriladi: javob savoldan oldin yozilishi
 * mumkin emas, lekin serverlar vaqti bir zumda mos kelmasligi mumkin.
 */
export function hoursBetween(from: Date, to: Date): number {
  const milliseconds = to.getTime() - from.getTime();

  return Math.max(0, milliseconds / 3_600_000);
}

/** Javob tezligining ohangi. */
export function responseTone(hours: number): StatTone {
  if (hours <= FAST_RESPONSE_HOURS) return 'good';
  if (hours >= SLOW_RESPONSE_HOURS) return 'weak';

  return 'normal';
}

/**
 * Javob tezligi matni.
 *
 * ── Nima uchun daqiqa yo'q ────────────────────────────────────────────
 * "17 daqiqada javob beradi" aniqroq tuyuladi, lekin u yolg'on
 * aniqlik: ertaga u 40 daqiqa bo'ladi. Odamga kerakli farq esa
 * "soat ichida" va "kun ichida" orasida.
 */
export function formatResponseTime(hours: number): string {
  if (hours < 1) return 'bir soat ichida';
  if (hours < 24) return `${Math.round(hours)} soat ichida`;

  const days = Math.round(hours / 24);

  return `${days} kun ichida`;
}

/**
 * Do'konning yoshi.
 *
 * ── Nima uchun aniq sana emas ─────────────────────────────────────────
 * "2025-03-14 dan beri" degan sanadan odam yoshni o'zi hisoblashi
 * kerak bo'lardi. "5 oy" esa darhol tushunarli.
 */
export function formatShopAge(days: number): string {
  if (days < 1) return 'bugun ochilgan';
  if (days < 30) return `${days} kun`;

  if (days < 365) {
    const months = Math.floor(days / 30);

    return `${months} oy`;
  }

  const years = Math.floor(days / 365);

  return `${years} yil`;
}

/**
 * Javob berish ulushi matni.
 *
 * Foiz emas, ANIQ sonlar: "20 savoldan 18 tasiga" — foiz katta
 * ko'rinib, aslida ikkita savolga asoslangan bo'lishi mumkin.
 */
export function formatAnswerRate(stats: ShopResponseStats): string {
  if (stats.askedCount === 0) return 'Savol berilmagan';

  return `${formatCount(stats.askedCount)} savoldan ${formatCount(stats.answeredCount)} tasiga javob bergan`;
}

/**
 * Javob berish ulushining ohangi.
 *
 * Savol kam bo'lganda ohang har doim "oddiy": ikkita savoldan
 * bittasiga javob bermagani "yomon sotuvchi" degani emas.
 */
export function answerRateTone(stats: ShopResponseStats): StatTone {
  if (stats.askedCount < MIN_RESPONSE_SAMPLE) return 'normal';

  const share = stats.answeredCount / stats.askedCount;

  if (share >= 0.8) return 'good';
  if (share < 0.4) return 'weak';

  return 'normal';
}

/**
 * Sonni bo'shliq bilan ajratib yozadi: 12500 → "12 500".
 *
 * ── Nima uchun `Intl` emas ────────────────────────────────────────────
 * `Intl` serverda va brauzerda turlicha ishlaydi va React sahifani
 * ikki marta chizganda mos kelmaslik xatosini beradi. Loyihada
 * hamma joyda qo'lda formatlash ishlatiladi.
 */
export function formatCount(value: number): string {
  const safe = Math.max(0, Math.floor(value));
  const digits = String(safe);

  let result = '';

  for (let index = 0; index < digits.length; index += 1) {
    // Oxiridan uchtalab bo'shliq qo'yiladi.
    const fromEnd = digits.length - index;

    result += digits[index];

    if (fromEnd > 1 && fromEnd % 3 === 1) result += ' ';
  }

  return result;
}
