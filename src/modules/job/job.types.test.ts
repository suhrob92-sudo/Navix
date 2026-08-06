import { describe, expect, it } from 'vitest';

import { formatTiyin } from '@/lib/money';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_VARIANTS,
  APPLICATION_TRANSITIONS,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  canTransition,
  canWithdraw,
  formatSalary,
  isFinalStatus,
  type ApplicationStatusName,
  type EmploymentTypeName,
  type ExperienceLevelName,
} from '@/modules/job/job.types';

const ALL_STATUSES: ApplicationStatusName[] = ['SENT', 'VIEWED', 'INVITED', 'REJECTED', 'WITHDRAWN'];

const ALL_EMPLOYMENT_TYPES: EmploymentTypeName[] = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'REMOTE',
];

const ALL_EXPERIENCE_LEVELS: ExperienceLevelName[] = ['NONE', 'JUNIOR', 'MIDDLE', 'SENIOR'];

describe('ariza holatlari', () => {
  it('har bir holat uchun nom va rang bor', () => {
    for (const status of ALL_STATUSES) {
      expect(APPLICATION_STATUS_LABELS[status]).toBeTruthy();
      expect(APPLICATION_STATUS_VARIANTS[status]).toBeTruthy();
    }
  });

  it('har bir holat uchun jadval qatori bor', () => {
    for (const status of ALL_STATUSES) {
      expect(APPLICATION_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("yangi ariza har qanday javobni qabul qiladi", () => {
    expect(canTransition('SENT', 'VIEWED')).toBe(true);
    expect(canTransition('SENT', 'INVITED')).toBe(true);
    expect(canTransition('SENT', 'REJECTED')).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Qaror qabul qilingandan keyin uni qaytarib bo'lmaydi. Aks holda
   * ish beruvchi "suhbatga taklif" ni jimgina "rad etildi" ga
   * o'zgartirib qo'yishi mumkin edi va nomzod nima bo'lganini
   * tushunmasdi.
   */
  it("yakuniy holatdan hech qayerga chiqib bo'lmaydi", () => {
    expect(APPLICATION_TRANSITIONS.INVITED).toHaveLength(0);
    expect(APPLICATION_TRANSITIONS.REJECTED).toHaveLength(0);
    expect(APPLICATION_TRANSITIONS.WITHDRAWN).toHaveLength(0);

    expect(isFinalStatus('INVITED')).toBe(true);
    expect(isFinalStatus('REJECTED')).toBe(true);
    expect(isFinalStatus('WITHDRAWN')).toBe(true);
  });

  it("ko'rilgan ariza yana 'yuborildi' ga qaytmaydi", () => {
    // Orqaga qaytish bo'lsa, "javob kutilmoqda" filtri yolg'on gapirardi.
    expect(canTransition('VIEWED', 'SENT')).toBe(false);
  });

  it('faol holatlar yakuniy emas', () => {
    expect(isFinalStatus('SENT')).toBe(false);
    expect(isFinalStatus('VIEWED')).toBe(false);
  });
});

describe('arizani qaytarib olish', () => {
  /**
   * Nomzod javob kelmagunicha fikridan qaytishi mumkin — bu uning
   * o'z ma'lumoti va uni olib qo'yish huquqi bor.
   */
  it('javob kelmagunicha mumkin', () => {
    expect(canWithdraw('SENT')).toBe(true);
    expect(canWithdraw('VIEWED')).toBe(true);
  });

  /**
   * Javob kelgandan keyin esa mumkin emas: ish beruvchi vaqt sarflab
   * qaror qilgan, uni "hech narsa bo'lmagan" holatga qaytarish
   * ikkala tomon uchun ham chalkashlik.
   */
  it('javob kelgandan keyin mumkin emas', () => {
    expect(canWithdraw('INVITED')).toBe(false);
    expect(canWithdraw('REJECTED')).toBe(false);
    expect(canWithdraw('WITHDRAWN')).toBe(false);
  });
});

describe('maoshni yozish', () => {
  it("oraliq — ikkala chegara ham bor", () => {
    const text = formatSalary(300_000_000, 500_000_000, formatTiyin);

    expect(text).toContain('3');
    expect(text).toContain('–');
    expect(text.endsWith("so'm")).toBe(true);
  });

  it("faqat quyi chegara — 'dan' qo'shiladi", () => {
    expect(formatSalary(300_000_000, null, formatTiyin).endsWith('dan')).toBe(true);
  });

  it("faqat yuqori chegara — 'gacha' qo'shiladi", () => {
    expect(formatSalary(null, 500_000_000, formatTiyin).endsWith('gacha')).toBe(true);
  });

  /**
   * ENG MUHIM HOLAT.
   *
   * Maosh ko'rsatilmagan bo'lsa NOL yozilmasligi kerak: "0 so'm"
   * degan yozuv "bepul ishlang" degan ma'no berardi.
   */
  it("maosh yo'q bo'lsa 'Kelishilgan' yoziladi", () => {
    const text = formatSalary(null, null, formatTiyin);

    expect(text).toBe('Kelishilgan');
    expect(text).not.toContain('0');
  });

  it('ikkala chegara teng bo\'lsa oraliq ko\'rsatilmaydi', () => {
    // "3 000 000 – 3 000 000" — ma'nosiz takror.
    const text = formatSalary(300_000_000, 300_000_000, formatTiyin);

    expect(text).not.toContain('–');
    expect(text).toBe(formatTiyin(300_000_000));
  });

  it("nol maosh yozilishi mumkin, chunki u 'yo'q' emas", () => {
    // `null` bilan `0` boshqa-boshqa narsa: 0 — bu ataylab yozilgan raqam.
    expect(formatSalary(0, null, formatTiyin)).not.toBe('Kelishilgan');
  });
});

describe("ko'rinadigan nomlar", () => {
  it('har bir bandlik turi uchun nom bor', () => {
    for (const type of ALL_EMPLOYMENT_TYPES) {
      expect(EMPLOYMENT_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it('har bir tajriba darajasi uchun nom bor', () => {
    for (const level of ALL_EXPERIENCE_LEVELS) {
      expect(EXPERIENCE_LEVEL_LABELS[level]).toBeTruthy();
    }
  });
});
