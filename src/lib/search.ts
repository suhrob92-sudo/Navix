/**
 * Matnni QIDIRUVGA tayyorlaydigan yagona funksiya.
 *
 * ── Nima uchun alohida kerak ──────────────────────────────────────────
 * O'zbek tilida bitta so'z ko'p xil yoziladi:
 *
 *   Lag'mon · Lagʻmon · Lag`mon · Lagmon
 *   To'y oshi · Toʻy oshi · Toy oshi
 *
 * Klaviatura turlicha, odam esa ko'pincha apostrofni umuman yozmaydi.
 * Agar bazadagi "Lag'mon" ni foydalanuvchining "lagmon" so'zi bilan
 * to'g'ridan-to'g'ri solishtirsak — hech qachon topilmaydi.
 *
 * Shuning uchun IKKALA tomon ham shu funksiyadan o'tkaziladi:
 *  · baza tomonida — yozishda `searchName` ustuniga saqlanadi;
 *  · so'rov tomonida — foydalanuvchi matni shu ko'rinishga keltiriladi.
 *
 * Natijada solishtirish "olma-olma" bo'ladi.
 *
 * ── Nima uchun bazada alohida USTUN ───────────────────────────────────
 * Har safar `LOWER(REPLACE(name, ...))` yozish mumkin edi, lekin unda
 * indeks ishlamaydi va har qidiruv butun jadvalni o'qiydi. Alohida
 * ustun + indeks — qidiruv tez va oldindan aytiladigan bo'ladi.
 *
 * ── Chegara ───────────────────────────────────────────────────────────
 * Kirill yozuvi ("лагмон") hozircha o'girilmaydi. Menyular lotinda
 * kiritiladi; kerak bo'lsa keyinchalik shu yerga transliteratsiya
 * qo'shiladi va butun ilova avtomatik yangilanadi.
 */

/**
 * Apostrofning barcha ko'rinishlari.
 *
 * U+0027 oddiy, U+2018/U+2019 "aqlli" apostrof, U+02BB/U+02BC — o'zbek
 * alifbosining rasmiy belgilari (oʻ, gʻ), U+0060 esa klaviaturadagi
 * teskari tirnoq.
 */
const APOSTROPHES = /['’‘`ʻʼ´]/g;

/** Harf va raqamdan boshqa hamma narsa — probel. */
const NON_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu;

/**
 * Matnni solishtirishga tayyor ko'rinishga keltiradi.
 *
 * Ketma-ketlik muhim: avval apostrof BUTUNLAY olib tashlanadi
 * ("lag'mon" → "lagmon"), keyingina qolgan belgilar probelga
 * aylantiriladi. Aks holda "lag mon" bo'lib, ikkita so'zga bo'linib
 * ketardi.
 *
 * @example
 *   toSearchText("Lag'mon")        // "lagmon"
 *   toSearchText('Manti (5 dona)') // "manti 5 dona"
 *   toSearchText("  KO'K   CHOY ") // "kok choy"
 */
export function toSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(APOSTROPHES, '')
    .replace(NON_ALPHANUMERIC, ' ')
    .trim();
}
