import { describe, expect, it } from 'vitest';

import { canTransition, type ApplicationStatusName } from '@/modules/job/job.types';
import {
  EMPLOYER_APPLICATION_FILTERS,
  EMPLOYER_DECISIONS,
  candidateName,
} from '@/modules/employer/employer.types';

describe('ish beruvchining qarorlari', () => {
  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Ish beruvchi qo'ya oladigan har bir holat ariza jadvalida ham
   * ruxsat etilgan bo'lishi SHART. Aks holda tugma ekranda turadi-yu,
   * bosilganda server rad etadi.
   */
  it("har bir qaror yangi arizada ruxsat etilgan", () => {
    for (const decision of EMPLOYER_DECISIONS) {
      expect(canTransition('SENT', decision.value)).toBe(true);
    }
  });

  it("ko'rilgan arizada 'ko'rib chiqilmoqda' takrorlanmaydi", () => {
    // VIEWED dan yana VIEWED ga o'tish ma'nosiz — jadval ham ruxsat bermaydi.
    expect(canTransition('VIEWED', 'VIEWED')).toBe(false);
  });

  it("ko'rilgan arizada yakuniy qarorlar ochiq", () => {
    expect(canTransition('VIEWED', 'INVITED')).toBe(true);
    expect(canTransition('VIEWED', 'REJECTED')).toBe(true);
  });

  /**
   * `WITHDRAWN` ro'yxatda BO'LMASLIGI kerak: arizani faqat
   * nomzodning o'zi qaytarib oladi.
   */
  it("qaytarib olish ish beruvchida yo'q", () => {
    const values = EMPLOYER_DECISIONS.map((item) => item.value as string);

    expect(values).not.toContain('WITHDRAWN');
    expect(values).not.toContain('SENT');
  });

  it('har bir qarorda tushunarli nom bor', () => {
    for (const decision of EMPLOYER_DECISIONS) {
      expect(decision.label.length).toBeGreaterThan(3);
    }
  });

  it("yakuniy qarordan keyin hech narsa o'zgartirib bo'lmaydi", () => {
    const finals: ApplicationStatusName[] = ['INVITED', 'REJECTED', 'WITHDRAWN'];

    for (const from of finals) {
      for (const decision of EMPLOYER_DECISIONS) {
        expect(canTransition(from, decision.value)).toBe(false);
      }
    }
  });
});

describe('ariza filtrlari', () => {
  it("standart filtr ro'yxatda birinchi", () => {
    // Kabinet aynan shu filtr bilan ochiladi.
    expect(EMPLOYER_APPLICATION_FILTERS[0].value).toBe('PENDING');
  });

  it("qaytarib olinganlar uchun alohida bo'lim yo'q", () => {
    const values = EMPLOYER_APPLICATION_FILTERS.map((item) => item.value as string);

    expect(values).not.toContain('WITHDRAWN');
  });
});

describe('candidateName — nomzodning ismi', () => {
  it("ism va familiyani birlashtiradi", () => {
    expect(candidateName({ firstName: 'Ali', lastName: 'Valiyev', phone: '+998901234567' })).toBe('Ali Valiyev');
  });

  it("familiya bo'lmasa faqat ismni beradi", () => {
    expect(candidateName({ firstName: 'Ali', lastName: null, phone: '+998901234567' })).toBe('Ali');
  });

  /**
   * Ism umuman bo'lmasligi mumkin — ro'yxatdan o'tishda u
   * majburiy, lekin eski yozuvlarda bo'sh qolishi ehtimoli bor.
   * Bunda ekranda bo'sh joy emas, "Nomzod" ko'rinadi.
   */
  it("ism bo'lmasa ham bo'sh satr qaytarmaydi", () => {
    expect(candidateName({ firstName: null, lastName: null, phone: '+998901234567' })).toBe('Nomzod');
  });
});
