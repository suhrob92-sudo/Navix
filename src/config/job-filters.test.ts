import { describe, expect, it } from 'vitest';

import {
  EMPLOYMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  SALARY_STEPS,
  activeJobFilterCount,
  clearJobFilter,
  describeJobFilters,
  emptyJobFilters,
  jobFiltersToParams,
  paramsToJobFilters,
  salaryRangeError,
  type JobFilters,
} from '@/config/job-filters';

/**
 * Vakansiya filtrlari — testlar.
 */

const som = (value: number) => `${value}`;

describe("bo'sh holat", () => {
  it('hech narsa tanlanmagan', () => {
    expect(activeJobFilterCount(emptyJobFilters())).toBe(0);
    expect(describeJobFilters(emptyJobFilters(), som)).toEqual([]);
  });

  it('saralash SANALMAYDI', () => {
    expect(activeJobFilterCount({ sort: 'salary' })).toBe(0);
  });

  it("qidiruv so'zi ham sanalmaydi", () => {
    /**
     * Qidiruv maydoni ko'z oldida turadi — odam nima
     * yozganini ko'rib turibdi. Uni "yashirin filtr" deb
     * sanash tugmada yolg'on son berardi.
     */
    expect(activeJobFilterCount({ sort: 'new', search: 'dasturchi' })).toBe(0);
  });
});

describe('sanash', () => {
  it('har bir filtr bittadan', () => {
    const filters: JobFilters = {
      sort: 'new',
      city: 'Toshkent',
      experienceLevel: 'JUNIOR',
      minSalarySom: 5_000_000,
    };

    expect(activeJobFilterCount(filters)).toBe(3);
  });

  it("o'zgarmas maydon sanalmaydi", () => {
    // Kompaniya sahifasida kompaniya manzil yo'lida turadi.
    const filters: JobFilters = { sort: 'new', company: 'navix', city: 'Toshkent' };

    expect(activeJobFilterCount(filters, ['company'])).toBe(1);
  });
});

describe('manzil satri', () => {
  it("to'liq filtr yozilib, qaytib o'qiladi", () => {
    const filters: JobFilters = {
      sort: 'salary',
      search: 'dasturchi',
      category: 'it',
      company: 'navix',
      city: 'Toshkent',
      employmentType: 'REMOTE',
      experienceLevel: 'MIDDLE',
      minSalarySom: 5_000_000,
      maxSalarySom: 20_000_000,
    };

    expect(paramsToJobFilters(jobFiltersToParams(filters))).toEqual(filters);
  });

  it("bo'sh qiymatlar YOZILMAYDI", () => {
    expect(jobFiltersToParams(emptyJobFilters()).toString()).toBe('sort=new');
  });

  it('yaroqsiz maosh jimgina TASHLANADI', () => {
    const filters = paramsToJobFilters(new URLSearchParams('minSalarySom=salom&maxSalarySom=-5'));

    expect(filters.minSalarySom).toBeUndefined();
    expect(filters.maxSalarySom).toBeUndefined();
  });

  it("ro'yxatda YO'Q bandlik turi qabul qilinmaydi", () => {
    /**
     * Manzilni qo'lda yozish mumkin. Noma'lum qiymat serverga
     * tushib, xato qaytarardi va sahifa bo'sh qolardi.
     */
    expect(paramsToJobFilters(new URLSearchParams('employmentType=HACK')).employmentType).toBeUndefined();
    expect(paramsToJobFilters(new URLSearchParams('employmentType=REMOTE')).employmentType).toBe('REMOTE');
  });

  it("noma'lum saralash standartga qaytadi", () => {
    expect(paramsToJobFilters(new URLSearchParams('sort=hack')).sort).toBe('new');
  });

  it('juda katta maosh qabul qilinmaydi', () => {
    expect(paramsToJobFilters(new URLSearchParams('minSalarySom=99999999999')).minSalarySom).toBeUndefined();
  });
});

describe("maosh oralig'i", () => {
  it("to'g'ri oraliqda xato yo'q", () => {
    expect(salaryRangeError({ sort: 'new', minSalarySom: 3_000_000, maxSalarySom: 9_000_000 })).toBeNull();
  });

  it('teskari oraliq AYTILADI', () => {
    // Serverga yuborilsa, bo'sh ro'yxat qaytardi va sababi ko'rinmasdi.
    expect(salaryRangeError({ sort: 'new', minSalarySom: 9_000_000, maxSalarySom: 3_000_000 })).not.toBeNull();
  });

  it('bittasi bo\'lsa xato yo\'q', () => {
    expect(salaryRangeError({ sort: 'new', minSalarySom: 9_000_000 })).toBeNull();
  });
});

describe('yorliqlar', () => {
  it("maosh yo'nalishi bilan aytiladi", () => {
    const chips = describeJobFilters({ sort: 'new', minSalarySom: 5, maxSalarySom: 9 }, som);

    expect(chips.map((chip) => chip.label)).toEqual(['5 dan', '9 gacha']);
  });

  it('bandlik turi ODAM tilida', () => {
    // "REMOTE" emas, "Masofaviy".
    const chips = describeJobFilters({ sort: 'new', employmentType: 'REMOTE' }, som);

    expect(chips[0].label).toBe('Masofaviy');
  });

  it("o'zgarmas maydon yorliq bermaydi", () => {
    const chips = describeJobFilters({ sort: 'new', company: 'navix' }, som, ['company']);

    expect(chips).toEqual([]);
  });
});

describe("o'chirish", () => {
  it('bitta filtr o\'chadi', () => {
    const next = clearJobFilter({ sort: 'new', city: 'Toshkent', minSalarySom: 5 }, 'minSalarySom');

    expect(next.minSalarySom).toBeUndefined();
    expect(next.city).toBe('Toshkent');
  });

  it('saralash TEGILMAYDI', () => {
    expect(clearJobFilter({ sort: 'salary', city: 'Xiva' }, 'city').sort).toBe('salary');
  });
});

describe("tayyor maosh tugmalari", () => {
  it("o'sish tartibida", () => {
    const sorted = [...SALARY_STEPS].sort((a, b) => a - b);

    expect(SALARY_STEPS).toEqual(sorted);
  });

  it('takrorlanmaydi', () => {
    expect(new Set(SALARY_STEPS).size).toBe(SALARY_STEPS.length);
  });

  it('juda ko\'p emas', () => {
    // Ko'p tugma tanlashni osonlashtirmaydi.
    expect(SALARY_STEPS.length).toBeLessThanOrEqual(6);
  });
});

describe("ro'yxatlar", () => {
  it('bandlik turlari takrorlanmaydi', () => {
    expect(new Set(EMPLOYMENT_OPTIONS.map((o) => o.value)).size).toBe(EMPLOYMENT_OPTIONS.length);
  });

  it('tajriba darajalari takrorlanmaydi', () => {
    expect(new Set(EXPERIENCE_OPTIONS.map((o) => o.value)).size).toBe(EXPERIENCE_OPTIONS.length);
  });
});
