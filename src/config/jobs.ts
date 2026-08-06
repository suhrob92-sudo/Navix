/**
 * Ish qidirish uchun boshlang'ich katalog — seed manbasi.
 *
 * ── Nima uchun kodda, bazada emas ─────────────────────────────────────
 * Izohi `src/config/marketplace.ts` da: bu ma'lumot loyihaning bir
 * qismi, Git'da tarixga ega va har muhitda bir xil.
 *
 * Haqiqiy vakansiyalar keyinchalik ish beruvchi kabineti orqali
 * qo'shiladi — bu ro'yxat faqat "bo'sh maydoncha" muammosini hal
 * qiladi.
 *
 * ── Maoshlar SO'MDA yoziladi ──────────────────────────────────────────
 * Bazada tiyinda saqlanadi, lekin bu yerda so'mda — odam o'qishi va
 * tekshirishi uchun. O'girish seed'da bir joyda bajariladi.
 *
 * Maosh ko'rsatilmagan bo'lsa maydon YOZILMAYDI (`undefined`) —
 * interfeysda "Kelishilgan" chiqadi. Nol yozish xato bo'lardi: u
 * "bepul ishlang" degan ma'noni berardi.
 */

export interface VacancySeed {
  slug: string;
  title: string;
  description: string;
  /** Qaysi yo'nalishga tegishli (`JOB_CATEGORIES` dagi `slug`). */
  categorySlug: string;
  /** Maosh SO'MDA. Ikkalasi ham ixtiyoriy. */
  salaryMinSom?: number;
  salaryMaxSom?: number;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';
  experienceLevel: 'NONE' | 'JUNIOR' | 'MIDDLE' | 'SENIOR';
  city: string;
  sortOrder: number;
}

export interface CompanySeed {
  slug: string;
  name: string;
  description: string;
  industry: string;
  city: string;
  color: string;
  sortOrder: number;
  vacancies: readonly VacancySeed[];
}

export interface JobCategorySeed {
  slug: string;
  name: string;
  /** `lucide-react` ikonkasi nomi. */
  icon: string;
  sortOrder: number;
}

export const JOB_CATEGORIES: readonly JobCategorySeed[] = [
  { slug: 'it', name: 'IT va dasturlash', icon: 'Code', sortOrder: 10 },
  { slug: 'savdo', name: 'Savdo va marketing', icon: 'ShoppingBag', sortOrder: 20 },
  { slug: 'xizmat', name: 'Xizmat ko\'rsatish', icon: 'Coffee', sortOrder: 30 },
  { slug: 'logistika', name: 'Logistika va transport', icon: 'Truck', sortOrder: 40 },
  { slug: 'moliya', name: 'Moliya va buxgalteriya', icon: 'Calculator', sortOrder: 50 },
  { slug: 'talim', name: "Ta'lim", icon: 'GraduationCap', sortOrder: 60 },
  { slug: 'tibbiyot', name: 'Tibbiyot', icon: 'Stethoscope', sortOrder: 70 },
  { slug: 'qurilish', name: 'Qurilish va ishlab chiqarish', icon: 'HardHat', sortOrder: 80 },
] as const;

