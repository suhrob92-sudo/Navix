/**
 * Katalog filtrlari — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Server allaqachon narx oralig'i, toifa va "sotuvda bor" bo'yicha
 * filtrlashni bilardi. Lekin EKRANDA ularni boshqaradigan hech
 * narsa yo'q edi: faqat saralash tugmalari turardi.
 *
 * Ya'ni imkoniyat bor edi, foydalanuvchi esa undan foydalana
 * olmasdi. 500 mahsulot ichidan kerakligini topish uchun u
 * ro'yxatni oxirigacha varaqlashi kerak bo'lardi.
 *
 * ── Nima uchun filtrlar MANZILDA saqlanadi ────────────────────────────
 * Ular komponent holatida ham turishi mumkin edi va kod
 * soddaroq bo'lardi.
 *
 * Lekin unda:
 *
 *   1. mahsulotni ochib, ORQAGA qaytgan odam filtrlarini
 *      yo'qotardi va hammasini qaytadan tanlardi;
 *   2. "shu havolani ko'r" deb do'stiga yuborib bo'lmasdi;
 *   3. sahifa yangilanganda ham hammasi tozalanardi.
 *
 * Manzilda esa ular bepul saqlanadi va brauzerning o'z tugmalari
 * ishlaydi.
 */

/** Saralash turlari. */
export type ProductSort = 'popular' | 'cheap' | 'expensive' | 'new';

export const SORT_OPTIONS: readonly { value: ProductSort; label: string }[] = [
  { value: 'popular', label: 'Ommabop' },
  { value: 'cheap', label: 'Avval arzoni' },
  { value: 'expensive', label: 'Avval qimmati' },
  { value: 'new', label: 'Yangilari' },
];

/**
 * Baho bo'yicha filtr darajalari.
 *
 * ── Nima uchun "4 va undan yuqori", aniq "4" emas ─────────────────────
 * Xaridor "aynan 4 bahoni" izlamaydi — u "yomon bo'lmaganini"
 * izlaydi. Aniq baho bo'yicha filtr 4.2 baholi mahsulotni
 * chiqarib tashlardi va bu mutlaqo mantiqsiz bo'lardi.
 */
export const RATING_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 4, label: '4 va undan yuqori' },
  { value: 3, label: '3 va undan yuqori' },
];

/** Filtr holati — brauzer va manzil o'rtasida shu ko'rinishda yuradi. */
export interface ProductFilters {
  search?: string;
  category?: string;
  shop?: string;
  minPriceSom?: number;
  maxPriceSom?: number;
  /** Faqat sotuvda borlari. */
  inStock?: boolean;
  /** Faqat chegirmadagilari. */
  hasDiscount?: boolean;
  /** Shu bahodan yuqorilari. */
  minRating?: number;
  sort: ProductSort;
}

/** Boshlang'ich holat — hech narsa tanlanmagan. */
export function emptyFilters(): ProductFilters {
  return { sort: 'popular' };
}

/**
 * Nechta filtr YOQILGAN.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Filtrlar yopiq oynada turadi va odam ularni ko'rmaydi. Natijada
 * u "nega bu yerda kam mahsulot bor?" deb hayron bo'lardi —
 * kechagi filtr hali ham yoqilganini unutib.
 *
 * Tugmadagi son buni darhol aytadi.
 *
 * ── Nima uchun SARALASH sanalmaydi ────────────────────────────────────
 * Saralash hech narsani yashirmaydi — u faqat tartibni
 * o'zgartiradi. Uni sanash "filtr yoqilgan" degan yolg'on
 * ogohlantirish berardi.
 */
export function activeFilterCount(filters: ProductFilters): number {
  let count = 0;

  if (filters.minPriceSom !== undefined) count += 1;
  if (filters.maxPriceSom !== undefined) count += 1;
  if (filters.shop) count += 1;
  if (filters.inStock) count += 1;
  if (filters.hasDiscount) count += 1;
  if (filters.minRating !== undefined) count += 1;

  return count;
}

/**
 * Filtrlarni manzil satriga aylantiradi.
 *
 * ── Nima uchun BO'SH qiymatlar tushirib qoldiriladi ───────────────────
 * `?minPriceSom=&shop=&inStock=false` ko'rinishidagi manzil
 * o'qib bo'lmas va uzun bo'lardi. Bundan tashqari u har safar
 * boshqacha bo'lib, so'rov keshini buzardi.
 */
