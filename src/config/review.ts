/**
 * Baho va sharh — yagona sozlama.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Tekshiruvda ma'lum bo'ldi: bazadagi reyting SOXTA edi. Texnomart
 * do'koni "4.7 (3420 baho)" deb ko'rsatilardi, lekin uning ortida
 * birorta ham haqiqiy baho yo'q edi — bu son shunchaki boshlang'ich
 * ma'lumotga yozib qo'yilgan edi.
 *
 * Bu oddiy kamchilik emas: xaridor aynan shu songa qarab qaror
 * qabul qiladi. Yolg'on reyting — yolg'on va'da.
 *
 * ── Modulning ASOSIY qoidasi: faqat HAQIQIY xaridor ───────────────────
 * Baho qo'yish uchun odam shu narsani sotib olgan bo'lishi SHART:
 * mahsulotni buyurtma qilgan, taomni yegan, mehmonxonada yashagan.
 *
 * ── Nima uchun aynan shunday ──────────────────────────────────────────
 * Ochiq baho tizimi bir hafta ichida buziladi:
 *
 *   1. sotuvchi o'ziga o'nta hisob ochib, 5 baho qo'yadi;
 *   2. raqobatchi ham o'nta hisob ochib, 1 baho qo'yadi;
 *   3. reyting yana ma'nosiz songa aylanadi.
 *
 * "Faqat xaridor" qoidasi buni to'xtatadi, chunki soxta baho endi
 * PUL turadi: buyurtma berish va yetkazib olish kerak.
 *
 * ── Nima uchun tasdiqlovchi buyurtma SAQLANADI ────────────────────────
 * Bahoning yonida "qaysi buyurtma buni tasdiqladi" degan yozuv
 * turadi. Buyurtma keyinchalik qaytarilsa yoki firibgarlik aniqlansa,
 * o'sha bahoni topish mumkin bo'ladi.
 */

/** Nimaga baho qo'yilyapti. */
export type ReviewTarget = 'PRODUCT' | 'MENU_ITEM' | 'RESTAURANT' | 'SHOP' | 'HOTEL';

/** Barcha turlar — tekshiruv va sinovlar uchun. */
export const REVIEW_TARGETS: readonly ReviewTarget[] = [
  'PRODUCT',
  'MENU_ITEM',
  'RESTAURANT',
  'SHOP',
  'HOTEL',
];

/**
 * Turning bazadagi ustun nomi.
 *
 * Jadval qo'lda yozilgan: `MENU_ITEM` -> `menuItemId` kabi holatlar
 * avtomatik qoidani buzardi.
 */
export const TARGET_COLUMN: Record<ReviewTarget, string> = {
  PRODUCT: 'productId',
  MENU_ITEM: 'menuItemId',
  RESTAURANT: 'restaurantId',
  SHOP: 'shopId',
  HOTEL: 'hotelId',
};

/** Turning manzildagi nomi. */
export const TARGET_SLUG: Record<ReviewTarget, string> = {
  PRODUCT: 'product',
  MENU_ITEM: 'menu-item',
  RESTAURANT: 'restaurant',
  SHOP: 'shop',
  HOTEL: 'hotel',
};

/** Turning o'zbekcha nomi — xato matnlarida ishlatiladi. */
export const TARGET_LABEL: Record<ReviewTarget, string> = {
  PRODUCT: 'Mahsulot',
  MENU_ITEM: 'Taom',
  RESTAURANT: 'Restoran',
  SHOP: "Do'kon",
  HOTEL: 'Mehmonxona',
};

/** Manzildagi nomdan turni topadi. `null` — noma'lum manzil (404). */
export function targetFromSlug(slug: string): ReviewTarget | null {
  const found = REVIEW_TARGETS.find((target) => TARGET_SLUG[target] === slug);

  return found ?? null;
}

/** Turning sharhlar manzili. */
export function reviewsPath(target: ReviewTarget, targetId: string): string {
  return `/api/v1/reviews/${TARGET_SLUG[target]}/${targetId}`;
}

/** Eng past va eng yuqori baho. */
export const MIN_RATING = 1;
export const MAX_RATING = 5;

/**
 * Sharh matnining uzunligi.
 *
 * ── Nima uchun 1000 belgi ─────────────────────────────────────────────
 * Foydali sharh odatda 2-5 gap: "kutganimdan tez keldi, quti biroz
 * ezilgan". Undan uzunini hech kim o'qimaydi va u ro'yxatni
 * to'ldirib yuboradi.
 */
export const REVIEW_BODY_MAX_LENGTH = 1_000;

