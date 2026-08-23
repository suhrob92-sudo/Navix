/**
 * Yaqinda ko'rilganlar — yagona sozlama.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Odam mahsulotni ochadi, "o'ylab ko'raman" deb chiqib ketadi va
 * ertaga uni TOPA OLMAYDI: yurakcha bosishni unutgan, qidiruvda
 * nima deb yozganini ham eslamaydi.
 *
 * Bu ro'yxat esa hech narsa talab qilmaydi — u O'ZI to'ladi.
 *
 * ── Sevimlilardan FARQI ───────────────────────────────────────────────
 * Sevimlilar — QAROR: odam ataylab belgilaydi va ataylab olib
 * tashlaydi. Bu ro'yxat esa qarorsiz to'ladi va eskisi o'zi tushib
 * ketadi.
 *
 * Shuning uchun ular alohida jadval va alohida sahifa: bittasini
 * tozalash ikkinchisiga tegmaydi.
 *
 * ── Nima uchun BAZADA, brauzerda emas ─────────────────────────────────
 * Brauzerda saqlash arzonroq bo'lardi (yozuv umuman ketmasdi).
 *
 * Lekin ro'yxatning butun ma'nosi ODAMNI QAYTARISHDA. Odam
 * telefonda ko'rib, kechqurun kompyuterda qidirsa yoki brauzer
 * ma'lumotini tozalasa — ro'yxat yo'q bo'lardi va u aynan
 * kerakli paytda ishlamasdi.
 */

/** Nimalar eslab qolinadi. */
export type RecentTarget = 'PRODUCT' | 'MENU_ITEM' | 'RESTAURANT' | 'HOTEL' | 'VACANCY';

/** Barcha turlar — tekshiruv va sinovlar uchun. */
export const RECENT_TARGETS: readonly RecentTarget[] = [
  'PRODUCT',
  'MENU_ITEM',
  'RESTAURANT',
  'HOTEL',
  'VACANCY',
];

/** Turning bazadagi ustun nomi. */
export const RECENT_COLUMN: Record<RecentTarget, string> = {
  PRODUCT: 'productId',
  MENU_ITEM: 'menuItemId',
  RESTAURANT: 'restaurantId',
  HOTEL: 'hotelId',
  VACANCY: 'vacancyId',
};

/** Turning manzildagi nomi. */
export const RECENT_SLUG: Record<RecentTarget, string> = {
  PRODUCT: 'product',
  MENU_ITEM: 'menu-item',
  RESTAURANT: 'restaurant',
  HOTEL: 'hotel',
  VACANCY: 'vacancy',
};

/** Manzildagi nomdan turni topadi. `null` — noma'lum manzil (404). */
export function recentTargetFromSlug(slug: string): RecentTarget | null {
  const found = RECENT_TARGETS.find((target) => RECENT_SLUG[target] === slug);

  return found ?? null;
}

/** Ko'rilganini belgilash manzili. */
export function recentPath(target: RecentTarget, targetId: string): string {
  return `/api/v1/recent/${RECENT_SLUG[target]}/${targetId}`;
}

/**
 * Bitta odamda eng ko'p nechta yozuv saqlanadi.
 *
 * ── Nima uchun 60 ta ──────────────────────────────────────────────────
 * Ro'yxat cheksiz o'ssa, faol foydalanuvchida bir yilda minglab
 * yozuv yig'ilardi va u hech kimga kerak bo'lmasdi: odam bir oy
 * oldin ko'rgan mahsulotni izlamaydi.
 *
 * 60 ta — bir necha kunlik ko'rish tarixi. Undan eskisi o'zi
 * tushib ketadi.
 */
export const MAX_RECENT_VIEWS = 60;

/**
 * Bosh sahifadagi qatorda nechta ko'rsatiladi.
 *
 * Qator gorizontal suriladi, shuning uchun ko'p bo'lishi shart
 * emas: odam 10 tadan ortig'ini surmaydi.
 */
export const RECENT_ROW_SIZE = 10;

/** Turning o'zbekcha nomi — xato matnlarida ishlatiladi. */
export const RECENT_LABEL: Record<RecentTarget, string> = {
  PRODUCT: 'Mahsulot',
  MENU_ITEM: 'Taom',
  RESTAURANT: 'Restoran',
  HOTEL: 'Mehmonxona',
  VACANCY: 'Vakansiya',
};
