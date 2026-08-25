import { HOTEL_AMENITIES } from '@/config/hotels';

/**
 * Mehmonxona filtrlari — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Ro'yxatda faqat SHAHAR filtri bor edi. Lekin mehmonxona tanlash
 * shahardan keyin boshlanadi: Toshkentda o'nlab mehmonxona bor va
 * ularning narxi to'rt barobar farq qiladi.
 *
 * Odam boshiga keladigan savollar boshqacha: "600 mingdan arzoni
 * bormi", "kamida to'rt yulduz", "avtoturargohi bor", "Mirobodda".
 * Ro'yxatni oxirigacha varaqlab javob topish — telefonda umuman
 * ishlamaydigan usul.
 *
 * ── Nima uchun filtrlar MANZILDA saqlanadi ────────────────────────────
 * Sabab `product-filter.ts` dagi bilan bir xil: mehmonxonani ochib
 * ORQAGA qaytgan odam filtrlarini yo'qotmasligi kerak, havolani
 * do'stiga yubora olishi kerak va sahifa yangilanganda hammasi
 * saqlanib qolishi kerak.
 */

/** Saralash turlari — server bilan bir xil nomlar. */
export type HotelSort = 'popular' | 'price' | 'rating';

export const HOTEL_SORT_OPTIONS: readonly { value: HotelSort; label: string }[] = [
  { value: 'popular', label: 'Tavsiya' },
  { value: 'price', label: 'Narx' },
  { value: 'rating', label: 'Reyting' },
];

/**
 * Yulduz bo'yicha tanlov — "va undan yuqori".
 *
 * ── Nima uchun ANIQ yulduz emas ───────────────────────────────────────
 * Mehmon "aynan uch yulduzli" mehmonxonani izlamaydi. U pastki
 * chegara qo'yadi: "uch yulduzdan past bo'lmasin".
 *
 * Aniq tanlov qilinsa, "4 yulduz" belgilangan odam 5 yulduzli
 * mehmonxonani ko'rmasdi — bu mutlaqo mantiqsiz.
 */
export const STAR_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 5, label: '5 yulduz' },
  { value: 4, label: '4 va undan yuqori' },
  { value: 3, label: '3 va undan yuqori' },
];

/** Filtr oynasidagi qulayliklar. */
export const AMENITY_OPTIONS: readonly string[] = HOTEL_AMENITIES;

/** Narx chegarasi — SO'MDA. Bir kecha uchun. */
export const MAX_PRICE_SOM = 100_000_000;

/** Filtr holati — brauzer va manzil o'rtasida shu ko'rinishda yuradi. */
export interface HotelFilters {
  search?: string;
  city?: string;
  district?: string;
  /** Bir kecha narxi — SO'MDA. */
  minPriceSom?: number;
  maxPriceSom?: number;
  /** Kamida shuncha yulduz. */
  minStars?: number;
  /**
   * Talab qilinadigan qulayliklar.
   *
   * ── Nima uchun HAMMASI bo'lishi shart ───────────────────────────────
   * "Wi-Fi va Avtoturargoh" belgilagan odam ikkalasi HAM borini
   * izlaydi — bu uning talabi, tanlovi emas.
   *
   * "Yo ikkisidan biri" degan ma'no berilsa, avtoturargohsiz
   * mehmonxona ro'yxatda qolardi va odam uni ochib, faqat o'sha
   * yerda bilib olardi.
   */
  amenities?: string[];
  sort: HotelSort;
}

/**
 * Filtr maydonining nomi.
 *
 * Ba'zi sahifalarda bittasi O'ZGARMAYDI (masalan shahar sahifasida
 * shahar). Bunday maydonni sanash tugmada yolg'on son ko'rsatardi —
 * sabab `product-filter.ts` da batafsil.
 */
export type HotelFilterKey = 'city' | 'district' | 'minPriceSom' | 'maxPriceSom' | 'minStars' | 'amenities';

/** Boshlang'ich holat — hech narsa tanlanmagan. */
export function emptyHotelFilters(): HotelFilters {
  return { sort: 'popular' };
}

/**
 * Nechta filtr YOQILGAN.
 *
 * Qulayliklar HAR BIRI alohida sanaladi: uchtasini belgilagan odam
 * uchta shart qo'ygan va tugmada "1" turishi uni chalg'itardi.
 *
 * Saralash sanalmaydi — u hech narsani yashirmaydi, faqat tartibni
 * o'zgartiradi.
 */
export function activeHotelFilterCount(
  filters: HotelFilters,
  skip: readonly HotelFilterKey[] = [],
): number {
  let count = 0;

  const counts = (key: HotelFilterKey) => !skip.includes(key);

  if (filters.city && counts('city')) count += 1;
  if (filters.district && counts('district')) count += 1;
  if (filters.minPriceSom !== undefined && counts('minPriceSom')) count += 1;
  if (filters.maxPriceSom !== undefined && counts('maxPriceSom')) count += 1;
  if (filters.minStars !== undefined && counts('minStars')) count += 1;
  if (filters.amenities && counts('amenities')) count += filters.amenities.length;

  return count;
}

/** Filtrlarni manzil satriga aylantiradi. Bo'sh qiymatlar yozilmaydi. */
export function hotelFiltersToParams(filters: HotelFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.city) params.set('city', filters.city);
  if (filters.district) params.set('district', filters.district);
  if (filters.minPriceSom !== undefined) params.set('minPriceSom', String(filters.minPriceSom));
  if (filters.maxPriceSom !== undefined) params.set('maxPriceSom', String(filters.maxPriceSom));
  if (filters.minStars !== undefined) params.set('minStars', String(filters.minStars));

  /*
    Qulayliklar VERGUL bilan: `?amenities=Wi-Fi,Nonushta`.

    Har birini alohida `amenities=` qilib yozish ham mumkin edi,
    lekin unda manzil uzayib ketardi va uni odam o'qiy olmasdi.
  */
  if (filters.amenities && filters.amenities.length > 0) {
    params.set('amenities', filters.amenities.join(','));
  }

  /** Saralash HAR DOIM yoziladi: u natijaning bir qismi. */
  params.set('sort', filters.sort);

  return params;
}

