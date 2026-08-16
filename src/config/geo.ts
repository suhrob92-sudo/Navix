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

/**
 * "Yaqin atrofda" oralig'i — 50 kilometr.
 *
 * ── Nima uchun aynan shuncha ──────────────────────────────────────────
 * Toshkent shahri chetdan chetga ~30 km. Ellik kilometr butun
 * shaharni va yaqin tumanlarni qamrab oladi — ya'ni odam haqiqatan
 * borib kela oladigan masofa.
 *
 * Kamroq bo'lsa (masalan 5 km) lenta deyarli bo'sh bo'lardi: hozir
 * postlar kam va ular butun mamlakat bo'ylab tarqalgan.
 *
 * Ko'proq bo'lsa (200 km) "yaqin" so'zi ma'nosini yo'qotardi:
 * Samarqanddagi restoran toshkentlik uchun yaqin emas.
 */
export const NEARBY_RADIUS_KM = 50;

/** Bir daraja kenglik necha kilometr (Yer bo'ylab deyarli o'zgarmas). */
const KM_PER_LATITUDE_DEGREE = 111;

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/**
 * Nuqta atrofidagi to'rtburchak.
 *
 * ── Nima uchun DOIRA emas, to'rtburchak ───────────────────────────────
 * Baza doira bo'yicha qidira olmaydi — buning uchun PostGIS
 * kengaytmasi kerak, u esa serverni alohida sozlashni talab qiladi.
 *
 * To'rtburchak esa oddiy `>=` va `<=` shartlari: indeks ishlaydi va
 * so'rov tez bajariladi. Burchaklarda biroz ortiqcha hudud qoladi
 * (eng ko'pi ~41%), lekin bu "yaqin atrofda" uchun ahamiyatsiz —
 * u aniq o'lchov emas, taxminiy filtr.
 *
 * ── Nima uchun uzunlik boshqacha hisoblanadi ──────────────────────────
 * Meridianlar qutbga yaqinlashgan sari bir-biriga yaqinlashadi.
 * O'zbekistonda (~41°) bir daraja uzunlik ~84 km, kenglik esa
 * ~111 km. Farqni hisobga olmasak, to'rtburchak sharq-g'arb
 * yo'nalishida haddan tashqari cho'zilib ketardi.
 */
export function boundingBox(
  center: { latitude: number; longitude: number },
  radiusKm: number,
): BoundingBox {
  const latitudeDelta = radiusKm / KM_PER_LATITUDE_DEGREE;

  /**
   * Kosinus nolga yaqinlashsa (qutblarda) bo'linma cheksizlikka
   * ketardi. Pastki chegara buni to'xtatadi.
   */
  const cosine = Math.max(0.01, Math.cos(toRadians(center.latitude)));
  const longitudeDelta = radiusKm / (KM_PER_LATITUDE_DEGREE * cosine);

  return {
    minLatitude: center.latitude - latitudeDelta,
    maxLatitude: center.latitude + latitudeDelta,
    minLongitude: center.longitude - longitudeDelta,
    maxLongitude: center.longitude + longitudeDelta,
  };
}

/**
 * Masofani odam tiliga o'giradi: 0.35 → "350 m", 12.4 → "12 km".
 *
 * ── Nima uchun `Intl` EMAS ────────────────────────────────────────────
 * Loyihadagi barcha formatlash qo'lda: `Intl` server va brauzerda
 * boshqacha natija berib, React "hydration mismatch" xatosini
 * chiqarardi (sabab `src/lib/money.ts` da batafsil).
 *
 * ── Nima uchun 10 km dan keyin kasr YO'Q ──────────────────────────────
 * "12.4 km" va "12 km" orasida odam uchun farq yo'q, lekin kasr
 * qator uzunligini oshiradi va aniqlik borday taassurot qoldiradi —
 * holbuki koordinata ataylab ~110 metrga yaxlitlangan.
 */
export function formatDistanceUz(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';

  if (km < 1) {
    const meters = Math.max(10, Math.round((km * 1000) / 10) * 10);

    return `${meters} m`;
  }

  if (km < 10) {
    const rounded = Math.round(km * 10) / 10;

    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} km`;
  }

  return `${Math.round(km)} km`;
}
