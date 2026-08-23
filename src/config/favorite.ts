/**
 * Sevimlilar — yagona sozlama.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Xaridorlarning katta qismi birinchi ko'rishda sotib olmaydi: u
 * narxni taqqoslaydi, maoshni kutadi yoki shunchaki o'ylab
 * ko'rmoqchi bo'ladi.
 *
 * Ro'yxatsiz u mahsulotni ERTAGA TOPA OLMAYDI — qidiruvda nima deb
 * yozganini ham eslamaydi. Va qaytmaydi.
 *
 * ── Nima uchun BITTA modul, beshta emas ───────────────────────────────
 * "Sevimli mahsulotlar", "sevimli restoranlar", "saqlangan
 * vakansiyalar" — bularning hammasi bitta narsa: "keyin qaytaman".
 *
 * Alohida yozilsa, sevimlilar sahifasi beshta so'rovni birlashtirishga
 * majbur bo'lardi va yurakcha tugmasi beshta joyda takrorlanardi.
 */

/** Nimani saqlash mumkin. */
export type FavoriteTarget = 'PRODUCT' | 'MENU_ITEM' | 'RESTAURANT' | 'HOTEL' | 'VACANCY';

/** Barcha turlar — tekshiruv va sinovlar uchun. */
export const FAVORITE_TARGETS: readonly FavoriteTarget[] = [
  'PRODUCT',
  'MENU_ITEM',
  'RESTAURANT',
  'HOTEL',
  'VACANCY',
];

/** Turning bazadagi ustun nomi. */
export const FAVORITE_COLUMN: Record<FavoriteTarget, string> = {
  PRODUCT: 'productId',
  MENU_ITEM: 'menuItemId',
  RESTAURANT: 'restaurantId',
  HOTEL: 'hotelId',
  VACANCY: 'vacancyId',
};

/** Turning manzildagi nomi. */
export const FAVORITE_SLUG: Record<FavoriteTarget, string> = {
  PRODUCT: 'product',
  MENU_ITEM: 'menu-item',
  RESTAURANT: 'restaurant',
  HOTEL: 'hotel',
  VACANCY: 'vacancy',
};

/** Turning o'zbekcha nomi — xato matnlarida ishlatiladi. */
export const FAVORITE_LABEL: Record<FavoriteTarget, string> = {
  PRODUCT: 'Mahsulot',
  MENU_ITEM: 'Taom',
  RESTAURANT: 'Restoran',
  HOTEL: 'Mehmonxona',
  VACANCY: 'Vakansiya',
};

/**
 * Sevimlilar sahifasidagi bo'lim nomi.
 *
 * Ko'plikda: bo'lim ichida bir nechta narsa turadi.
 */
export const FAVORITE_GROUP_LABEL: Record<FavoriteTarget, string> = {
  PRODUCT: 'Mahsulotlar',
  MENU_ITEM: 'Taomlar',
  RESTAURANT: 'Restoranlar',
  HOTEL: 'Mehmonxonalar',
  VACANCY: 'Vakansiyalar',
};

/** Manzildagi nomdan turni topadi. `null` — noma'lum manzil (404). */
export function favoriteTargetFromSlug(slug: string): FavoriteTarget | null {
  const found = FAVORITE_TARGETS.find((target) => FAVORITE_SLUG[target] === slug);

  return found ?? null;
}

/** Turning sevimlilar manzili. */
export function favoritePath(target: FavoriteTarget, targetId: string): string {
  return `/api/v1/favorites/${FAVORITE_SLUG[target]}/${targetId}`;
}

/**
 * Ro'yxatning eng katta hajmi.
 *
 * ── Nima uchun chegara kerak ──────────────────────────────────────────
 * Chegarasiz ro'yxat vaqt o'tishi bilan minglab yozuvga yetardi va
 * sevimlilar sahifasi ochilmay qolardi.
 *
 * 200 ta — haqiqiy foydalanish uchun juda ko'p (odam odatda 10-30 ta
 * narsa saqlaydi), lekin skript uchun aniq chegara.
 */
export const MAX_FAVORITES_PER_TARGET = 200;

/**
 * Yurakcha tugmasining matni.
 *
 * ── Nima uchun matn kerak ─────────────────────────────────────────────
 * Tugmada faqat belgi turadi va ekranni o'quvchi dastur uni umuman
 * o'qiy olmaydi. Bu matn `aria-label` sifatida beriladi.
 */
export function favoriteButtonLabel(isFavorite: boolean, name: string): string {
  return isFavorite ? `${name} — sevimlilardan olib tashlash` : `${name} — sevimlilarga qo'shish`;
}

/** Bo'sh ro'yxat matni — har bir bo'lim uchun boshqacha. */
export const EMPTY_FAVORITES_TEXT: Record<FavoriteTarget, string> = {
  PRODUCT: "Yoqqan mahsulotni yurakcha bilan belgilang — u shu yerda turadi.",
  MENU_ITEM: "Yoqqan taomni belgilang — keyingi safar qidirib o'tirmaysiz.",
  RESTAURANT: 'Yoqqan restoranni belgilang.',
  HOTEL: "Yoqqan mehmonxonani belgilang — narxi tushganda qaytib ko'rasiz.",
  VACANCY: "Mos vakansiyani belgilang — hujjatlaringizni tayyorlab, keyin ariza yuborasiz.",
};
