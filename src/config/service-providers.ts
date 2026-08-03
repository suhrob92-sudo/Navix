import type { ServiceColor } from '@/config/modules';

/**
 * To'lov qabul qiluvchi xizmatlar ro'yxati.
 *
 * ── Nima uchun bu yerda, bazada emas ──────────────────────────────────
 * Bu — BOSHLANG'ICH ro'yxat (seed manbasi). Ishlash paytida provayderlar
 * bazadan o'qiladi: admin panel orqali yangisini qo'shish, eskisini
 * o'chirish yoki tarifni o'zgartirish mumkin bo'lishi kerak.
 *
 * Shu fayl esa "birinchi ishga tushirishda nima bo'lsin" degan javob.
 * `npm run db:seed` uni bazaga yozadi.
 */

export const ServiceCategoryValue = {
  UTILITY: 'UTILITY',
  INTERNET: 'INTERNET',
  MOBILE: 'MOBILE',
  TV: 'TV',
} as const;

export type ServiceCategoryValue = (typeof ServiceCategoryValue)[keyof typeof ServiceCategoryValue];

/** Toifalar — interfeysdagi tanlash tugmalari uchun. */
export const SERVICE_CATEGORIES = [
  { value: ServiceCategoryValue.UTILITY, label: 'Kommunal' },
  { value: ServiceCategoryValue.MOBILE, label: 'Mobil aloqa' },
  { value: ServiceCategoryValue.INTERNET, label: 'Internet' },
  { value: ServiceCategoryValue.TV, label: 'Televidenie' },
] as const;

export interface ServiceProviderSeed {
  code: string;
  name: string;
  category: ServiceCategoryValue;
  description: string;
  /** Hisob raqami maydonining nomi. */
  accountLabel: string;
  /** Kiritishga namuna. */
  accountHint: string;
  /**
   * Hisob raqamini tekshiruvchi naqsh.
   *
   * Matn ko'rinishida saqlanadi, chunki u bazada turadi. Server tomonda
   * `new RegExp(...)` bilan qo'llaniladi — shuning uchun naqsh ODDIY
   * bo'lishi kerak (faqat raqam, uzunlik). Murakkab naqshlar
   * "ReDoS" hujumiga yo'l ochadi.
   */
  accountRegex: string;
  /** Chegaralar SO'MDA — seed paytida tiyinga o'giriladi. */
  minAmountSom: number;
  maxAmountSom: number;
  color: ServiceColor;
  sortOrder: number;
}

/** Faqat raqamlardan iborat, aniq uzunlikdagi hisob raqami. */
function digits(length: number): string {
  return `^\\d{${length}}$`;
}

/** O'zbek uyali raqami — prefikssiz 9 ta raqam. */
const UZ_MOBILE_REGEX = '^\\d{9}$';

