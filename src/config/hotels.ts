import type { ServiceColor } from '@/config/modules';

/**
 * Boshlang'ich mehmonxonalar ro'yxati (seed manbasi).
 *
 * ── Nima uchun bu yerda, bazada emas ──────────────────────────────────
 * Restoran va do'konlardagi kabi: bu FAQAT birinchi ishga tushirish
 * uchun. Ishlash paytida mehmonxonalar bazadan o'qiladi.
 *
 * ── Narxlar SO'MDA ────────────────────────────────────────────────────
 * Seed paytida tiyinga o'giriladi. Bu yerda so'mda yozilgan, chunki
 * ro'yxatni odam o'qiydi va tahrirlaydi.
 */

export interface HotelRoomSeed {
  name: string;
  description?: string;
  /** Nechta mehmon sig'adi. */
  capacity: number;
  pricePerNightSom: number;
  /** Shu turdagi xonalar soni. */
  totalRooms: number;
}

export interface HotelSeed {
  slug: string;
  name: string;
  description: string;
  city: string;
  address: string;
  stars: number;
  rating: number;
  ratingCount: number;
  amenities: readonly string[];
  color: ServiceColor;
  sortOrder: number;
  rooms: readonly HotelRoomSeed[];
}

/** Mehmonxona bor shaharlar — filtr uchun. */
export const HOTEL_CITIES = ['Toshkent', 'Samarqand', 'Buxoro', 'Xiva', "Farg'ona"] as const;

export const HOTELS: readonly HotelSeed[] = [
  {
    slug: 'navruz-plaza',
    name: 'Navruz Plaza',
    description:
      "Shahar markazida, metro yonida. Ish safari uchun qulay: konferens-zal va tezkor Wi-Fi bor.",
    city: 'Toshkent',
    address: "Amir Temur ko'chasi 45-uy",
    stars: 4,
    rating: 4.6,
    ratingCount: 218,
    amenities: ['Wi-Fi', 'Nonushta', 'Avtoturargoh', 'Konditsioner', 'Konferens-zal'],
    color: 'violet',
    sortOrder: 1,
    rooms: [
      {
        name: 'Standart',
        description: "Ikki kishilik karavot, ish stoli va shahar manzarasi.",
        capacity: 2,
        pricePerNightSom: 450_000,
        totalRooms: 12,
      },
      {
        name: 'Komfort',
        description: 'Kengroq xona, divan va mini-oshxona bilan.',
        capacity: 3,
        pricePerNightSom: 680_000,
        totalRooms: 6,
      },
      {
        name: 'Lyuks',
        description: 'Ikki xonali nomer, panoramali oyna va vanna.',
        capacity: 4,
        pricePerNightSom: 1_200_000,
        totalRooms: 2,
      },
    ],
  },
  {
    slug: 'registon-saroy',
    name: 'Registon Saroy',
    description: "Registon maydonidan besh daqiqa piyoda. An'anaviy bezak va milliy nonushta.",
    city: 'Samarqand',
    address: "Registon ko'chasi 12-uy",
    stars: 4,
    rating: 4.8,
    ratingCount: 342,
    amenities: ['Wi-Fi', 'Nonushta', 'Hovli', 'Konditsioner'],
    color: 'amber',
    sortOrder: 2,
    rooms: [
      {
        name: 'Standart',
        description: "Milliy uslubdagi jihoz, ikki kishilik karavot.",
        capacity: 2,
        pricePerNightSom: 380_000,
        totalRooms: 10,
      },
      {
        name: 'Oilaviy',
        description: 'Ikki karavot va bolalar uchun qo\'shimcha joy.',
        capacity: 4,
        pricePerNightSom: 620_000,
        totalRooms: 4,
      },
    ],
  },
  {
    slug: 'buxoro-karvon',
    name: 'Buxoro Karvon',
    description: "Labi Hovuz yonidagi tarixiy binoda. Tomida choyxona va shahar manzarasi.",
    city: 'Buxoro',
    address: "Labi Hovuz maydoni 3-uy",
    stars: 3,
    rating: 4.5,
    ratingCount: 156,
    amenities: ['Wi-Fi', 'Nonushta', 'Choyxona'],
    color: 'orange',
    sortOrder: 3,
    rooms: [
      {
        name: 'Standart',
        capacity: 2,
        pricePerNightSom: 290_000,
        totalRooms: 8,
      },
      {
        name: 'Yakka',
        description: 'Bir kishilik ixcham xona.',
        capacity: 1,
        pricePerNightSom: 190_000,
        totalRooms: 5,
      },
    ],
  },
  {
    slug: 'xiva-ichan-qala',
    name: "Xiva Ichan Qal'a",
    description: "Ichan Qal'a devorlari ichida. Ertalab quyosh chiqishini tomdan kuzating.",
    city: 'Xiva',
    address: "Ichan Qal'a, Pahlavon Mahmud ko'chasi 7-uy",
    stars: 3,
    rating: 4.7,
    ratingCount: 204,
    amenities: ['Wi-Fi', 'Nonushta', 'Tom terrasasi'],
    color: 'teal',
    sortOrder: 4,
    rooms: [
      {
        name: 'Standart',
        capacity: 2,
        pricePerNightSom: 260_000,
        totalRooms: 9,
      },
      {
        name: 'Lyuks',
        description: "Qal'a manzarasiga qaraydigan katta xona.",
        capacity: 3,
        pricePerNightSom: 470_000,
        totalRooms: 3,
      },
    ],
  },
  {
    slug: 'fargona-vodiy',
    name: "Farg'ona Vodiy",
    description: "Shahar bog'i yonida, tinch joyda. Uzoq safarlardan keyin dam olish uchun qulay.",
    city: "Farg'ona",
    address: "Mustaqillik ko'chasi 22-uy",
    stars: 3,
    rating: 4.3,
    ratingCount: 87,
    amenities: ['Wi-Fi', 'Avtoturargoh', 'Konditsioner'],
    color: 'green',
    sortOrder: 5,
    rooms: [
      {
        name: 'Standart',
        capacity: 2,
        pricePerNightSom: 240_000,
        totalRooms: 14,
      },
    ],
  },
] as const;

/**
 * Bandlov qoidalari.
 *
 * Bu yerda — chunki ular biznes qarori, dasturchi qarori emas.
 */
export const BOOKING_RULES = {
  /** Eng ko'pi bilan shuncha kun oldin band qilish mumkin. */
  maxDaysAhead: 365,
  /** Bitta bandlovda eng ko'p kecha. */
  maxNights: 30,
  /** Bitta bandlovda eng ko'p mehmon. */
  maxGuests: 10,
} as const;
