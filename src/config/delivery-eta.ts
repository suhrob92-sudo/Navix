/**
 * Yetkazish vaqti va kuryer masofasi — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Buyurtma sahifasida "Yo'lda" degan yozuv turardi. U to'g'ri edi,
 * lekin odamning savoliga javob bermasdi: "yana qancha kutaman?".
 *
 * Javobsiz kutish uzoq tuyuladi. Odam har besh daqiqada sahifani
 * ochib qaraydi, keyin restoranga qo'ng'iroq qiladi — ikkalasi ham
 * keraksiz ish.
 *
 * ── Nima uchun ETA HISOBLANADI, va'da qilinmaydi ──────────────────────
 * "18:45 da yetkaziladi" degan aniq va'da bajarilmasa, odam
 * aldangandek his qiladi.
 *
 * Shuning uchun matn har doim TAXMIN ekanini bildiradi ("~15 daqiqa")
 * va hisob real ma'lumotga tayanadi: kuryerning haqiqiy joylashuvi
 * va shahar sharoitidagi o'rtacha tezlik.
 */

/** Yer radiusi — KILOMETRDA. */
const EARTH_RADIUS_KM = 6371;

/**
 * Shahardagi kuryerning o'rtacha tezligi — SOATIGA KILOMETR.
 *
 * ── Nima uchun 18 km/soat ─────────────────────────────────────────────
 * Motorollning texnik tezligi ancha yuqori, lekin ETA hisobida
 * boshqa narsa muhim: svetoforlar, tirbandlik, bir tomonlama
 * ko'chalar va manzilni izlash.
 *
 * Toshkent sharoitida "eshikdan eshikkacha" o'rtacha tezlik shu
 * atrofda. Yuqori son ETA ni chiroyli qilardi, lekin u har safar
 * buzilardi — bu esa hech qanday ETA dan ham yomon.
 */
export const COURIER_SPEED_KMH = 18;

/**
 * To'g'ri chiziqni HAQIQIY yo'lga aylantirish koeffitsienti.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Ikki nuqta orasidagi masofa "qush uchishi" bo'yicha hisoblanadi.
 * Kuryer esa ko'chalar bo'ylab yuradi va uning yo'li har doim
 * uzunroq.
 *
 * Shahar to'rida bu farq odatda 1.3 barobar atrofida. Usiz ETA
 * doim optimistik chiqardi.
 */
export const ROUTE_FACTOR = 1.3;

/**
 * Joylashuv shuncha daqiqadan keyin ESKI hisoblanadi.
 *
 * ── Nima uchun muhim ──────────────────────────────────────────────────
 * Kuryerning telefoni o'chgan yoki interneti uzilgan bo'lishi
 * mumkin. O'shanda xaritadagi nuqta joyida qotib qoladi.
 *
 * Eski nuqtani "kuryer shu yerda" deb ko'rsatish yolg'on bo'lardi —
 * odam unga qarab eshikka chiqib, sovuqda kutib turardi.
 */
export const LOCATION_FRESH_MINUTES = 5;

/**
 * Joylashuv shundan qo'polroq bo'lsa — QABUL QILINMAYDI (metrda).
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Brauzer GPS o'chiq bo'lsa ham javob beradi: Wi-Fi yoki mobil
 * ustun bo'yicha. Bunday nuqtaning xatosi bir necha kilometr
 * bo'lishi mumkin.
 *
 * Uni xaritada ko'rsatish "kuryer boshqa tumanda" degan yolg'on
 * taassurot berardi. Yaxshisi — hech narsa ko'rsatmaslik.
 */
export const MAX_LOCATION_ACCURACY_M = 500;

/**
 * Kuryerning telefoni joylashuvni shuncha soniyada bir yuboradi.
 *
 * ── Nima uchun aynan 20 soniya ────────────────────────────────────────
 * Tez-tez yuborish batareyani yeydi va serverga keraksiz yuk beradi.
 * Kamdan-kam yuborish esa xaritadagi nuqtani "sakraydigan" qiladi.
 *
 * 18 km/soat tezlikda 20 soniyada taxminan 100 metr bosib o'tiladi —
 * xaritada bu silliq harakat bo'lib ko'rinadi.
 */
export const LOCATION_REPORT_SECONDS = 20;

/** Joylashuv xaritada ko'rsatishga YETARLICHA aniqmi. */
export function isAccurateEnough(accuracy: number | null | undefined): boolean {
  /*
    Aniqlik NOMA'LUM bo'lsa qabul qilinadi: eski brauzerlar uni
    umuman bermaydi va shu sababli kuzatuvni butunlay o'chirish
    ortiqcha qattiqlik bo'lardi.
  */
  if (accuracy === null || accuracy === undefined) return true;

  if (!Number.isFinite(accuracy) || accuracy < 0) return false;

  return accuracy <= MAX_LOCATION_ACCURACY_M;
}

/** Koordinata. */
export interface Point {
  latitude: number;
  longitude: number;
}

/**
 * Ikki nuqta orasidagi masofa — KILOMETRDA.
 *
 * ── Nima uchun "haversine" ────────────────────────────────────────────
 * Yer yumaloq va oddiy Pifagor formulasi kenglik oshgani sari
 * xato beradi. Toshkent kengligida (41°) bu xato sezilarli:
 * shig'irma kilometr masofada bir necha yuz metr.
 */