export function filtersToParams(filters: ProductFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.shop) params.set('shop', filters.shop);
  if (filters.minPriceSom !== undefined) params.set('minPriceSom', String(filters.minPriceSom));
  if (filters.maxPriceSom !== undefined) params.set('maxPriceSom', String(filters.maxPriceSom));
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.hasDiscount) params.set('hasDiscount', 'true');
  if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating));

  /** Saralash HAR DOIM yoziladi: u natijaning bir qismi. */
  params.set('sort', filters.sort);

  return params;
}

/**
 * Manzil satridan filtrlarni o'qiydi.
 *
 * ── Nima uchun har bir qiymat TEKSHIRILADI ────────────────────────────
 * Manzilni istalgan odam qo'lda yozishi mumkin:
 * `?minPriceSom=salom&sort=hack`. Tekshiruvsiz bunday qiymat
 * so'rovga tushib, serverdan xato qaytarardi va sahifa bo'sh
 * qolardi.
 *
 * Yaroqsiz qiymat jimgina TASHLAB YUBORILADI — sahifa baribir
 * ochiladi, faqat o'sha filtrsiz.
 */
export function paramsToFilters(params: URLSearchParams): ProductFilters {
  const number = (key: string): number | undefined => {
    const raw = params.get(key);

    if (raw === null) return undefined;

    const value = Number(raw);

    return Number.isInteger(value) && value >= 0 ? value : undefined;
  };

  const rawSort = params.get('sort');
  const sort = SORT_OPTIONS.some((option) => option.value === rawSort)
    ? (rawSort as ProductSort)
    : 'popular';

  const rawRating = number('minRating');

  return {
    search: params.get('search') ?? undefined,
    category: params.get('category') ?? undefined,
    shop: params.get('shop') ?? undefined,
    minPriceSom: number('minPriceSom'),
    maxPriceSom: number('maxPriceSom'),
    inStock: params.get('inStock') === 'true' ? true : undefined,
    hasDiscount: params.get('hasDiscount') === 'true' ? true : undefined,
    minRating: RATING_OPTIONS.some((option) => option.value === rawRating) ? rawRating : undefined,
    sort,
  };
}

/**
 * Narx oralig'i to'g'rimi.
 *
 * ── Nima uchun BRAUZERDA ham tekshiriladi ─────────────────────────────
 * Server buni baribir tekshiradi, lekin u bo'sh ro'yxat
 * qaytarardi — odam esa "mahsulot yo'q ekan" deb o'ylardi.
 *
 * Aslida u shunchaki "eng kamdan" ga "eng ko'p" dan katta son
 * yozgan bo'ladi.
 */
export function priceRangeError(min?: number, max?: number): string | null {
  if (min === undefined || max === undefined) return null;

  if (min > max) return "Eng kam narx eng ko'p narxdan katta";

  return null;
}

/** Faol filtrlarni odam tiliga o'giradi — belgilar qatori uchun. */
export function describeFilter(
  filters: ProductFilters,
  shopName?: string,
): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];

  if (filters.minPriceSom !== undefined) {
    chips.push({ key: 'minPriceSom', label: `${formatSom(filters.minPriceSom)} dan` });
  }

  if (filters.maxPriceSom !== undefined) {
    chips.push({ key: 'maxPriceSom', label: `${formatSom(filters.maxPriceSom)} gacha` });
  }

  if (filters.shop) {
    chips.push({ key: 'shop', label: shopName ?? filters.shop });
  }

  if (filters.inStock) chips.push({ key: 'inStock', label: 'Faqat mavjud' });
  if (filters.hasDiscount) chips.push({ key: 'hasDiscount', label: 'Chegirmada' });

  if (filters.minRating !== undefined) {
    chips.push({ key: 'minRating', label: `${filters.minRating}+ baho` });
  }

  return chips;
}

/**
 * So'mni bo'shliq bilan yozadi: 1200000 -> "1 200 000".
 *
 * ── Nima uchun `Intl` EMAS ────────────────────────────────────────────
 * Loyihadagi barcha formatlash qo'lda: `Intl` server va brauzerda
 * boshqacha natija berib, React "hydration mismatch" xatosini
 * chiqarardi (sabab `src/lib/money.ts` da batafsil).
 */
function formatSom(value: number): string {
  const digits = String(Math.trunc(Math.abs(value)));
  const groups: string[] = [];

  for (let end = digits.length; end > 0; end -= 3) {
    groups.unshift(digits.slice(Math.max(0, end - 3), end));
  }

  return groups.join(' ');
}
