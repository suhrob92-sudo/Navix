import type { ServiceColor } from '@/config/modules';
import type {
  ApplicationStatusName,
  EmploymentTypeName,
  ExperienceLevelName,
} from '@/modules/job/job.types';

/**
 * Ish beruvchi kabineti — brauzer tomonidagi turlar.
 *
 * ── Nomzod tomonidagi turlardan FARQI ─────────────────────────────────
 * `job.types.ts` da nomzod ko'radigan ma'lumot bor: e'lon, maosh,
 * kompaniya. Bu yerda esa ish beruvchi ko'radigani: nechta ariza
 * keldi, nomzodning ismi va TELEFON RAQAMI.
 *
 * Ikkalasi ataylab ajratilgan. Bitta turga birlashtirilsa, nomzod
 * uchun mo'ljallangan endpoint bexosdan telefon raqamini ham
 * qaytarib yuborishi mumkin bo'lardi.
 */

export interface EmployerCompany {
  id: string;
  slug: string;
  name: string;
  /** Kompaniya haqida — nomzod e'londa shuni o'qiydi. */
  description: string;
  industry: string;
  city: string;
  color: ServiceColor;
  isActive: boolean;
  /** Ochiq (faol) vakansiyalar soni. */
  activeVacancies: number;
  /** Javob kutayotgan arizalar — kabinetdagi asosiy raqam. */
  pendingApplications: number;
}

export interface EmployerStats {
  companies: number;
  activeVacancies: number;
  /** Hali ko'rilmagan arizalar (SENT). */
  newApplications: number;
  /** Javob berilmagan arizalar (SENT + VIEWED). */
  pendingApplications: number;
}

export interface EmployerVacancy {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Maoshlar TIYINDA. `null` — kelishilgan. */
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: EmploymentTypeName;
  experienceLevel: ExperienceLevelName;
  city: string;
  isActive: boolean;
  createdAt: string;
  company: { id: string; name: string; color: ServiceColor };
  category: { id: string; slug: string; name: string };
  applicationCount: number;
  /** Javob kutayotgan arizalar — qaysi e'lon e'tibor talab qilyapti. */
  pendingCount: number;
}

/**
 * Nomzod — FAQAT ish beruvchi ko'radi.
 *
 * Telefon raqami arizadan olinadi (`contactPhone`), profildan emas:
 * nomzod keyinchalik raqamini o'zgartirsa ham, ish beruvchi ariza
 * kelgan paytdagi raqamga qo'ng'iroq qiladi.
 */
export interface EmployerCandidate {
  firstName: string | null;
  lastName: string | null;
  phone: string;
}

export interface EmployerApplication {
  id: string;
  status: ApplicationStatusName;
  coverNote: string | null;
  employerNote: string | null;
  createdAt: string;
  viewedAt: string | null;
  decidedAt: string | null;
  candidate: EmployerCandidate;
  vacancy: {
    id: string;
    slug: string;
    title: string;
    city: string;
    company: { id: string; name: string; color: ServiceColor };
  };
}

export interface EmployerCategoryOption {
  id: string;
  slug: string;
  name: string;
}

// ── Javob turlari ─────────────────────────────────────────────────────

export interface EmployerOverviewResponse {
  companies: EmployerCompany[];
  stats: EmployerStats;
}

export interface EmployerVacanciesResponse {
  vacancies: EmployerVacancy[];
  total: number;
  categories: EmployerCategoryOption[];
}

export interface EmployerVacancyResponse {
  vacancy: EmployerVacancy;
}

export interface EmployerApplicationsResponse {
  applications: EmployerApplication[];
  total: number;
}

export interface EmployerApplicationResponse {
  application: EmployerApplication;
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

/**
 * Ish beruvchi qo'ya oladigan holatlar.
 *
 * `WITHDRAWN` bu yerda YO'Q — arizani faqat nomzodning o'zi qaytarib
 * oladi. Ish beruvchiga bu tugma berilsa, u noqulay nomzodni
 * "o'zi qaytarib olgan" qilib ko'rsatib qo'yishi mumkin bo'lardi.
 */
export const EMPLOYER_DECISIONS = [
  { value: 'VIEWED', label: "Ko'rib chiqilmoqda" },
  { value: 'INVITED', label: 'Suhbatga taklif' },
  { value: 'REJECTED', label: 'Rad etish' },
] as const;

export type EmployerDecision = (typeof EMPLOYER_DECISIONS)[number]['value'];

/** Kabinetdagi ariza filtrlari. */
export const EMPLOYER_APPLICATION_FILTERS = [
  { value: 'PENDING', label: 'Javob kutmoqda' },
  { value: 'SENT', label: 'Yangi' },
  { value: 'INVITED', label: 'Taklif qilingan' },
  { value: 'REJECTED', label: 'Rad etilgan' },
  { value: 'ALL', label: 'Barchasi' },
] as const;

export type EmployerApplicationFilter = (typeof EMPLOYER_APPLICATION_FILTERS)[number]['value'];

/** Nomzodning to'liq ismi — familiya bo'lmasligi mumkin. */
export function candidateName(candidate: EmployerCandidate): string {
  const parts = [candidate.firstName, candidate.lastName].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : 'Nomzod';
}
