import type { ServiceColor } from '@/config/modules';

/**
 * Sayohat moduli — yo'nalishlar jadvali va bandlov qoidalari.
 *
 * ── Nima uchun REYS emas, JADVAL saqlanadi ────────────────────────────
 * "Toshkent → Samarqand, Afrosiyob, 08:00" reysi HAR KUNI takrorlanadi.
 * Agar har bir kun uchun alohida yozuv yaratilsa, ular ikki muammo
 * tug'dirardi:
 *
 *   1. Ro'yxat eskiradi — kecha yozilgan reyslar bugun o'tib ketadi va
 *      kimdir muntazam yangi kunlarni qo'shib turishi kerak bo'lardi;
 *   2. Baza bekorga shishadi — bir yo'nalish yiliga 365 ta yozuv.
 *
 * Shuning uchun bazada faqat TAKRORLANUVCHI jadval turadi, aniq reys
 * esa qidiruv paytida "jadval + sana" dan hisoblanadi. Chipta shu
 * ikkalasiga bog'lanadi.
 *
 * ── Narxlar SO'MDA ────────────────────────────────────────────────────
 * Seed paytida tiyinga o'giriladi. Bu yerda so'mda, chunki ro'yxatni
 * odam o'qiydi va tahrirlaydi.
 *
 * ── Ma'lumot HAQIQIY emas ─────────────────────────────────────────────
 * Reys raqamlari va vaqtlari haqiqiy yo'nalishlarga o'xshatib yozilgan,
 * lekin bu NAMUNA. Haqiqiy chipta sotish uchun tashuvchi bilan shartnoma
 * va ularning API'si kerak. Modulning butun mantiqi — qidiruv, joy
 * hisobi, to'lov, qaytarish — o'zgarmaydi: faqat jadval manbai
 * almashadi.
 */

/** Transport turi. Bazadagi `TransportType` enum bilan bir xil. */
export type TransportName = 'PLANE' | 'TRAIN' | 'BUS';

export interface TripScheduleSeed {
  /** Reys raqami: HY-011, 762, T-15. */
  code: string;
  carrier: string;
  transport: TransportName;
  fromCity: string;
  toCity: string;
  /** Jo'nash vaqti — Toshkent bo'yicha, "HH:MM". */
  departTime: string;
  /** Yo'lda o'tadigan vaqt — DAQIQADA. */
  durationMinutes: number;
  /**
   * Hafta kunlari: 1 = dushanba … 7 = yakshanba.
   *
   * Bo'sh massiv emas, aniq kunlar: aviareyslar odatda har kuni
   * uchmaydi va buni ko'rsata olish kerak.
   */
  weekdays: readonly number[];
  priceSom: number;
  /** Reysdagi umumiy o'rinlar soni. */
  totalSeats: number;
  sortOrder: number;
}

/**
 * Transport turlarining ko'rinadigan nomi.
 *
 * Rang ham shu yerda: u jadvalda saqlanmaydi, chunki transport turidan
 * bir qiymatli kelib chiqadi. Bazaga yozilsa, ikkalasi bir-biriga zid
 * bo'lib qolishi mumkin edi.
 */
export const TRANSPORT_META: Record<TransportName, { label: string; color: ServiceColor }> = {
  PLANE: { label: 'Samolyot', color: 'sky' },
  TRAIN: { label: 'Poyezd', color: 'indigo' },
  BUS: { label: 'Avtobus', color: 'amber' },
};

/** Yo'nalishlarda uchraydigan shaharlar — filtr ro'yxati uchun. */
export const TRAVEL_CITIES = [
  'Toshkent',
  'Samarqand',
  'Buxoro',
  'Xiva',
  'Urganch',
  "Farg'ona",
  'Namangan',
  'Andijon',
  'Nukus',
  'Termiz',
] as const;

/**
 * Shaharlarning koordinatalari — yo'nalish xaritasi uchun.
 *
 * ── Nima uchun bu yerda, bazada emas ──────────────────────────────────
 * Shahar markazining koordinatasi O'ZGARMAYDI. Uni bazaga yozish
 * uchun jadval kerak bo'lardi va u hech qachon tahrirlanmasdi.
 *
 * ── Bu HAQIQIY koordinatalar ──────────────────────────────────────────
 * O'ylab topilgan emas: har birining shahar markazi. Ular xaritada
 * yo'nalishning YO'NALISHINI ko'rsatadi — qaysi tomonga, qanchalik
 * uzoq.
 *
 * MUHIM: bu vokzal yoki aeroport emas, SHAHAR markazi. Xaritada
 * ham shunday aytiladi — aks holda odam vokzalni shu nuqtadan
 * izlardi.
 */
