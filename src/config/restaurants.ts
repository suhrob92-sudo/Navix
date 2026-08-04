import type { ServiceColor } from '@/config/modules';

/**
 * Boshlang'ich restoranlar ro'yxati (seed manbasi).
 *
 * ── Nima uchun bu yerda, bazada emas ──────────────────────────────────
 * `service-providers.ts` dagi kabi: bu FAQAT birinchi ishga tushirish
 * uchun. Ishlash paytida restoranlar bazadan o'qiladi va admin panel
 * orqali boshqariladi.
 *
 * ── Narxlar SO'MDA ────────────────────────────────────────────────────
 * Seed paytida tiyinga o'giriladi. Bu yerda so'mda yozilgan, chunki
 * ro'yxatni odam o'qiydi va tahrirlaydi.
 */

export interface MenuItemSeed {
  name: string;
  description?: string;
  priceSom: number;
}

export interface MenuCategorySeed {
  name: string;
  items: readonly MenuItemSeed[];
}

export interface RestaurantSeed {
  slug: string;
  name: string;
  description: string;
  cuisine: string;
  deliveryFeeSom: number;
  minOrderSom: number;
  deliveryMinutes: number;
  rating: number;
  ratingCount: number;
  color: ServiceColor;
  sortOrder: number;
  categories: readonly MenuCategorySeed[];
}

/** Oshxona turlari — ro'yxatdagi filtr tugmalari uchun. */
export const CUISINES = ['Milliy', 'Fast food', 'Pitsa', 'Yapon', 'Shirinlik'] as const;

