/**
 * Posilka yetkazish tarifi va hududlar.
 *
 * ── Nima uchun XARITASIZ ──────────────────────────────────────────────
 * Aniq masofani bilish uchun xarita API kaliti kerak va u pullik.
 * Lekin yetkazishning asosiy qismi kalitsiz ham ishlaydi.
 *
 * Shuning uchun narx MASOFAGA emas, ikkita oddiy savolga tayanadi:
 *
 *   1. Bir hudud ichidami yoki hududlararomi?
 *   2. Og'irligi qancha?
 *
 * ── Nima uchun zona jadvali emas ──────────────────────────────────────
 * "Har hududga zona raqami berib, farqiga qarab hisoblash" degan
 * vasvasa bor edi. Lekin u yolg'on aniqlik beradi: Andijon va
 * Farg'ona yonma-yon, Andijon va Xorazm esa mamlakatning ikki
 * chekkasida — zona raqami buni ajrata olmaydi.
 *
 * Yagona tarif esa halol: u hech narsani "aniq bilaman" demaydi va
 * O'zbekistondagi haqiqiy pochta xizmatlari ham shunday ishlaydi.
 *
 * Xarita qo'shilganda narx funksiyasi almashtiriladi — jadval va
 * bosqichlar o'zgarmaydi.
 */

/** O'zbekiston hududlari — jo'natish nuqtalari. */
export const DELIVERY_REGIONS = [
  'Toshkent shahri',
  'Toshkent viloyati',
  'Andijon',
  'Buxoro',
  "Farg'ona",
  'Jizzax',
  'Xorazm',
  'Namangan',
  'Navoiy',
  'Qashqadaryo',
  "Qoraqalpog'iston",
  'Samarqand',
  'Sirdaryo',
  'Surxondaryo',
] as const;

export type DeliveryRegion = (typeof DELIVERY_REGIONS)[number];

/** Hudud ro'yxatda bormi. */
export function isDeliveryRegion(value: string): value is DeliveryRegion {
  return (DELIVERY_REGIONS as readonly string[]).includes(value);
}

/**
 * Tarif — barcha summalar SO'MDA yozilgan.
 *
 * So'mda yozish ataylab: bu fayl biznes qarori, uni dasturchi emas,
 * ilova egasi o'qiydi va o'zgartiradi. Tiyinga o'girish kodda
 * bajariladi.
 */
export const DELIVERY_TARIFF = {
  /** Bir hudud ichida (masalan Toshkent → Toshkent). */
  sameRegionSom: 15_000,
  /** Hududlararo — mamlakatning istalgan nuqtasiga. */
  crossRegionSom: 35_000,
  /**
   * Shu og'irlikkacha qo'shimcha to'lov yo'q.
   *
   * 1 kg — hujjat, kiyim, kichik quti kabi eng ko'p uchraydigan
   * jo'natmalarni qamrab oladi.
   */
  includedWeightGrams: 1_000,
  /** Har boshlangan qo'shimcha kilogramm uchun. */
  extraKilogramSom: 5_000,
  /**
   * Eng og'ir jo'natma.
   *
   * Undan kattasi — yuk mashinasi ishi va u boshqacha narxlanadi.
   * Chegarasiz qoldirilsa, kuryer motosiklda 50 kg olib ketishga
   * urinardi.
   */
  maxWeightGrams: 20_000,
  /** Eng yengil jo'natma — noldan katta bo'lishi shart. */
  minWeightGrams: 100,
  /**
   * Kuryerga tegadigan ulush (foizda).
   *
   * Qolgani platformaga: e'lon, qo'llab-quvvatlash va to'lov
   * xizmatlari xarajati shundan qoplanadi.
   */
  courierSharePercent: 60,
} as const;
