import type { ServiceColor } from '@/config/modules';
import type { CatalogImageView } from '@/modules/catalog/catalog-image.types';

/**
 * Ish qidirish moduli — brauzer tomonidagi turlar va qoidalar.
 *
 * `job.service.ts` dan import qilinmaydi: u Prisma'ga bog'liq va
 * brauzer paketiga tushmasligi kerak.
 */

export type EmploymentTypeName = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE';

export type ExperienceLevelName = 'NONE' | 'JUNIOR' | 'MIDDLE' | 'SENIOR';

export type ApplicationStatusName = 'SENT' | 'VIEWED' | 'INVITED' | 'REJECTED' | 'WITHDRAWN';

export interface JobCategoryView {
  id: string;
  slug: string;
  name: string;
  /** `lucide-react` ikonkasi nomi. */
  icon: string;
  vacancyCount: number;
}

export interface CompanyBrief {
  id: string;
  slug: string;
  name: string;
  industry: string;
  color: ServiceColor;
}

/**
 * Kompaniya sahifasi.
 *
 * ── Nima uchun bu sahifa kerak ────────────────────────────────────────
 * Vakansiyani ochgan odamning ikkinchi savoli — "bu qanaqa
 * kompaniya?". Ilgari javob yo'q edi: nom bor, ustiga bosib
 * bo'lmasdi.
 *
 * Odam esa kompaniya haqida bilmasa, ariza yubormaydi — ayniqsa
 * ishini tashlab o'tmoqchi bo'lgan odam.
 */
export interface CompanyDetail extends CompanyBrief {
  description: string;
  city: string;
  /** Shu kompaniyaning OCHIQ vakansiyalari soni. */
  vacancyCount: number;
  /** Kompaniya rasmlari — bor bo'lsa. */
  images: CatalogImageView[];
}

export interface CompanyResponse {
  company: CompanyDetail;
  vacancies: VacancyListItem[];
}

export interface VacancyListItem {
  id: string;
  slug: string;
  title: string;
  /** Maoshlar TIYINDA. `null` — kelishilgan holda. */
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: EmploymentTypeName;
  experienceLevel: ExperienceLevelName;
  city: string;
  createdAt: string;
  company: CompanyBrief;
  category: { slug: string; name: string };
  /**
   * Foydalanuvchi bu vakansiyaga ariza yuborganmi.
   *
   * Ro'yxatda ham ko'rsatiladi: nomzod ochib, "yuborish" tugmasini
   * qidirib, keyin "allaqachon yuborilgan" xabarini olishi — keraksiz
   * ish. Kirmagan foydalanuvchida har doim `false`.
   */
  hasApplied: boolean;
}

export interface VacancyDetail extends VacancyListItem {
  description: string;
  company: CompanyBrief & { description: string; city: string };
  /** Nechta odam ariza yuborgan — nomzod raqobatni ko'rsin. */
  applicationCount: number;
}

export interface JobApplicationView {
  id: string;
  status: ApplicationStatusName;
  coverNote: string | null;
  employerNote: string | null;
  createdAt: string;
  viewedAt: string | null;
  decidedAt: string | null;
  vacancy: {
    id: string;
    slug: string;
    title: string;
    city: string;
    company: CompanyBrief;
  };
}

export interface JobCategoriesResponse {
  categories: JobCategoryView[];
}

export interface VacanciesResponse {
  vacancies: VacancyListItem[];
  total: number;
}

export interface VacancyResponse {
  vacancy: VacancyDetail;
  /** Xuddi shu yo'nalishdagi boshqa vakansiyalar. */
  related: VacancyListItem[];
}

export interface JobApplicationsResponse {
  applications: JobApplicationView[];
}