export function distanceKm(from: Point, to: Point): number {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Masofani odam tiliga o'giradi.
 *
 * Bir kilometrdan yaqin masofa METRDA aytiladi: "0.3 km" dan
 * "300 m" ancha tushunarli.
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';

  if (km < 1) {
    /*
      Metr YUZTALAB yaxlitlanadi: "287 m" yolg'on aniqlik beradi,
      chunki hisobning o'zi taxminiy.
    */
    const meters = Math.max(50, Math.round((km * 1000) / 50) * 50);

    return `${meters} m`;
  }

  return `${km.toFixed(1)} km`;
}

/**
 * Masofani bosib o'tish uchun kerakli vaqt — DAQIQADA.
 *
 * Natija har doim kamida 1: "0 daqiqa" degan javob ma'nosiz.
 */
export function travelMinutes(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 1;

  return Math.max(1, Math.round((km * ROUTE_FACTOR * 60) / COURIER_SPEED_KMH));
}

/** Joylashuv hali ISHONCHLImi. */
export function isLocationFresh(reportedAt: string | null, now: Date = new Date()): boolean {
  if (!reportedAt) return false;

  const at = new Date(reportedAt).getTime();

  if (Number.isNaN(at)) return false;

  const minutes = (now.getTime() - at) / 60_000;

  /*
    Kelajakdagi vaqt ham ISHONCHSIZ: kuryerning telefoni vaqti
    noto'g'ri qo'yilgan bo'lishi mumkin.
  */
  return minutes >= -1 && minutes <= LOCATION_FRESH_MINUTES;
}

/** Vaqtni odam tiliga o'giradi. */
export function formatMinutes(minutes: number): string {
  const value = Math.max(1, Math.round(minutes));

  if (value < 60) return `${value} daqiqa`;

  const hours = Math.floor(value / 60);
  const rest = value % 60;

  return rest === 0 ? `${hours} soat` : `${hours} soat ${rest} daqiqa`;
}

/** Yetkazish holati bo'yicha ETA. */
export interface EtaResult {
  /** Taxminiy qolgan vaqt — DAQIQADA. Aytib bo'lmasa `null`. */
  minutes: number | null;
  /** Ekranda ko'rinadigan matn. */
  text: string;
  /** Kuryergacha bo'lgan masofa matni — bo'lmasa `null`. */
  distanceText: string | null;
}

/**
 * Buyurtma qachon yetib kelishini TAXMIN qiladi.
 *
 * ── Nima uchun holatga qarab boshqacha hisoblanadi ────────────────────
 * Buyurtma hali oshxonada bo'lsa, kuryerning joylashuvi ahamiyatsiz —
 * u hali yo'lga chiqmagan. O'shanda restoranning o'z muddati
 * (`deliveryMinutes`) eng yaxshi taxmin bo'ladi.
 *
 * Kuryer yo'lga chiqqach esa aksincha: restoranning o'rtacha
 * muddati emas, AYNAN shu kuryerning masofasi muhim.
 *
 * @param courierPoint Kuryerning joylashuvi — noma'lum bo'lsa `null`.
 * @param destination Yetkazish manzili — noma'lum bo'lsa `null`.
 */
export function estimateArrival(input: {
  status: string;
  /** Restoran va'da qilgan muddat — DAQIQADA. */
  deliveryMinutes: number;
  /** Buyurtma qachon berilgan (ISO). */
  createdAt: string;
  courierPoint: Point | null;
  courierReportedAt: string | null;
  destination: Point | null;
  now?: Date;
}): EtaResult {
  const now = input.now ?? new Date();

  if (input.status === 'DELIVERED') {
    return { minutes: null, text: 'Yetkazildi', distanceText: null };
  }

  if (input.status === 'CANCELLED') {
    return { minutes: null, text: 'Bekor qilindi', distanceText: null };
  }

  /*
    ── Kuryer yo'lda va joylashuvi MA'LUM ────────────────────────────
    Eng aniq hisob: haqiqiy masofa bo'yicha.
  */
  const canUseLocation =
    input.status === 'DELIVERING' &&
    input.courierPoint !== null &&
    input.destination !== null &&
    isLocationFresh(input.courierReportedAt, now);

  if (canUseLocation) {
    const km = distanceKm(input.courierPoint!, input.destination!);
    const minutes = travelMinutes(km);

    return {
      minutes,
      text: `~${formatMinutes(minutes)}da yetib boradi`,
      distanceText: formatDistance(km),
    };
  }

  /*
    ── Qolgan holatlar ───────────────────────────────────────────────
    Restoranning o'z muddatidan buyurtma berilgandan beri o'tgan
    vaqt ayiriladi.

    Muddat o'tib ketgan bo'lsa, MANFIY son ko'rsatilmaydi: "hozir
    yetib keladi" deyish to'g'riroq va u odamni tinchlantiradi.
  */
  const elapsed = (now.getTime() - new Date(input.createdAt).getTime()) / 60_000;

  if (!Number.isFinite(elapsed)) {
    return { minutes: null, text: `~${formatMinutes(input.deliveryMinutes)}`, distanceText: null };
  }

  const left = input.deliveryMinutes - elapsed;

  if (left <= 0) {
    return { minutes: 0, text: 'Hozir yetib keladi', distanceText: null };
  }

  return {
    minutes: Math.round(left),
    text: `~${formatMinutes(left)}da yetib boradi`,
    distanceText: null,
  };
}