export const CITY_POINTS: Record<string, { latitude: number; longitude: number }> = {
  Toshkent: { latitude: 41.3111, longitude: 69.2797 },
  Samarqand: { latitude: 39.6547, longitude: 66.9758 },
  Buxoro: { latitude: 39.7756, longitude: 64.4286 },
  Xiva: { latitude: 41.3783, longitude: 60.3639 },
  Urganch: { latitude: 41.5500, longitude: 60.6333 },
  "Farg'ona": { latitude: 40.3894, longitude: 71.7867 },
  Namangan: { latitude: 40.9983, longitude: 71.6726 },
  Andijon: { latitude: 40.7821, longitude: 72.3442 },
  Nukus: { latitude: 42.4531, longitude: 59.6103 },
  Termiz: { latitude: 37.2242, longitude: 67.2783 },
};

/**
 * Shaharning xaritadagi nuqtasi.
 *
 * Noma'lum shahar uchun `null`: taxminiy nuqta qo'yish odamni
 * butunlay boshqa tomonga qaratardi.
 */
export function cityPoint(city: string): { latitude: number; longitude: number } | null {
  return CITY_POINTS[city] ?? null;
}

const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7] as const;

export const TRIP_SCHEDULES: readonly TripScheduleSeed[] = [
  // ── Samolyot ────────────────────────────────────────────────────────
  {
    code: 'HY-011',
    carrier: 'Uzbekistan Airways',
    transport: 'PLANE',
    fromCity: 'Toshkent',
    toCity: 'Urganch',
    departTime: '08:20',
    durationMinutes: 100,
    weekdays: [1, 3, 5, 7],
    priceSom: 890_000,
    totalSeats: 140,
    sortOrder: 1,
  },
  {
    code: 'HY-012',
    carrier: 'Uzbekistan Airways',
    transport: 'PLANE',
    fromCity: 'Urganch',
    toCity: 'Toshkent',
    departTime: '11:10',
    durationMinutes: 100,
    weekdays: [1, 3, 5, 7],
    priceSom: 890_000,
    totalSeats: 140,
    sortOrder: 2,
  },
  {
    code: 'HY-051',
    carrier: 'Uzbekistan Airways',
    transport: 'PLANE',
    fromCity: 'Toshkent',
    toCity: 'Nukus',
    departTime: '07:40',
    durationMinutes: 105,
    weekdays: [2, 4, 6],
    priceSom: 850_000,
    totalSeats: 120,
    sortOrder: 3,
  },
  {
    code: 'HY-052',
    carrier: 'Uzbekistan Airways',
    transport: 'PLANE',
    fromCity: 'Nukus',
    toCity: 'Toshkent',
    departTime: '10:35',
    durationMinutes: 105,
    weekdays: [2, 4, 6],
    priceSom: 850_000,
    totalSeats: 120,
    sortOrder: 4,
  },
  {
    code: 'HY-021',
    carrier: 'Uzbekistan Airways',
    transport: 'PLANE',
    fromCity: 'Toshkent',
    toCity: 'Termiz',
    departTime: '09:00',
    durationMinutes: 85,
    weekdays: [1, 4, 6],
    priceSom: 720_000,
    totalSeats: 110,
    sortOrder: 5,
  },

  // ── Poyezd ──────────────────────────────────────────────────────────
  {
    code: '762',
    carrier: "Afrosiyob (O'zbekiston temir yo'llari)",
    transport: 'TRAIN',
    fromCity: 'Toshkent',
    toCity: 'Samarqand',
    departTime: '08:00',
    durationMinutes: 130,
    weekdays: EVERY_DAY,
    priceSom: 210_000,
    totalSeats: 240,
    sortOrder: 6,
  },
  {
    code: '761',
    carrier: "Afrosiyob (O'zbekiston temir yo'llari)",
    transport: 'TRAIN',
    fromCity: 'Samarqand',
    toCity: 'Toshkent',
    departTime: '17:30',
    durationMinutes: 130,
    weekdays: EVERY_DAY,
    priceSom: 210_000,
    totalSeats: 240,
    sortOrder: 7,
  },
  {
    code: '764',
    carrier: "Afrosiyob (O'zbekiston temir yo'llari)",
    transport: 'TRAIN',
    fromCity: 'Toshkent',
    toCity: 'Buxoro',
    departTime: '07:30',
    durationMinutes: 235,
    weekdays: [1, 2, 3, 5, 6, 7],
    priceSom: 320_000,
    totalSeats: 220,
    sortOrder: 8,
  },
  {
    code: '763',
    carrier: "Afrosiyob (O'zbekiston temir yo'llari)",
    transport: 'TRAIN',
    fromCity: 'Buxoro',
    toCity: 'Toshkent',
    departTime: '15:40',
    durationMinutes: 235,
    weekdays: [1, 2, 3, 5, 6, 7],
    priceSom: 320_000,
    totalSeats: 220,
    sortOrder: 9,
  },
  {
    code: '056',
    carrier: "Sharq (O'zbekiston temir yo'llari)",
    transport: 'TRAIN',
    fromCity: 'Toshkent',
    toCity: 'Xiva',
    departTime: '20:10',
    durationMinutes: 855,
    weekdays: [2, 5, 7],
    priceSom: 380_000,
    totalSeats: 300,
    sortOrder: 10,
  },
  {
    code: '055',
    carrier: "Sharq (O'zbekiston temir yo'llari)",
    transport: 'TRAIN',
    fromCity: 'Xiva',
    toCity: 'Toshkent',
    departTime: '18:45',
    durationMinutes: 855,
    weekdays: [1, 3, 6],
    priceSom: 380_000,
    totalSeats: 300,
    sortOrder: 11,
  },

  // ── Avtobus ─────────────────────────────────────────────────────────
  {
    code: 'A-101',
    carrier: 'Toshkent avtovokzali',
    transport: 'BUS',
    fromCity: 'Toshkent',
    toCity: 'Samarqand',
    departTime: '07:00',
    durationMinutes: 260,
    weekdays: EVERY_DAY,
    priceSom: 90_000,
    totalSeats: 45,
    sortOrder: 12,
  },
  {
    code: 'A-102',
    carrier: 'Toshkent avtovokzali',
    transport: 'BUS',
    fromCity: 'Samarqand',
    toCity: 'Toshkent',
    departTime: '14:00',
    durationMinutes: 260,
    weekdays: EVERY_DAY,
    priceSom: 90_000,
    totalSeats: 45,
    sortOrder: 13,
  },
  {
    code: 'A-201',
    carrier: 'Vodiy Trans',
    transport: 'BUS',
    fromCity: 'Toshkent',
    toCity: "Farg'ona",
    departTime: '08:30',
    durationMinutes: 290,
    weekdays: EVERY_DAY,
    priceSom: 85_000,
    totalSeats: 45,
    sortOrder: 14,
  },
  {
    code: 'A-202',
    carrier: 'Vodiy Trans',
    transport: 'BUS',
    fromCity: "Farg'ona",
    toCity: 'Toshkent',
    departTime: '15:00',
    durationMinutes: 290,
    weekdays: EVERY_DAY,
    priceSom: 85_000,
    totalSeats: 45,
    sortOrder: 15,
  },
  {
    code: 'A-211',
    carrier: 'Vodiy Trans',
    transport: 'BUS',
    fromCity: 'Toshkent',
    toCity: 'Namangan',
    departTime: '07:30',
    durationMinutes: 300,
    weekdays: [1, 2, 3, 4, 5, 6],
    priceSom: 80_000,
    totalSeats: 45,
    sortOrder: 16,
  },
  {
    code: 'A-221',
    carrier: 'Vodiy Trans',
    transport: 'BUS',
    fromCity: 'Toshkent',
    toCity: 'Andijon',
    departTime: '09:15',
    durationMinutes: 330,
    weekdays: [1, 3, 5, 7],
    priceSom: 95_000,
    totalSeats: 45,
    sortOrder: 17,
  },
  {
    code: 'A-301',
    carrier: 'Samarqand Trans',
    transport: 'BUS',
    fromCity: 'Samarqand',
    toCity: 'Buxoro',
    departTime: '10:00',
    durationMinutes: 215,
    weekdays: EVERY_DAY,
    priceSom: 70_000,
    totalSeats: 40,
    sortOrder: 18,
  },
  {
    code: 'A-302',
    carrier: 'Samarqand Trans',
    transport: 'BUS',
    fromCity: 'Buxoro',
    toCity: 'Samarqand',
    departTime: '16:30',
    durationMinutes: 215,
    weekdays: EVERY_DAY,
    priceSom: 70_000,
    totalSeats: 40,
    sortOrder: 19,
  },
  {
    code: 'A-401',
    carrier: 'Xorazm Trans',
    transport: 'BUS',
    fromCity: 'Urganch',
    toCity: 'Xiva',
    departTime: '09:00',
    durationMinutes: 45,
    weekdays: EVERY_DAY,
    priceSom: 25_000,
    totalSeats: 30,
    sortOrder: 20,
  },
] as const;

/**
 * Chipta qoidalari.
 *
 * Bu yerda — chunki ular biznes qarori, dasturchi qarori emas.
 */
export const TRIP_RULES = {
  /** Eng ko'pi bilan shuncha kun oldin chipta olinadi. */
  maxDaysAhead: 90,
  /** Bitta chiptada eng ko'p o'rin. */
  maxSeats: 6,
  /**
   * Jo'nashgacha shuncha SOAT qolganda pul to'liq qaytariladi.
   *
   * ── Nima uchun to'liq qaytarilmaydi ─────────────────────────────────
   * Mehmonxonadan farqli o'laroq, tashuvchi bo'shab qolgan o'rinni
   * jo'nashdan bir necha soat oldin sotib ulgurmaydi — o'rin bekorga
   * ketadi. Shuning uchun kech bekor qilishda jarima ushlanadi.
   *
   * Bu shart chipta sotib olishdan OLDIN oynada yozib qo'yiladi:
   * foydalanuvchi nimaga rozi bo'lganini bilishi shart.
   */
  fullRefundHours: 24,
  /** Kech bekor qilishda shuncha foiz qaytariladi. */
  lateRefundPercent: 50,
} as const;
