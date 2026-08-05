/**
 * Marketplace uchun boshlang'ich katalog — seed manbasi.
 *
 * ── Nima uchun kodda, bazada emas ─────────────────────────────────────
 * Bu ma'lumot loyihaning bir qismi: u Git'da tarixga ega, ko'rib
 * chiqiladi va har muhitda bir xil bo'ladi. Bazaga esa `npm run db:seed`
 * orqali tushadi.
 *
 * Haqiqiy do'konlar keyinchalik sotuvchi kabineti orqali qo'shiladi —
 * bu ro'yxat faqat "bo'sh maydoncha" muammosini hal qiladi.
 *
 * ── Narxlar SO'MDA yoziladi ───────────────────────────────────────────
 * Bazada tiyinda saqlanadi, lekin bu yerda so'mda — odam o'qishi va
 * tekshirishi uchun. O'girish seed'da bir joyda bajariladi.
 */

export interface ProductSeed {
  slug: string;
  name: string;
  description?: string;
  priceSom: number;
  /** Chegirmadan oldingi narx — faqat ko'rsatish uchun. */
  oldPriceSom?: number;
  /** Omborda nechta bor. */
  stock: number;
  /** Qaysi toifaga tegishli (`PRODUCT_CATEGORIES` dagi `slug`). */
  categorySlug: string;
}

export interface ShopSeed {
  slug: string;
  name: string;
  description: string;
  deliveryFeeSom: number;
  minOrderSom: number;
  deliveryDays: number;
  rating: number;
  ratingCount: number;
  color: string;
  sortOrder: number;
  products: readonly ProductSeed[];
}

export interface ProductCategorySeed {
  slug: string;
  name: string;
  /** `lucide-react` ikonkasi nomi. */
  icon: string;
  sortOrder: number;
}

/**
 * Toifalar — butun maydoncha bo'ylab UMUMIY.
 *
 * Menyu bo'limidan farqi shunda: "Telefonlar" toifasi bitta do'konga
 * emas, hamma do'konga tegishli. Foydalanuvchi telefon izlaganda
 * barcha do'konlardagi telefonlarni ko'rishi kerak.
 */
export const PRODUCT_CATEGORIES: readonly ProductCategorySeed[] = [
  { slug: 'telefonlar', name: 'Telefon va gadjet', icon: 'Smartphone', sortOrder: 10 },
  { slug: 'kompyuter', name: 'Kompyuter texnikasi', icon: 'Laptop', sortOrder: 20 },
  { slug: 'maishiy-texnika', name: 'Maishiy texnika', icon: 'WashingMachine', sortOrder: 30 },
  { slug: 'kiyim', name: 'Kiyim-kechak', icon: 'Shirt', sortOrder: 40 },
  { slug: 'kitoblar', name: 'Kitoblar', icon: 'BookOpen', sortOrder: 50 },
  { slug: 'sport', name: 'Sport anjomlari', icon: 'Dumbbell', sortOrder: 60 },
  { slug: 'bolalar', name: 'Bolalar olami', icon: 'ToyBrick', sortOrder: 70 },
  { slug: 'gozallik', name: "Go'zallik va parvarish", icon: 'Sparkles', sortOrder: 80 },
] as const;