/** Bir sahifada nechta sharh. */
export const REVIEW_PAGE_SIZE = 10;

/**
 * Baho MAJBURIY, matn esa IXTIYORIY.
 *
 * ── Nima uchun shunday ────────────────────────────────────────────────
 * Odamlarning katta qismi yozishni xohlamaydi, lekin yulduz bosishga
 * rozi. Matnni majburiy qilsak, bahoni ham yo'qotardik — ya'ni
 * reytingni.
 *
 * Bo'sh matnli baho ham to'liq qiymatga ega: reyting undan
 * hisoblanadi.
 */
export const REVIEW_BODY_REQUIRED = false;

/**
 * Baho qo'yishga ruxsat yo'qligining sababi.
 *
 * ── Nima uchun sabab AYTILADI ─────────────────────────────────────────
 * Tugmani shunchaki yashirish — eng yomon yechim: odam nima uchun
 * baho qo'ya olmayotganini bilmaydi va buni xato deb o'ylaydi.
 */
export type ReviewBlockReason =
  | 'NOT_PURCHASED'
  | 'NOT_DELIVERED'
  | 'NOT_STAYED'
  | 'GUEST';

export const BLOCK_REASON_TEXT: Record<ReviewBlockReason, string> = {
  NOT_PURCHASED: "Baho qo'yish uchun avval buyurtma bering",
  NOT_DELIVERED: "Buyurtma yetkazilgach baho qo'ya olasiz",
  NOT_STAYED: "Yashab chiqqaningizdan keyin baho qo'ya olasiz",
  GUEST: "Baho qo'yish uchun hisobingizga kiring",
};

/**
 * O'rtacha bahoni hisoblaydi.
 *
 * ── Nima uchun O'NDAN BIRIGACHA yaxlitlanadi ──────────────────────────
 * Bazada reyting `Decimal(2,1)` ko'rinishida saqlanadi — ya'ni
 * "4.7". Ikki xonali kasr saqlansa ham, ekranda baribir bittasi
 * ko'rinardi va baza bilan ekran o'rtasida farq paydo bo'lardi.
 *
 * ── Nima uchun `toFixed` EMAS ─────────────────────────────────────────
 * `toFixed` MATN qaytaradi va uni yana songa o'girish kerak bo'lardi.
 * Bundan tashqari u ba'zi qiymatlarda kutilmagan natija beradi
 * (`1.005.toFixed(2)` -> "1.00").
 */
export function averageRating(sum: number, count: number): number {
  if (count <= 0) return 0;

  return Math.round((sum / count) * 10) / 10;
}

/**
 * Bahoni ekran uchun matnga aylantiradi.
 *
 * ── Nima uchun baho YO'Q holati alohida ───────────────────────────────
 * Bahosi yo'q do'kon "0.0" deb ko'rsatilsa, u ENG YOMON do'kondek
 * ko'rinardi — holbuki u shunchaki yangi.
 *
 * Bu farq soxta reytingni tuzatgandan keyin ayniqsa muhim bo'ldi:
 * endi ko'p narsaning bahosi yo'q va ular jazolanmasligi kerak.
 */
export function formatRating(rating: number, count: number): string {
  if (count <= 0) return "Baho yo'q";

  const whole = Math.trunc(rating);
  const tenth = Math.round((rating - whole) * 10);

  return `${whole}.${tenth}`;
}

/** Baho soni: "12 ta baho". */
export function ratingCountText(count: number): string {
  if (count <= 0) return "Hali baho yo'q";

  return `${count} ta baho`;
}

/**
 * Bahoning ulushi — ustunli diagramma uchun (0 dan 100 gacha).
 *
 * ── Nima uchun foiz, son emas ─────────────────────────────────────────
 * Ustun kengligi foizda beriladi. Sonni ekranda ham ko'rsatamiz,
 * lekin ustun uzunligi ULUSHGA bog'liq: 3 tadan 2 tasi va 300 tadan
 * 200 tasi bir xil ko'rinishi kerak.
 */
export function ratingShare(count: number, total: number): number {
  if (total <= 0) return 0;

  return Math.round((count / total) * 100);
}

/** Baho darajasining nomi — yulduz tanlashda ko'rsatiladi. */
export const RATING_LABEL: Record<number, string> = {
  1: 'Juda yomon',
  2: 'Yomon',
  3: "O'rtacha",
  4: 'Yaxshi',
  5: 'Ajoyib',
};

/** Bahoni chegara ichiga qamaydi — ekranda yulduz chizishda ishlatiladi. */
export function clampRating(value: number): number {
  if (!Number.isFinite(value)) return MIN_RATING;

  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(value)));
}
