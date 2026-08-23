/**
 * Katalog rasmlari — yagona sozlama.
 *
 * ── Nima uchun bu modul kerak ─────────────────────────────────────────
 * Tekshiruvda ma'lum bo'ldi: bazadagi HECH BIR savdo jadvalida rasm
 * maydoni yo'q edi. Mahsulot, taom, mehmonxona, xona, do'kon, restoran
 * va kompaniya — hammasi rangli kvadrat bilan ko'rsatilardi.
 *
 * Ya'ni odam telefon g'ilofi sotib olmoqchi bo'lsa, uning qanday
 * ko'rinishini umuman ko'ra olmasdi. Hech bir do'kon bunday
 * ishlamaydi: xaridor avval KO'RADI, keyin narxga qaraydi.
 *
 * ── Nima uchun BITTA jadval, har biriga ustun emas ────────────────────
 * Yetti jadvalga bittadan `imageUrl` ustuni qo'shish oson edi. Lekin
 * unda:
 *
 *   1. har bir narsaga FAQAT BITTA rasm sig'ardi — galereya bo'lmasdi;
 *   2. tartibni o'zgartirish (qaysi rasm birinchi turadi) imkonsiz
 *      bo'lardi;
 *   3. rasm qo'shish, o'chirish va tartiblash kodi yetti marta
 *      takrorlanardi va ertaga bittasida tuzatilgan xato qolgan
 *      oltitasida qolib ketardi.
 *
 * Shuning uchun rasmlar BITTA jadvalda saqlanadi va har bir jadval
 * uchun alohida tashqi kalit ustuni bor.
 *
 * ── Nima uchun "umumiy" (polimorf) jadval emas ────────────────────────
 * `entityType` + `entityId` juftligi bilan ham yozish mumkin edi va u
 * yangi tur qo'shishni osonlashtirardi.
 *
 * Lekin o'shanda BAZA DARAJASIDAGI bog'liqlik yo'qolardi: mahsulot
 * o'chirilsa, uning rasmlari jadvalda abadiy qolib ketardi va ularni
 * hech kim topa olmasdi. Loyihada esa barcha bog'liqliklar baza
 * darajasida qulflangan.
 *
 * Narxi: yangi tur qo'shishda ko'chirish yozish kerak. Bu ochiq va
 * ataylab tanlangan narx.
 */

/**
 * Bitta narsaga eng ko'p nechta rasm.
 *
 * ── Nima uchun 8 ta ───────────────────────────────────────────────────
 * Amazon va Uzum odatda 5-8 ta rasm ko'rsatadi. Undan ortig'ini
 * xaridor varaqlamaydi — u qarorni birinchi uch rasmda qabul qiladi.
 *
 * Chegara sotuvchini ham himoya qiladi: 30 ta rasm yuklash sahifani
 * og'irlashtiradi va mobil internetda ochilmay qoladi.
 */
export const MAX_CATALOG_IMAGES = 8;

/**
 * Rasm tavsifi (alt) uzunligi.
 *
 * ── Nima uchun tavsif kerak ───────────────────────────────────────────
 * Ko'zi ojiz odam ekranni o'quvchi dastur bilan ishlaydi va u rasm
 * o'rniga aynan shu matnni o'qiydi. Tavsifsiz rasm unga "rasm" deb
 * eshitiladi, xolos.
 *
 * Bundan tashqari internet sekin bo'lganda rasm o'rniga shu matn
 * ko'rinadi.
 */
export const IMAGE_ALT_MAX_LENGTH = 120;

/**
 * Rasm QAYSI narsaga tegishli.
 *
 * Har biriga bazada alohida ustun mos keladi.
 */
export type CatalogImageOwner =
  | 'PRODUCT'
  | 'MENU_ITEM'
  | 'HOTEL'
  | 'HOTEL_ROOM'
  | 'RESTAURANT'
  | 'SHOP'
  | 'COMPANY';

/** Barcha turlar — tekshiruv va sinovlar uchun. */
export const CATALOG_IMAGE_OWNERS: readonly CatalogImageOwner[] = [
  'PRODUCT',
  'MENU_ITEM',
  'HOTEL',
  'HOTEL_ROOM',
  'RESTAURANT',
  'SHOP',
  'COMPANY',
];

/**
 * Turning bazadagi ustun nomi.
 *
 * ── Nima uchun jadval ALOHIDA yozilgan ────────────────────────────────
 * Nomni avtomatik yasash mumkin edi (`PRODUCT` -> `productId`), lekin
 * `MENU_ITEM` -> `menuItemId` kabi holatlar qoidani buzardi. Aniq
 * jadval esa hech qachon yanglishmaydi va uni o'qib chiqish mumkin.
 */