export const SERVICE_PROVIDERS: readonly ServiceProviderSeed[] = [
  // ── Kommunal ────────────────────────────────────────────────────────
  {
    code: 'hududgaz',
    name: 'Hududgaz',
    category: ServiceCategoryValue.UTILITY,
    description: 'Tabiiy gaz uchun to‘lov',
    accountLabel: 'Shaxsiy hisob raqami',
    accountHint: '1234567890',
    accountRegex: digits(10),
    minAmountSom: 1_000,
    maxAmountSom: 10_000_000,
    color: 'orange',
    sortOrder: 10,
  },
  {
    code: 'suvoqova',
    name: 'Suvoqova',
    category: ServiceCategoryValue.UTILITY,
    description: 'Ichimlik suvi va kanalizatsiya',
    accountLabel: 'Shaxsiy hisob raqami',
    accountHint: '1234567890',
    accountRegex: digits(10),
    minAmountSom: 1_000,
    maxAmountSom: 10_000_000,
    color: 'sky',
    sortOrder: 20,
  },
  {
    code: 'hududiy-elektr',
    name: 'Hududiy elektr tarmoqlari',
    category: ServiceCategoryValue.UTILITY,
    description: 'Elektr energiyasi uchun to‘lov',
    accountLabel: 'Shaxsiy hisob raqami',
    accountHint: '123456789012',
    accountRegex: digits(12),
    minAmountSom: 1_000,
    maxAmountSom: 10_000_000,
    color: 'amber',
    sortOrder: 30,
  },
  {
    code: 'issiqlik-manbai',
    name: 'Issiqlik manbai',
    category: ServiceCategoryValue.UTILITY,
    description: 'Markaziy isitish va issiq suv',
    accountLabel: 'Shaxsiy hisob raqami',
    accountHint: '1234567890',
    accountRegex: digits(10),
    minAmountSom: 1_000,
    maxAmountSom: 10_000_000,
    color: 'rose',
    sortOrder: 40,
  },

  // ── Mobil aloqa ─────────────────────────────────────────────────────
  {
    code: 'beeline',
    name: 'Beeline',
    category: ServiceCategoryValue.MOBILE,
    description: 'Uyali aloqa hisobini to‘ldirish',
    accountLabel: 'Telefon raqami',
    accountHint: '901234567',
    accountRegex: UZ_MOBILE_REGEX,
    minAmountSom: 1_000,
    maxAmountSom: 5_000_000,
    color: 'amber',
    sortOrder: 10,
  },
  {
    code: 'ucell',
    name: 'Ucell',
    category: ServiceCategoryValue.MOBILE,
    description: 'Uyali aloqa hisobini to‘ldirish',
    accountLabel: 'Telefon raqami',
    accountHint: '931234567',
    accountRegex: UZ_MOBILE_REGEX,
    minAmountSom: 1_000,
    maxAmountSom: 5_000_000,
    color: 'violet',
    sortOrder: 20,
  },
  {
    code: 'ums',
    name: 'UMS',
    category: ServiceCategoryValue.MOBILE,
    description: 'Uyali aloqa hisobini to‘ldirish',
    accountLabel: 'Telefon raqami',
    accountHint: '971234567',
    accountRegex: UZ_MOBILE_REGEX,
    minAmountSom: 1_000,
    maxAmountSom: 5_000_000,
    color: 'blue',
    sortOrder: 30,
  },
  {
    code: 'mobiuz',
    name: 'Mobiuz',
    category: ServiceCategoryValue.MOBILE,
    description: 'Uyali aloqa hisobini to‘ldirish',
    accountLabel: 'Telefon raqami',
    accountHint: '881234567',
    accountRegex: UZ_MOBILE_REGEX,
    minAmountSom: 1_000,
    maxAmountSom: 5_000_000,
    color: 'green',
    sortOrder: 40,
  },
  {
    code: 'humans',
    name: 'Humans',
    category: ServiceCategoryValue.MOBILE,
    description: 'Uyali aloqa hisobini to‘ldirish',
    accountLabel: 'Telefon raqami',
    accountHint: '331234567',
    accountRegex: UZ_MOBILE_REGEX,
    minAmountSom: 1_000,
    maxAmountSom: 5_000_000,
    color: 'pink',
    sortOrder: 50,
  },

  // ── Internet ────────────────────────────────────────────────────────
  {
    code: 'uzonline',
    name: 'Uzonline',
    category: ServiceCategoryValue.INTERNET,
    description: 'Uy interneti uchun to‘lov',
    accountLabel: 'Shartnoma raqami',
    accountHint: '12345678',
    accountRegex: digits(8),
    minAmountSom: 5_000,
    maxAmountSom: 5_000_000,
    color: 'blue',
    sortOrder: 10,
  },
  {
    code: 'sarkor',
    name: 'Sarkor Telekom',
    category: ServiceCategoryValue.INTERNET,
    description: 'Uy interneti uchun to‘lov',
    accountLabel: 'Shartnoma raqami',
    accountHint: '12345678',
    accountRegex: digits(8),
    minAmountSom: 5_000,
    maxAmountSom: 5_000_000,
    color: 'teal',
    sortOrder: 20,
  },
  {
    code: 'comnet',
    name: 'Comnet',
    category: ServiceCategoryValue.INTERNET,
    description: 'Uy interneti uchun to‘lov',
    accountLabel: 'Shartnoma raqami',
    accountHint: '12345678',
    accountRegex: digits(8),
    minAmountSom: 5_000,
    maxAmountSom: 5_000_000,
    color: 'indigo',
    sortOrder: 30,
  },

  // ── Televidenie ─────────────────────────────────────────────────────
  {
    code: 'uzdigital',
    name: 'Uzdigital TV',
    category: ServiceCategoryValue.TV,
    description: 'Raqamli televidenie obunasi',
    accountLabel: 'Abonent raqami',
    accountHint: '123456789',
    accountRegex: digits(9),
    minAmountSom: 5_000,
    maxAmountSom: 2_000_000,
    color: 'violet',
    sortOrder: 10,
  },
  {
    code: 'sipnet',
    name: 'Sipnet TV',
    category: ServiceCategoryValue.TV,
    description: 'Kabel televideniesi',
    accountLabel: 'Abonent raqami',
    accountHint: '123456789',
    accountRegex: digits(9),
    minAmountSom: 5_000,
    maxAmountSom: 2_000_000,
    color: 'slate',
    sortOrder: 20,
  },
];