export interface JobApplicationResponse {
  application: JobApplicationView;
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeName, string> = {
  FULL_TIME: "To'liq stavka",
  PART_TIME: 'Yarim stavka',
  CONTRACT: 'Shartnoma',
  INTERNSHIP: 'Amaliyot',
  REMOTE: 'Masofaviy',
};

export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevelName, string> = {
  NONE: 'Tajriba shart emas',
  JUNIOR: '1-3 yil tajriba',
  MIDDLE: '3-6 yil tajriba',
  SENIOR: '6+ yil tajriba',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatusName, string> = {
  SENT: 'Yuborildi',
  VIEWED: "Ko'rib chiqilmoqda",
  INVITED: 'Suhbatga taklif',
  REJECTED: 'Rad etildi',
  WITHDRAWN: 'Qaytarib olindi',
};

export const APPLICATION_STATUS_VARIANTS: Record<
  ApplicationStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  SENT: 'warning',
  VIEWED: 'default',
  INVITED: 'success',
  REJECTED: 'destructive',
  WITHDRAWN: 'secondary',
};

// ── Ariza holatlari ───────────────────────────────────────────────────

/**
 * Ruxsat etilgan o'tishlar.
 *
 * ── Buyurtma jadvallaridan FARQI ──────────────────────────────────────
 * Bu yerda pul yo'q, shuning uchun "bekor qilish" hech narsani
 * qaytarmaydi. Lekin tartib qoidasi bir xil: faqat oldinga va
 * yakuniy holatdan chiqib bo'lmaydi.
 *
 * `WITHDRAWN` — NOMZODNING amali, qolganlari ish beruvchining.
 * Ikkalasi bitta jadvalda, chunki chegara bitta: qaror qabul
 * qilingandan keyin hech kim hech narsani o'zgartira olmaydi.
 */
export const APPLICATION_TRANSITIONS: Record<ApplicationStatusName, readonly ApplicationStatusName[]> = {
  SENT: ['VIEWED', 'INVITED', 'REJECTED', 'WITHDRAWN'],
  VIEWED: ['INVITED', 'REJECTED', 'WITHDRAWN'],
  INVITED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function canTransition(from: ApplicationStatusName, to: ApplicationStatusName): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}

/** Nomzod arizani hali qaytarib ola oladimi. */
export function canWithdraw(status: ApplicationStatusName): boolean {
  return canTransition(status, 'WITHDRAWN');
}

/** Ariza yakunlangan (javob berilgan) holatdami. */
export function isFinalStatus(status: ApplicationStatusName): boolean {
  return APPLICATION_TRANSITIONS[status].length === 0;
}

// ── Maosh ─────────────────────────────────────────────────────────────

/**
 * Maoshni o'qishga qulay ko'rinishda yozadi.
 *
 * ── Nima uchun alohida funksiya ───────────────────────────────────────
 * To'rtta holat bor va ularning har biri boshqacha o'qiladi:
 *
 *   3 mln – 5 mln  →  "3 000 000 – 5 000 000 so'm"
 *   3 mln – yo'q   →  "3 000 000 so'mdan"
 *   yo'q – 5 mln   →  "5 000 000 so'mgacha"
 *   yo'q – yo'q    →  "Kelishilgan"
 *
 * Buni har sahifada qayta yozish — xatoga chaqiriq. Eng xavflisi
 * oxirgisi: nol ko'rsatilsa "bepul ishlang" degan ma'no chiqadi.
 *
 * `formatTiyin` ishlatiladi: u `Intl` siz ishlaydi va natija har
 * qurilmada bir xil bo'ladi (sabab `src/lib/money.ts` da).
 */
export function formatSalary(
  min: number | null,
  max: number | null,
  formatTiyin: (value: number) => string,
): string {
  if (min !== null && max !== null) {
    // Ikkalasi teng bo'lsa oraliq ko'rsatish ma'nosiz.
    if (min === max) return formatTiyin(min);

    return `${formatTiyin(min)} – ${formatTiyin(max)}`;
  }

  if (min !== null) return `${formatTiyin(min)}dan`;
  if (max !== null) return `${formatTiyin(max)}gacha`;

  return 'Kelishilgan';
}

/** Vakansiyalarni saralash tartibi. */
export const VACANCY_SORTS = [
  { value: 'new', label: 'Yangi' },
  { value: 'salary', label: 'Maosh' },
] as const;

export type VacancySort = (typeof VACANCY_SORTS)[number]['value'];
