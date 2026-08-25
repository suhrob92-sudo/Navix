/**
 * Vakansiya filtrlari — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Ish qidirayotgan odamning BIRINCHI savoli — maosh. U e'lonni
 * ochishdan oldin shuni biladi va faqat shundan keyin qolganini
 * o'qiydi.
 *
 * Server tomonida eng kam maosh filtri bor edi, lekin ekranda u
 * YO'Q edi: ya'ni imkoniyat bor, foydalanuvchi esa undan xabarsiz.
 *
 * ── Nima uchun filtrlar MANZILDA saqlanadi ────────────────────────────
 * Sabab mehmonxonadagi bilan bir xil, lekin bu yerda og'irroq: ish
 * qidirish bir necha kun davom etadi. Odam vakansiyani ochib,
 * ORQAGA qaytadi va yana ochadi — o'nlab marta.
 *
 * Har safar filtrlar tozalansa, u shartlarini qaytadan tanlab
 * charchaydi va qidiruvni tashlab yuboradi.
 */

/** Saralash turlari — server bilan bir xil nomlar. */
export type JobSort = 'new' | 'salary';

export const JOB_SORT_OPTIONS: readonly { value: JobSort; label: string }[] = [
  { value: 'new', label: 'Yangi' },
  { value: 'salary', label: 'Maosh' },
];

/** Bandlik turlari — ekrandagi nomlari bilan. */
export const EMPLOYMENT_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'FULL_TIME', label: "To'liq stavka" },
  { value: 'PART_TIME', label: 'Yarim stavka' },
  { value: 'CONTRACT', label: 'Shartnoma' },
  { value: 'INTERNSHIP', label: 'Amaliyot' },
  { value: 'REMOTE', label: 'Masofaviy' },
];

/** Tajriba darajalari. */
export const EXPERIENCE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'NONE', label: 'Tajribasiz' },
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'MIDDLE', label: 'Middle' },
  { value: 'SENIOR', label: 'Senior' },
];

/**
 * Tez tanlash uchun maosh chegaralari — SO'MDA.
 *
 * ── Nima uchun tayyor tugmalar ────────────────────────────────────────
 * Maoshni qo'lda yozish telefonda uzoq ish: raqam maydonini ochish,
 * yetti xonali sonni terish, xato qilib qaytadan terish.
 *
 * Tayyor tugmalar esa bitta bosish. Ular O'zbekistondagi haqiqiy
 * maosh darajalariga qarab tanlangan — o'ylab topilgan yumaloq
 * sonlar emas.
 */
export const SALARY_STEPS: readonly number[] = [3_000_000, 5_000_000, 8_000_000, 12_000_000, 20_000_000];

/** Filtr chegarasi — SO'MDA. */
export const MAX_SALARY_SOM = 1_000_000_000;

/** Filtr holati. */
export interface JobFilters {
  search?: string;
  category?: string;
  company?: string;
  city?: string;
  employmentType?: string;
  experienceLevel?: string;
  /** Maosh — SO'MDA. */
  minSalarySom?: number;
  maxSalarySom?: number;
  sort: JobSort;
}

export type JobFilterKey =
  | 'category'
  | 'company'
  | 'city'
  | 'employmentType'
  | 'experienceLevel'
  | 'minSalarySom'
  | 'maxSalarySom';

/** Boshlang'ich holat — hech narsa tanlanmagan. */
export function emptyJobFilters(): JobFilters {
  return { sort: 'new' };
}

/**
 * Nechta filtr YOQILGAN.
 *
 * Saralash sanalmaydi — u hech narsani yashirmaydi.
 */
export function activeJobFilterCount(filters: JobFilters, skip: readonly JobFilterKey[] = []): number {
  const keys: JobFilterKey[] = [
    'category',
    'company',
    'city',
    'employmentType',
    'experienceLevel',
    'minSalarySom',
    'maxSalarySom',
  ];

  return keys.filter((key) => !skip.includes(key) && filters[key] !== undefined && filters[key] !== '').length;
}

