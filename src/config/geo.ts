/**
 * O'zbekiston geografiyasi — YAGONA manba.
 *
 * ── Nima uchun bu fayl kerak bo'ldi ───────────────────────────────────
 * Hudud ro'yxati ilgari `delivery.ts` da turardi va nomi ham
 * `DELIVERY_REGIONS` edi. Endi u yetkazib berishdan tashqarida ham
 * kerak: videoga joylashuv biriktirilganda ham xuddi shu ro'yxat
 * ishlatiladi.
 *
 * Ro'yxat ikki joyda takrorlansa, ertaga yangi viloyat qo'shilganda
 * bittasi unutilardi va ikkita bo'lim bir-biriga mos kelmay qolardi.
 */

/** O'zbekiston hududlari. */
export const UZ_REGIONS = [
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

export type UzRegion = (typeof UZ_REGIONS)[number];

/** Hudud ro'yxatda bormi. */
export function isUzRegion(value: string): value is UzRegion {
  return (UZ_REGIONS as readonly string[]).includes(value);
}

/**
 * Hudud markazlarining koordinatalari.
 *
 * ── Nima uchun TAXMINIY nuqtalar yetarli ──────────────────────────────
 * Ular ikki ish uchun ishlatiladi:
 *   1. Telefon bergan koordinata qaysi hududga tushishini aniqlash;
 *   2. Odam hududni QO'LDA tanlaganda taxminiy nuqta qo'yish.
 *
 * Ikkalasida ham bir necha kilometrlik xato ahamiyatsiz: biz "qaysi
 * viloyat" degan savolga javob beramiz, "qaysi uy" degan savolga
 * emas.
 *
 * ── Nima uchun tashqi xizmat ISHLATILMAYDI ────────────────────────────
 * Google yoki Yandex geokodlash xizmati aniqroq nom berardi, lekin:
 *   · u pullik va kalit talab qiladi;
 *   · har bir post uchun tashqi so'rov — sekinlik va bog'liqlik;
 *   · foydalanuvchi koordinatasi begona xizmatga ketardi.
 *
 * O'n to'rtta nuqta esa doimo qo'l ostida va hech qayerga so'rov
 * yubormaydi.
 */
export const UZ_REGION_CENTERS: Record<UzRegion, { latitude: number; longitude: number }> = {
  'Toshkent shahri': { latitude: 41.3111, longitude: 69.2401 },
  'Toshkent viloyati': { latitude: 41.0333, longitude: 69.3428 },
  Andijon: { latitude: 40.7829, longitude: 72.3442 },
  Buxoro: { latitude: 39.7675, longitude: 64.4231 },
  "Farg'ona": { latitude: 40.3864, longitude: 71.7864 },
  Jizzax: { latitude: 40.1158, longitude: 67.8422 },
  Xorazm: { latitude: 41.5506, longitude: 60.6314 },
  Namangan: { latitude: 40.9983, longitude: 71.6726 },
  Navoiy: { latitude: 40.1039, longitude: 65.3733 },
  Qashqadaryo: { latitude: 38.8606, longitude: 65.7891 },
  "Qoraqalpog'iston": { latitude: 42.4531, longitude: 59.6103 },
  Samarqand: { latitude: 39.6542, longitude: 66.9597 },
  Sirdaryo: { latitude: 40.4897, longitude: 68.7842 },
  Surxondaryo: { latitude: 37.2242, longitude: 67.2783 },
};

/** Yer radiusi (km) — masofa hisoblash uchun. */
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Ikki nuqta orasidagi masofa (kilometr).
 *
 * ── Nima uchun "haversine" ────────────────────────────────────────────
 * Oddiy Pifagor formulasi tekislik uchun, Yer esa shar. Kichik
 * masofalarda farq sezilmaydi, lekin viloyatlar orasida u o'nlab
 * kilometrga yetadi.
 *
 * PostGIS kabi kengaytma ham bor, lekin u serverni sozlashni talab
 * qiladi. Bizga esa faqat masofa kerak — u yigirma qatorlik.
 */
export function distanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Koordinata qaysi hududga eng yaqin.
 *
 * Telefon faqat raqam beradi ("41.31, 69.24"). Odamga esa nom kerak —
 * shu funksiya raqamni nomga aylantiradi.
 */
export function nearestRegion(point: { latitude: number; longitude: number }): UzRegion {
  let best: UzRegion = UZ_REGIONS[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const region of UZ_REGIONS) {
    const distance = distanceKm(point, UZ_REGION_CENTERS[region]);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }

  return best;
}

/**
 * Koordinata ANIQLIGI ataylab pasaytiriladi.
 *
 * ── XAVFSIZLIK: bu eng muhim qaror ────────────────────────────────────
 * Telefon koordinatani bir necha metr aniqlikda beradi. Uni o'z
 * holicha saqlab, ochiq postga biriktirsak — odam uydan video
 * joylaganda UY MANZILI hammaga ko'rinardi.
 *
 * Uch xonali kasr ~110 metr aniqlik beradi: "qaysi mahalla" degan
 * savolga javob beradi, "qaysi uy" degan savolga esa yo'q.
 *
 * Bu "yaqin atrofda" uchun mutlaqo yetarli va odamni himoya qiladi.
 */
export const COORDINATE_PRECISION = 3;

export function blurCoordinate(value: number): number {
  const factor = 10 ** COORDINATE_PRECISION;

  return Math.round(value * factor) / factor;
}

/** Koordinata haqiqiy chegaralar ichidami. */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}
