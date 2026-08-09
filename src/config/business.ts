/**
 * Biznes profillari uchun boshlang'ich ma'lumot (seed manbasi).
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * Manzil, ish vaqti va telefon restoran menyusiga ham, do'kon
 * mahsulotiga ham aloqasi yo'q. Ularni `restaurants.ts` va
 * `marketplace.ts` ichiga aralashtirsak, ikkala fayl ham ikki ish
 * qiladigan bo'lib qolardi.
 *
 * Kalit — biznesning `slug` i. Shu tufayli mavjud ro'yxatlarga
 * umuman tegilmaydi.
 *
 * ── Ma'lumot HAQIQIY emas ─────────────────────────────────────────────
 * Manzillar va telefonlar namuna. Haqiqiy biznes ulanganda ular
 * egasining kabinetidan kiritiladi.
 */

export interface BusinessProfileSeed {
  /** Restoran yoki do'kon `slug` i. */
  slug: string;
  city: string;
  address: string;
  phone: string;
  /** Ish vaqti — "HH:MM". */
  opensAt: string;
  closesAt: string;
  about: string;
  isVerified: boolean;
}

export const BUSINESS_PROFILES: readonly BusinessProfileSeed[] = [
  // ── Restoranlar ─────────────────────────────────────────────────────
  {
    slug: 'milliy-taomlar',
    city: 'Toshkent',
    address: "Amir Temur ko'chasi 12-uy",
    phone: '+998901110011',
    opensAt: '09:00',
    closesAt: '23:00',
    about: "Milliy oshxona: palov, norin, manti va shurva. O'tin tandirda pishiriladi.",
    isVerified: true,
  },
  {
    slug: 'choyxona-navruz',
    city: 'Toshkent',
    address: "Navoiy ko'chasi 45-uy",
    phone: '+998901110022',
    opensAt: '08:00',
    closesAt: '22:00',
    about: "An'anaviy choyxona. Ertalabki nonushta va kunduzgi taomlar.",
    isVerified: false,
  },
  {
    slug: 'pizza-roma',
    city: 'Toshkent',
    address: "Shota Rustaveli ko'chasi 8-uy",
    phone: '+998901110033',
    opensAt: '10:00',
    closesAt: '23:30',
    about: "Italyan retsepti bo'yicha o'tin pechida pishirilgan pitsa.",
    isVerified: true,
  },
  {
    slug: 'burger-house',
    city: 'Toshkent',
    address: "Mustaqillik shoh ko'chasi 3-uy",
    phone: '+998901110044',
    opensAt: '10:00',
    closesAt: '23:00',
    about: "Har kuni yangi go'shtdan tayyorlanadigan burgerlar.",
    isVerified: true,
  },
  {
    slug: 'sushi-time',
    city: 'Toshkent',
    address: "Bunyodkor ko'chasi 27-uy",
    phone: '+998901110055',
    opensAt: '11:00',
    closesAt: '23:00',
    about: 'Yaponcha sushi va rolllar. Baliq har kuni yangi keltiriladi.',
    isVerified: false,
  },
  {
    slug: 'non-va-kofe',
    city: 'Toshkent',
    address: "Yunusobod, Amir Temur ko'chasi 108-uy",
    phone: '+998901110066',
    opensAt: '07:00',
    closesAt: '21:00',
    about: 'Har kuni ertalab pishiriladigan non, shirinlik va kofe.',
    isVerified: false,
  },

  // ── Do'konlar ───────────────────────────────────────────────────────
  {
    slug: 'texnomart',
    city: 'Toshkent',
    address: "Chilonzor, Bunyodkor shoh ko'chasi 15-uy",
    phone: '+998901220011',
    opensAt: '09:00',
    closesAt: '21:00',
    about: 'Telefon, noutbuk va maishiy texnika — rasmiy kafolat bilan.',
    isVerified: true,
  },
  {
    slug: 'moda-bozor',
    city: 'Toshkent',
    address: "Yakkasaroy, Shota Rustaveli ko'chasi 61-uy",
    phone: '+998901220022',
    opensAt: '10:00',
    closesAt: '20:00',
    about: 'Erkaklar va ayollar kiyimi, poyabzal va aksessuarlar.',
    isVerified: false,
  },
  {
    slug: 'kitob-dunyosi',
    city: 'Toshkent',
    address: "Mirzo Ulug'bek, Buyuk Ipak Yo'li 54-uy",
    phone: '+998901220033',
    opensAt: '09:00',
    closesAt: '19:00',
    about: "Badiiy, ilmiy va bolalar adabiyoti. O'zbek va rus tillarida.",
    isVerified: false,
  },
  {
    slug: 'sogliq-plus',
    city: 'Toshkent',
    address: "Shayxontohur, Zarqaynar ko'chasi 22-uy",
    phone: '+998901220044',
    opensAt: '08:00',
    closesAt: '22:00',
    about: 'Vitaminlar, sport ozuqasi va parvarish mahsulotlari.',
    isVerified: true,
  },
  {
    slug: 'uy-jihoz',
    city: 'Samarqand',
    address: "Registon ko'chasi 30-uy",
    phone: '+998901220055',
    opensAt: '09:00',
    closesAt: '20:00',
    about: 'Uy jihozlari, mebel va oshxona buyumlari.',
    isVerified: false,
  },
] as const;