/** Filtrlarni manzil satriga aylantiradi. */
export function jobFiltersToParams(filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.company) params.set('company', filters.company);
  if (filters.city) params.set('city', filters.city);
  if (filters.employmentType) params.set('employmentType', filters.employmentType);
  if (filters.experienceLevel) params.set('experienceLevel', filters.experienceLevel);
  if (filters.minSalarySom !== undefined) params.set('minSalarySom', String(filters.minSalarySom));
  if (filters.maxSalarySom !== undefined) params.set('maxSalarySom', String(filters.maxSalarySom));

  /** Saralash HAR DOIM yoziladi: u natijaning bir qismi. */
  params.set('sort', filters.sort);

  return params;
}

/**
 * Manzil satridan filtrlarni o'qiydi.
 *
 * Yaroqsiz qiymat jimgina tashlanadi — sahifa baribir ochiladi,
 * faqat o'sha filtrsiz.
 */
export function paramsToJobFilters(params: URLSearchParams): JobFilters {
  const number = (key: string): number | undefined => {
    const raw = params.get(key);

    if (raw === null) return undefined;

    const value = Number(raw);

    return Number.isInteger(value) && value >= 0 && value <= MAX_SALARY_SOM ? value : undefined;
  };

  const fromList = (key: string, options: readonly { value: string }[]): string | undefined => {
    const raw = params.get(key);

    return raw !== null && options.some((option) => option.value === raw) ? raw : undefined;
  };

  const rawSort = params.get('sort');

  return {
    search: params.get('search') ?? undefined,
    category: params.get('category') ?? undefined,
    company: params.get('company') ?? undefined,
    city: params.get('city') ?? undefined,
    employmentType: fromList('employmentType', EMPLOYMENT_OPTIONS),
    experienceLevel: fromList('experienceLevel', EXPERIENCE_OPTIONS),
    minSalarySom: number('minSalarySom'),
    maxSalarySom: number('maxSalarySom'),
    sort: JOB_SORT_OPTIONS.some((option) => option.value === rawSort) ? (rawSort as JobSort) : 'new',
  };
}

/**
 * Maosh oralig'i to'g'rimi.
 *
 * Server buni baribir tekshiradi, lekin u bo'sh ro'yxat qaytarardi —
 * odam esa "vakansiya yo'q ekan" deb o'ylardi.
 */
export function salaryRangeError(filters: JobFilters): string | null {
  const { minSalarySom, maxSalarySom } = filters;

  if (minSalarySom === undefined || maxSalarySom === undefined) return null;

  return minSalarySom > maxSalarySom ? "Eng kam maosh eng ko'pdan katta bo'lib qoldi" : null;
}

/**
 * Yoqilgan filtrlarni odam tiliga o'giradi.
 *
 * @param format Maoshni matnga aylantiruvchi (so'mda son kutadi).
 */
export function describeJobFilters(
  filters: JobFilters,
  format: (som: number) => string,
  skip: readonly JobFilterKey[] = [],
): { key: JobFilterKey; label: string }[] {
  const chips: { key: JobFilterKey; label: string }[] = [];

  const allowed = (key: JobFilterKey) => !skip.includes(key);

  if (filters.category && allowed('category')) chips.push({ key: 'category', label: filters.category });
  if (filters.company && allowed('company')) chips.push({ key: 'company', label: filters.company });
  if (filters.city && allowed('city')) chips.push({ key: 'city', label: filters.city });

  if (filters.employmentType && allowed('employmentType')) {
    const option = EMPLOYMENT_OPTIONS.find((item) => item.value === filters.employmentType);

    chips.push({ key: 'employmentType', label: option?.label ?? filters.employmentType });
  }

  if (filters.experienceLevel && allowed('experienceLevel')) {
    const option = EXPERIENCE_OPTIONS.find((item) => item.value === filters.experienceLevel);

    chips.push({ key: 'experienceLevel', label: option?.label ?? filters.experienceLevel });
  }

  if (filters.minSalarySom !== undefined && allowed('minSalarySom')) {
    chips.push({ key: 'minSalarySom', label: `${format(filters.minSalarySom)} dan` });
  }

  if (filters.maxSalarySom !== undefined && allowed('maxSalarySom')) {
    chips.push({ key: 'maxSalarySom', label: `${format(filters.maxSalarySom)} gacha` });
  }

  return chips;
}

/** Bitta filtrni o'chiradi. */
export function clearJobFilter(filters: JobFilters, key: JobFilterKey): JobFilters {
  const next = { ...filters };

  delete next[key];

  return next;
}