export const RESTAURANTS: readonly RestaurantSeed[] = [
  {
    slug: 'milliy-taomlar',
    name: 'Milliy Taomlar',
    description: "Tandir osh, manti va lag'mon — uydagidek",
    cuisine: 'Milliy',
    deliveryFeeSom: 10_000,
    minOrderSom: 40_000,
    deliveryMinutes: 45,
    rating: 4.8,
    ratingCount: 1240,
    color: 'orange',
    sortOrder: 10,
    categories: [
      {
        name: 'Issiq taomlar',
        items: [
          { name: "To'y oshi", description: "Qo'y go'shti, sariq sabzi, no'xat", priceSom: 45_000 },
          { name: "Lag'mon", description: "Qo'lda tortilgan xamir, mol go'shti", priceSom: 42_000 },
          { name: 'Shurva', description: "Qo'y go'shtidan quyuq sho'rva", priceSom: 38_000 },
          { name: 'Norin', description: "An'anaviy sovuq taom", priceSom: 40_000 },
        ],
      },
      {
        name: 'Manti va somsa',
        items: [
          { name: 'Manti (5 dona)', description: "Mol go'shti va piyoz", priceSom: 35_000 },
          { name: 'Chuchvara', description: 'Kichik chuchvara, qaymoq bilan', priceSom: 32_000 },
          { name: 'Tandir somsa (2 dona)', description: "Qo'y go'shti", priceSom: 24_000 },
        ],
      },
      {
        name: 'Salatlar',
        items: [
          { name: 'Achchiq-chuchuk', description: 'Pomidor, piyoz, achchiq qalampir', priceSom: 15_000 },
          { name: 'Olivye', priceSom: 22_000 },
        ],
      },
      {
        name: 'Ichimliklar',
        items: [
          { name: "Ko'k choy", priceSom: 6_000 },
          { name: 'Ayron', priceSom: 9_000 },
        ],
      },
    ],
  },
  {
    slug: 'choyxona-navruz',
    name: 'Choyxona Navruz',
    description: "Tandir kabob va shashlik — ko'mir ustida",
    cuisine: 'Milliy',
    deliveryFeeSom: 12_000,
    minOrderSom: 50_000,
    deliveryMinutes: 50,
    rating: 4.6,
    ratingCount: 860,
    color: 'amber',
    sortOrder: 20,
    categories: [
      {
        name: 'Kabob',
        items: [
          { name: "Qo'y kabob (2 sixcha)", priceSom: 46_000 },
          { name: 'Mol kabob (2 sixcha)', priceSom: 42_000 },
          { name: 'Tovuq kabob (2 sixcha)', priceSom: 36_000 },
          { name: 'Jigar kabob (2 sixcha)', priceSom: 34_000 },
        ],
      },
      {
        name: 'Garnir',
        items: [
          { name: 'Tandir non', priceSom: 8_000 },
          { name: 'Qovurilgan kartoshka', priceSom: 18_000 },
          { name: 'Achchiq-chuchuk', priceSom: 15_000 },
        ],
      },
      {
        name: 'Ichimliklar',
        items: [
          { name: 'Qora choy', priceSom: 6_000 },
          { name: 'Gazli suv 0.5', priceSom: 8_000 },
        ],
      },
    ],
  },
  {
    slug: 'pizza-roma',
    name: 'Pizza Roma',
    description: "Italyan retsepti bo'yicha, tosh pechda",
    cuisine: 'Pitsa',
    deliveryFeeSom: 15_000,
    minOrderSom: 60_000,
    deliveryMinutes: 35,
    rating: 4.7,
    ratingCount: 2150,
    color: 'rose',
    sortOrder: 30,
    categories: [
      {
        name: 'Pitsalar',
        items: [
          { name: 'Margarita', description: 'Pomidor sousi, motsarella, rayhon', priceSom: 55_000 },
          { name: 'Pepperoni', description: 'Achchiq kolbasa, motsarella', priceSom: 68_000 },
          {
            name: "To'rt xil pishloq",
            description: 'Motsarella, chedder, parmezan, gorgonzola',
            priceSom: 75_000,
          },
          { name: 'Tovuqli BBQ', description: 'Tovuq filesi, BBQ sous, piyoz', priceSom: 72_000 },
        ],
      },
      {
        name: "Qo'shimcha",
        items: [
          { name: 'Sezar salat', priceSom: 32_000 },
          { name: 'Sarimsoqli non', priceSom: 18_000 },
        ],
      },
      {
        name: 'Ichimliklar',
        items: [
          { name: 'Cola 0.5', priceSom: 12_000 },
          { name: 'Apelsin sharbati', priceSom: 16_000 },
        ],
      },
    ],
  },
  {
    slug: 'burger-house',
    name: 'Burger House',
    description: "Qo'lda yasalgan kotletli burgerlar",
    cuisine: 'Fast food',
    deliveryFeeSom: 12_000,
    minOrderSom: 45_000,
    deliveryMinutes: 30,
    rating: 4.5,
    ratingCount: 1780,
    color: 'green',
    sortOrder: 40,
    categories: [
      {
        name: 'Burgerlar',
        items: [
          { name: 'Klassik burger', description: 'Mol kotleti, pishloq, tuzlangan bodring', priceSom: 38_000 },
          { name: 'Double burger', description: 'Ikki kotlet, ikki pishloq', priceSom: 56_000 },
          { name: 'Tovuqli burger', priceSom: 34_000 },
          { name: 'Chizburger', priceSom: 42_000 },
        ],
      },
      {
        name: 'Garnir',
        items: [
          { name: 'Fri kartoshka', priceSom: 16_000 },
          { name: 'Tovuq strips (5 dona)', priceSom: 28_000 },
          { name: 'Piyoz halqalari', priceSom: 18_000 },
        ],
      },
      {
        name: 'Ichimliklar',
        items: [
          { name: 'Milkshake (shokolad)', priceSom: 24_000 },
          { name: 'Cola 0.5', priceSom: 12_000 },
        ],
      },
    ],
  },
  {
    slug: 'sushi-time',
    name: 'Sushi Time',
    description: 'Yangi baliq, har kuni tayyorlanadi',
    cuisine: 'Yapon',
    deliveryFeeSom: 18_000,
    minOrderSom: 80_000,
    deliveryMinutes: 55,
    rating: 4.4,
    ratingCount: 640,
    color: 'teal',
    sortOrder: 50,
    categories: [
      {
        name: 'Rollar',
        items: [
          { name: 'Filadelfiya (8 dona)', description: 'Losos, krem pishloq, bodring', priceSom: 85_000 },
          { name: 'Kaliforniya (8 dona)', description: 'Krab, avokado, tobiko', priceSom: 78_000 },
          { name: 'Tempura rol (8 dona)', description: 'Qovurilgan, issiq', priceSom: 82_000 },
        ],
      },
      {
        name: 'Setlar',
        items: [{ name: 'Katta set (32 dona)', description: "To'rt xil rol", priceSom: 280_000 }],
      },
      {
        name: 'Ichimliklar',
        items: [{ name: 'Yashil choy', priceSom: 10_000 }],
      },
    ],
  },
  {
    slug: 'non-va-kofe',
    name: 'Non & Kofe',
    description: 'Yangi pishirilgan shirinliklar va kofe',
    cuisine: 'Shirinlik',
    deliveryFeeSom: 9_000,
    minOrderSom: 30_000,
    deliveryMinutes: 25,
    rating: 4.9,
    ratingCount: 3120,
    color: 'violet',
    sortOrder: 60,
    categories: [
      {
        name: 'Shirinliklar',
        items: [
          { name: "Napoleon tort (bo'lak)", priceSom: 26_000 },
          { name: 'Chizkeyk', priceSom: 32_000 },
          { name: 'Krosson (shokoladli)', priceSom: 18_000 },
          { name: "Medovik (bo'lak)", priceSom: 24_000 },
        ],
      },
      {
        name: 'Kofe',
        items: [
          { name: 'Amerikano', priceSom: 15_000 },
          { name: 'Kapuchino', priceSom: 20_000 },
          { name: 'Latte', priceSom: 22_000 },
          { name: 'Raf kofe', priceSom: 26_000 },
        ],
      },
    ],
  },
] as const;