export const OWNER_COLUMN: Record<CatalogImageOwner, string> = {
  PRODUCT: 'productId',
  MENU_ITEM: 'menuItemId',
  HOTEL: 'hotelId',
  HOTEL_ROOM: 'hotelRoomId',
  RESTAURANT: 'restaurantId',
  SHOP: 'shopId',
  COMPANY: 'companyId',
};

/** Turning o'zbekcha nomi — xato matnlarida ishlatiladi. */
export const OWNER_LABEL: Record<CatalogImageOwner, string> = {
  PRODUCT: 'Mahsulot',
  MENU_ITEM: 'Taom',
  HOTEL: 'Mehmonxona',
  HOTEL_ROOM: 'Xona',
  RESTAURANT: 'Restoran',
  SHOP: "Do'kon",
  COMPANY: 'Kompaniya',
};

/**
 * Rasmlar tartibi.
 *
 * ── Nima uchun `sortOrder`, `createdAt` emas ──────────────────────────
 * Vaqt bo'yicha tartiblansa, sotuvchi eng yaxshi rasmni birinchi
 * qilish uchun QOLGANLARINI qaytadan yuklashi kerak bo'lardi.
 *
 * Tartib raqami esa uni bir bosishda o'zgartirishga imkon beradi.
 */
export const FIRST_SORT_ORDER = 0;

/** Ro'yxatda ko'rsatiladigan asosiy rasm — eng kichik tartib raqamli. */
export function primaryImage<T extends { sortOrder: number }>(images: readonly T[]): T | null {
  if (images.length === 0) return null;

  return [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

/**
 * Yangi rasm uchun tartib raqami.
 *
 * Oxiriga qo'shiladi: yangi rasm mavjudlarining o'rnini
 * o'zgartirmasligi kerak.
 */
export function nextSortOrder(images: readonly { sortOrder: number }[]): number {
  if (images.length === 0) return FIRST_SORT_ORDER;

  return Math.max(...images.map((image) => image.sortOrder)) + 1;
}

/**
 * Rasm tavsifi berilmagan bo'lsa, nomdan yasaydi.
 *
 * ── Nima uchun bo'sh qoldirilmaydi ────────────────────────────────────
 * Sotuvchi tavsif yozishni deyarli hech qachon xohlamaydi. Bo'sh
 * qoldirilsa, ekranni o'quvchi dastur "rasm" deb o'qiydi — bu
 * hech qanday ma'lumot bermaydi.
 *
 * Mahsulot nomi esa har doim bor va u tavsif sifatida yetarli.
 */
export function fallbackAlt(ownerName: string, index: number): string {
  const clean = ownerName.trim().slice(0, IMAGE_ALT_MAX_LENGTH - 20);

  return index === 0 ? clean : `${clean} — ${index + 1}-rasm`;
}

/**
 * Turning manzildagi nomi.
 *
 * ── Nima uchun manzilda BOSHQA yozuv ──────────────────────────────────
 * `MENU_ITEM` manzilga `/catalog/MENU_ITEM/...` bo'lib tushardi — bu
 * internetdagi manzil qoidalariga zid: manzil kichik harfda va
 * tire bilan yoziladi.
 *
 * Ikki jadval bir-biriga qarama-qarshi bo'lib qolmasligi uchun ular
 * bitta sinov bilan taqqoslanadi.
 */
export const OWNER_SLUG: Record<CatalogImageOwner, string> = {
  PRODUCT: 'product',
  MENU_ITEM: 'menu-item',
  HOTEL: 'hotel',
  HOTEL_ROOM: 'hotel-room',
  RESTAURANT: 'restaurant',
  SHOP: 'shop',
  COMPANY: 'company',
};

/**
 * Manzildagi nomdan turni topadi.
 *
 * ── Nima uchun `null`, xato emas ──────────────────────────────────────
 * Bu funksiya manzilni tekshiradi, ya'ni unga TASODIFIY matn ham
 * kelishi mumkin (izlovchi robot, eski havola). Xato tashlash o'rniga
 * `null` qaytarish chaqiruvchiga "404" deb javob berish imkonini
 * beradi.
 */
export function ownerFromSlug(slug: string): CatalogImageOwner | null {
  const found = CATALOG_IMAGE_OWNERS.find((owner) => OWNER_SLUG[owner] === slug);

  return found ?? null;
}

/** Turning rasmlar manzili. */
export function catalogImagesPath(owner: CatalogImageOwner, ownerId: string): string {
  return `/api/v1/catalog/${OWNER_SLUG[owner]}/${ownerId}/images`;
}