export const COMPANIES: readonly CompanySeed[] = [
  {
    slug: 'texnomart',
    name: 'Texnomart',
    description: "O'zbekistondagi yirik maishiy texnika va elektronika savdo tarmog'i.",
    industry: 'Savdo',
    city: 'Toshkent',
    color: 'blue',
    sortOrder: 10,
    vacancies: [
      {
        slug: 'texnomart-sotuvchi-maslahatchi',
        title: 'Sotuvchi-maslahatchi',
        description:
          "Do'kon zalida mijozlarga texnika tanlashda yordam berasiz, mahsulot xususiyatlarini tushuntirasiz va savdoni rasmiylashtirasiz.\n\nTalablar: muloqotga ochiqlik, o'zbek va rus tillarini bilish. Tajriba shart emas — o'qitamiz.\n\nSharoit: 5/2 ish grafigi, rasmiy ish, oylik + savdodan foiz.",
        categorySlug: 'savdo',
        salaryMinSom: 4_000_000,
        salaryMaxSom: 7_000_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'NONE',
        city: 'Toshkent',
        sortOrder: 10,
      },
      {
        slug: 'texnomart-ombor-mudiri',
        title: 'Ombor mudiri',
        description:
          "Ombordagi qoldiqlarni nazorat qilasiz, kirim-chiqimni rasmiylashtirasiz va inventarizatsiya o'tkazasiz.\n\nTalablar: omborda kamida 2 yil tajriba, 1C yoki shunga o'xshash dastur bilan ishlay olish.\n\nSharoit: rasmiy ish, tushlik bilan ta'minlanadi.",
        categorySlug: 'logistika',
        salaryMinSom: 8_000_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'MIDDLE',
        city: 'Toshkent',
        sortOrder: 20,
      },
    ],
  },
  {
    slug: 'navix-tech',
    name: 'Navix Tech',
    description: 'Markaziy Osiyo uchun super-ilova yaratayotgan texnologiya kompaniyasi.',
    industry: 'IT',
    city: 'Toshkent',
    color: 'violet',
    sortOrder: 20,
    vacancies: [
      {
        slug: 'navix-frontend-dasturchi',
        title: 'Frontend dasturchi (React)',
        description:
          "Mobil ilovaning interfeysini yaratasiz va mavjud sahifalarni yaxshilaysiz.\n\nTalablar: React va TypeScript bilan kamida 2 yil tajriba, Git bilan ishlay olish, responsive dizaynni tushunish.\n\nSharoit: gibrid grafik, zamonaviy uskunalar, ingliz tili kurslari.",
        categorySlug: 'it',
        salaryMinSom: 12_000_000,
        salaryMaxSom: 20_000_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'MIDDLE',
        city: 'Toshkent',
        sortOrder: 10,
      },
      {
        slug: 'navix-qa-muhandis',
        title: 'QA muhandis',
        description:
          "Ilovaning sifatini tekshirasiz: sinov ssenariylarini yozasiz, xatolarni topib hujjatlashtirasiz.\n\nTalablar: sinov asoslarini bilish, diqqatlilik. Tajribasiz nomzodlar ham ko'rib chiqiladi.\n\nSharoit: tajribali mentor biriktiriladi.",
        categorySlug: 'it',
        salaryMinSom: 6_000_000,
        salaryMaxSom: 10_000_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'JUNIOR',
        city: 'Toshkent',
        sortOrder: 20,
      },
      {
        slug: 'navix-mobil-dasturchi-amaliyot',
        title: 'Mobil dasturchi (amaliyot)',
        description:
          "Talabalar uchun 3 oylik amaliyot dasturi. Haqiqiy loyihada ishlaysiz va tajribali dasturchi rahbarligida o'rganasiz.\n\nTalablar: dasturlash asoslarini bilish, o'rganishga qiziqish.\n\nSharoit: amaliyot to'lanadi, muvaffaqiyatli yakunlansa doimiy ishga taklif qilinadi.",
        categorySlug: 'it',
        salaryMinSom: 3_000_000,
        employmentType: 'INTERNSHIP',
        experienceLevel: 'NONE',
        city: 'Toshkent',
        sortOrder: 30,
      },
    ],
  },
  {
    slug: 'milliy-taomlar-guruhi',
    name: 'Milliy Taomlar',
    description: "Toshkentdagi milliy oshxona restoranlari tarmog'i.",
    industry: 'Umumiy ovqatlanish',
    city: 'Toshkent',
    color: 'orange',
    sortOrder: 30,
    vacancies: [
      {
        slug: 'milliy-taomlar-oshpaz',
        title: 'Oshpaz',
        description:
          "Milliy taomlar tayyorlaysiz, oshxonada tozalik va tartibni saqlaysiz.\n\nTalablar: oshxonada kamida 3 yil tajriba, sanitariya daftarchasi.\n\nSharoit: 2/2 grafik, uch mahal ovqat, forma beriladi.",
        categorySlug: 'xizmat',
        salaryMinSom: 7_000_000,
        salaryMaxSom: 11_000_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'MIDDLE',
        city: 'Toshkent',
        sortOrder: 10,
      },
      {
        slug: 'milliy-taomlar-ofitsiant',
        title: 'Ofitsiant',
        description:
          "Mehmonlarni kutib olasiz, buyurtma qabul qilasiz va xizmat ko'rsatasiz.\n\nTalablar: xushmuomalalik, o'zbek va rus tillari. Tajriba shart emas.\n\nSharoit: yarim stavka mumkin, choychaqa qoladi.",
        categorySlug: 'xizmat',
        employmentType: 'PART_TIME',
        experienceLevel: 'NONE',
        city: 'Toshkent',
        sortOrder: 20,
      },
    ],
  },
  {
    slug: 'oq-yol-logistika',
    name: "Oq Yo'l Logistika",
    description: 'Viloyatlararo yuk tashish va omborxona xizmatlari.',
    industry: 'Logistika',
    city: 'Samarqand',
    color: 'amber',
    sortOrder: 40,
    vacancies: [
      {
        slug: 'oq-yol-haydovchi',
        title: 'Yuk mashinasi haydovchisi',
        description:
          "Viloyatlararo yo'nalishlarda yuk tashiysiz, hujjatlarni rasmiylashtirasiz.\n\nTalablar: C toifadagi haydovchilik guvohnomasi, kamida 3 yil tajriba.\n\nSharoit: yo'l xarajatlari qoplanadi, oylik + reys uchun to'lov.",
        categorySlug: 'logistika',
        salaryMinSom: 9_000_000,
        salaryMaxSom: 15_000_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'MIDDLE',
        city: 'Samarqand',
        sortOrder: 10,
      },
      {
        slug: 'oq-yol-buxgalter',
        title: 'Buxgalter',
        description:
          "Kompaniyaning moliyaviy hisobotlarini yuritasiz, soliq hisobotlarini topshirasiz.\n\nTalablar: buxgalteriya sohasida 5 yil tajriba, 1C:Buxgalteriya.\n\nSharoit: masofaviy ishlash mumkin.",
        categorySlug: 'moliya',
        salaryMinSom: 10_000_000,
        employmentType: 'REMOTE',
        experienceLevel: 'SENIOR',
        city: 'Samarqand',
        sortOrder: 20,
      },
    ],
  },
  {
    slug: 'bilim-markazi',
    name: 'Bilim Markazi',
    description: "Chet tillari va aniq fanlar bo'yicha o'quv markazi.",
    industry: "Ta'lim",
    city: 'Buxoro',
    color: 'green',
    sortOrder: 50,
    vacancies: [
      {
        slug: 'bilim-ingliz-tili-oqituvchisi',
        title: 'Ingliz tili o\'qituvchisi',
        description:
          "Turli darajadagi guruhlarga ingliz tilidan dars berasiz.\n\nTalablar: IELTS 6.5 dan yuqori yoki shunga teng sertifikat, dars berish tajribasi.\n\nSharoit: soatbay to'lov, qulay grafik, metodik yordam.",
        categorySlug: 'talim',
        salaryMinSom: 5_000_000,
        salaryMaxSom: 12_000_000,
        employmentType: 'PART_TIME',
        experienceLevel: 'JUNIOR',
        city: 'Buxoro',
        sortOrder: 10,
      },
      {
        slug: 'bilim-administrator',
        title: 'Administrator',
        description:
          "Markazning kunlik ishini tashkil qilasiz: o'quvchilarni ro'yxatga olasiz, jadvalni yuritasiz, ota-onalar bilan gaplashasiz.\n\nTalablar: kompyuter savodxonligi, tashkilotchilik.\n\nSharoit: 6/1 grafik, rasmiy ish.",
        categorySlug: 'xizmat',
        salaryMinSom: 4_500_000,
        employmentType: 'FULL_TIME',
        experienceLevel: 'NONE',
        city: 'Buxoro',
        sortOrder: 20,
      },
    ],
  },
] as const;