/**
 * Manzil satridan filtrlarni o'qiydi.
 *
 * Har bir qiymat TEKSHIRILADI: manzilni istalgan odam qo'lda
 * yozishi mumkin. Yaroqsiz qiymat jimgina tashlab yuboriladi —
 * sahifa baribir ochiladi, faqat o'sha filtrsiz.
 */
export function paramsToHotelFilters(params: URLSearchParams): HotelFilters {
  const number = (key: string): number | undefined => {
    const raw = params.get(key);

    if (raw === null) return undefined;

    const value = Number(raw);

    return Number.isInteger(value) && value >= 0 && value <= MAX_PRICE_SOM ? value : undefined;
  };

  const rawSort = params.get('sort');
  const sort = HOTEL_SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as HotelSort)
    : 'popular';

  const rawStars = number('minStars');

  /*
    Faqat RO'YXATDAGI qulayliklar qabul qilinadi. Aks holda
    manzilga yozilgan har qanday matn serverga tushib, bo'sh
    natija berardi va odam sababini bilmasdi.
  */
  const amenities = (params.get('amenities') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => AMENITY_OPTIONS.includes(item));

  return {
    search: params.get('search') ?? undefined,
    city: params.get('city') ?? undefined,
    district: params.get('district') ?? undefined,
    minPriceSom: number('minPriceSom'),
    maxPriceSom: number('maxPriceSom'),
    minStars: STAR_OPTIONS.some((option) => option.value === rawStars) ? rawStars : undefined,
    amenities: amenities.length > 0 ? [...new Set(amenities)] : undefined,
    sort,
  };
}

/**
 * Narx oralig'i to'g'rimi.
 *
 * ── Nima uchun BRAUZERDA ham tekshiriladi ─────────────────────────────
 * Server buni baribir tekshiradi, lekin u bo'sh ro'yxat qaytarardi —
 * odam esa "mehmonxona yo'q ekan" deb o'ylardi.
 */
export function hotelPriceRangeError(filters: HotelFilters): string | null {
  const { minPriceSom, maxPriceSom } = filters;

  if (minPriceSom === undefined || maxPriceSom === undefined) return null;

  return minPriceSom > maxPriceSom ? "Eng kam narx eng ko'pdan katta bo'lib qoldi" : null;
}

/**
 * Yoqilgan filtrlarni odam tiliga o'giradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Filtrlar yopiq oynada turadi. Ro'yxat ustidagi yorliqlar esa
 * "nega bu yerda kam mehmonxona bor?" degan savolga oynani
 * ochmasdan javob beradi va har birini bitta bosishda o'chirish
 * imkonini beradi.
 *
 * @param format Narxni matnga aylantiruvchi (so'mda son kutadi).
 */
export function describeHotelFilters(
  filters: HotelFilters,
  format: (som: number) => string,
  skip: readonly HotelFilterKey[] = [],
): { key: HotelFilterKey; label: string; value?: string }[] {
  const chips: { key: HotelFilterKey; label: string; value?: string }[] = [];

  const allowed = (key: HotelFilterKey) => !skip.includes(key);

  if (filters.city && allowed('city')) chips.push({ key: 'city', label: filters.city });
  if (filters.district && allowed('district')) chips.push({ key: 'district', label: filters.district });

  if (filters.minPriceSom !== undefined && allowed('minPriceSom')) {
    chips.push({ key: 'minPriceSom', label: `${format(filters.minPriceSom)} dan` });
  }

  if (filters.maxPriceSom !== undefined && allowed('maxPriceSom')) {
    chips.push({ key: 'maxPriceSom', label: `${format(filters.maxPriceSom)} gacha` });
  }

  if (filters.minStars !== undefined && allowed('minStars')) {
    const option = STAR_OPTIONS.find((item) => item.value === filters.minStars);

    chips.push({ key: 'minStars', label: option?.label ?? `${filters.minStars} yulduz` });
  }

  if (filters.amenities && allowed('amenities')) {
    /*
      Har bir qulaylik ALOHIDA yorliq: odam ulardan bittasini
      o'chirmoqchi bo'lishi mumkin, hammasini emas.
    */
    for (const amenity of filters.amenities) {
      chips.push({ key: 'amenities', label: amenity, value: amenity });
    }
  }

  return chips;
}

/** Bitta filtrni o'chiradi. */
export function clearHotelFilter(
  filters: HotelFilters,
  key: HotelFilterKey,
  value?: string,
): HotelFilters {
  const next = { ...filters };

  switch (key) {
    case 'city':
      /*
        Shahar o'chirilsa TUMAN ham o'chadi: "Mirobod" degan tuman
        boshqa shaharda yo'q va u yolg'iz qolsa ro'yxat bo'sh
        chiqardi.
      */
      delete next.city;
      delete next.district;
      break;
    case 'district':
      delete next.district;
      break;
    case 'minPriceSom':
      delete next.minPriceSom;
      break;
    case 'maxPriceSom':
      delete next.maxPriceSom;
      break;
    case 'minStars':
      delete next.minStars;
      break;
    case 'amenities':
      if (value === undefined) {
        delete next.amenities;
      } else {
        const rest = (next.amenities ?? []).filter((item) => item !== value);

        if (rest.length > 0) next.amenities = rest;
        else delete next.amenities;
      }
      break;
  }

  return next;
}