export const SHOPS: readonly ShopSeed[] = [
  {
    slug: 'texnomart',
    name: 'Texnomart',
    description: 'Telefon, noutbuk va maishiy texnika — rasmiy kafolat bilan',
    deliveryFeeSom: 25_000,
    minOrderSom: 100_000,
    deliveryDays: 2,
    rating: 4.7,
    ratingCount: 3420,
    color: 'blue',
    sortOrder: 10,
    products: [
      {
        slug: 'samsung-galaxy-a55',
        name: 'Samsung Galaxy A55 8/256GB',
        description: "6.6 dyuym AMOLED ekran, 50 MP kamera, 5000 mAh batareya. Rasmiy kafolat 12 oy.",
        priceSom: 4_290_000,
        oldPriceSom: 4_790_000,
        stock: 12,
        categorySlug: 'telefonlar',
      },
      {
        slug: 'redmi-note-14',
        name: 'Redmi Note 14 6/128GB',
        description: '6.67 dyuym AMOLED, 108 MP kamera, 45W tez quvvatlash.',
        priceSom: 2_690_000,
        stock: 25,
        categorySlug: 'telefonlar',
      },
      {
        slug: 'airpods-pro-2',
        name: 'Quloqchin Pro 2 (simsiz)',
        description: "Faol shovqin bostirish, 30 soat ishlash, Type-C quvvatlash.",
        priceSom: 1_150_000,
        oldPriceSom: 1_390_000,
        stock: 40,
        categorySlug: 'telefonlar',
      },
      {
        slug: 'lenovo-ideapad-3',
        name: 'Lenovo IdeaPad 3 15" i5/8GB/512GB',
        description: 'Ish va o\'qish uchun. 15.6 dyuym FullHD, 8-avlod protsessor.',
        priceSom: 7_890_000,
        stock: 6,
        categorySlug: 'kompyuter',
      },
      {
        slug: 'simsiz-sichqoncha',
        name: 'Simsiz sichqoncha (jimjit)',
        description: 'Shovqinsiz tugmalar, 18 oy batareya, USB qabul qilgich.',
        priceSom: 145_000,
        stock: 80,
        categorySlug: 'kompyuter',
      },
      {
        slug: 'monitor-24-fullhd',
        name: 'Monitor 24" FullHD IPS',
        priceSom: 1_950_000,
        oldPriceSom: 2_250_000,
        stock: 9,
        categorySlug: 'kompyuter',
      },
      {
        slug: 'changyutgich-2000w',
        name: "Changyutgich 2000W (qopsiz)",
        description: 'HEPA filtr, 3 xil nasadka, 5 metr shnur.',
        priceSom: 1_390_000,
        stock: 14,
        categorySlug: 'maishiy-texnika',
      },
      {
        slug: 'mikroto-lqin-pech',
        name: "Mikroto'lqinli pech 20L",
        priceSom: 1_090_000,
        stock: 11,
        categorySlug: 'maishiy-texnika',
      },
    ],
  },
  {
    slug: 'moda-bozor',
    name: 'Moda Bozor',
    description: 'Erkaklar va ayollar kiyimi — har mavsumga yangi kolleksiya',
    deliveryFeeSom: 18_000,
    minOrderSom: 150_000,
    deliveryDays: 3,
    rating: 4.5,
    ratingCount: 1870,
    color: 'rose',
    sortOrder: 20,
    products: [
      {
        slug: 'erkaklar-kurtka',
        name: 'Erkaklar uchun kuz kurtkasi',
        description: 'Suv o\'tkazmaydigan mato, ichki cho\'ntak, M-XXL o\'lchamlar.',
        priceSom: 690_000,
        oldPriceSom: 890_000,
        stock: 22,
        categorySlug: 'kiyim',
      },
      {
        slug: 'ayollar-palto',
        name: 'Ayollar uchun jun palto',
        description: '70% jun, klassik uzunlik, S-L o\'lchamlar.',
        priceSom: 1_250_000,
        stock: 8,
        categorySlug: 'kiyim',
      },
      {
        slug: 'paxta-futbolka',
        name: 'Paxta futbolka (3 dona)',
        description: '100% paxta, oq/qora/kulrang.',
        priceSom: 210_000,
        stock: 120,
        categorySlug: 'kiyim',
      },
      {
        slug: 'krossovka-yugurish',
        name: 'Yugurish uchun krossovka',
        description: 'Yengil taglik, nafas oluvchi mato, 39-45 o\'lcham.',
        priceSom: 780_000,
        oldPriceSom: 950_000,
        stock: 30,
        categorySlug: 'sport',
      },
      {
        slug: 'sport-sumka',
        name: 'Sport sumkasi 40L',
        priceSom: 320_000,
        stock: 45,
        categorySlug: 'sport',
      },
    ],
  },
  {
    slug: 'kitob-dunyosi',
    name: 'Kitob Dunyosi',
    description: "O'zbek va jahon adabiyoti, darsliklar, bolalar kitoblari",
    deliveryFeeSom: 12_000,
    minOrderSom: 50_000,
    deliveryDays: 2,
    rating: 4.9,
    ratingCount: 2410,
    color: 'amber',
    sortOrder: 30,
    products: [
      {
        slug: 'otkan-kunlar',
        name: "O'tkan kunlar — Abdulla Qodiriy",
        description: "O'zbek romanchiligining birinchi namunasi. Qattiq muqova, 384 bet.",
        priceSom: 89_000,
        stock: 60,
        categorySlug: 'kitoblar',
      },
      {
        slug: 'mehrobdan-chayon',
        name: 'Mehrobdan chayon — Abdulla Qodiriy',
        priceSom: 79_000,
        stock: 45,
        categorySlug: 'kitoblar',
      },
      {
        slug: 'sariq-devni-minib',
        name: 'Sariq devni minib — Xudoyberdi To\'xtaboyev',
        description: 'Bolalar uchun sarguzasht qissasi.',
        priceSom: 65_000,
        oldPriceSom: 85_000,
        stock: 70,
        categorySlug: 'bolalar',
      },
      {
        slug: 'bolalar-konstruktor',
        name: 'Konstruktor 250 detal',
        description: '4 yoshdan katta bolalar uchun. Xavfsiz plastik.',
        priceSom: 185_000,
        stock: 35,
        categorySlug: 'bolalar',
      },
    ],
  },
  {
    slug: 'sogliq-plus',
    name: "Sog'liq Plus",
    description: "Parvarish vositalari, vitaminlar va go'zallik mahsulotlari",
    deliveryFeeSom: 15_000,
    minOrderSom: 80_000,
    deliveryDays: 1,
    rating: 4.6,
    ratingCount: 980,
    color: 'green',
    sortOrder: 40,
    products: [
      {
        slug: 'yuz-kremi',
        name: 'Namlantiruvchi yuz kremi 50ml',
        description: 'Quruq teri uchun, gialuron kislotasi bilan.',
        priceSom: 145_000,
        stock: 55,
        categorySlug: 'gozallik',
      },
      {
        slug: 'shampun-set',
        name: 'Shampun va balzam to\'plami',
        priceSom: 128_000,
        oldPriceSom: 165_000,
        stock: 40,
        categorySlug: 'gozallik',
      },
      {
        slug: 'vitamin-d3',
        name: 'Vitamin D3 (60 tabletka)',
        description: "Kuniga 1 tabletka. Qish oylari uchun tavsiya etiladi.",
        priceSom: 95_000,
        stock: 90,
        categorySlug: 'gozallik',
      },
    ],
  },
  {
    slug: 'uy-jihoz',
    name: 'Uy Jihoz',
    description: "Oshxona va uy uchun kerakli hamma narsa",
    deliveryFeeSom: 20_000,
    minOrderSom: 120_000,
    deliveryDays: 3,
    rating: 4.4,
    ratingCount: 640,
    color: 'violet',
    sortOrder: 50,
    products: [
      {
        slug: 'qozon-toplami',
        name: "Qozon-tovoq to'plami (6 predmet)",
        description: 'Yopishmaydigan qoplama, induksiyaga mos.',
        priceSom: 890_000,
        oldPriceSom: 1_150_000,
        stock: 16,
        categorySlug: 'maishiy-texnika',
      },
      {
        slug: 'elektr-choynak',
        name: 'Elektr choynak 1.8L',
        description: "Shisha korpus, avtomatik o'chish.",
        priceSom: 285_000,
        stock: 33,
        categorySlug: 'maishiy-texnika',
      },
      {
        slug: 'dazmol-bugli',
        name: "Bug'li dazmol 2400W",
        priceSom: 495_000,
        stock: 19,
        categorySlug: 'maishiy-texnika',
      },
    ],
  },
] as const;
