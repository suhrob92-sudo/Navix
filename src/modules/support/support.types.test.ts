import { describe, expect, it } from 'vitest';

import { createTicketSchema, replyTicketSchema, updateTicketStatusSchema } from '@/modules/support/support.schemas';
import {
  MAX_OPEN_TICKETS,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_VARIANTS,
  isTicketClosed,
} from '@/modules/support/support.types';

describe('murojaat holatlari', () => {
  it('yakunlangan holatlar aniqlanadi', () => {
    expect(isTicketClosed('RESOLVED')).toBe(true);
    expect(isTicketClosed('CLOSED')).toBe(true);
  });

  it('faol holatlar yakunlangan emas', () => {
    expect(isTicketClosed('OPEN')).toBe(false);
    expect(isTicketClosed('ANSWERED')).toBe(false);
  });

  it("har bir holatda nom va rang bor", () => {
    for (const status of ['OPEN', 'ANSWERED', 'RESOLVED', 'CLOSED'] as const) {
      expect(SUPPORT_STATUS_LABELS[status].trim().length).toBeGreaterThan(0);
      expect(SUPPORT_STATUS_VARIANTS[status]).toBeDefined();
    }
  });

  it("har bir turda nom va izoh bor", () => {
    for (const category of SUPPORT_CATEGORIES) {
      expect(category.label.trim().length).toBeGreaterThan(0);
      expect(category.hint.trim().length).toBeGreaterThan(5);
      expect(SUPPORT_CATEGORY_LABELS[category.value]).toBe(category.label);
    }
  });

  it("tur ro'yxati va nomlar jadvali BIR XIL", () => {
    /**
     * Ikkalasi bir joydan quriladi, lekin ular ajralib ketsa formada
     * bir tur ko'rinib, ro'yxatda boshqasi yozilardi.
     */
    expect(SUPPORT_CATEGORIES.map((item) => item.value).sort()).toEqual(
      Object.keys(SUPPORT_CATEGORY_LABELS).sort(),
    );
  });

  it('ochiq murojaat chegarasi mavjud', () => {
    expect(MAX_OPEN_TICKETS).toBeGreaterThan(0);
    expect(MAX_OPEN_TICKETS).toBeLessThan(10);
  });
});

describe('yangi murojaat sxemasi', () => {
  const valid = {
    subject: 'Buyurtma yetkazilmadi',
    category: 'ORDER' as const,
    message: 'Kecha buyurtma berdim, lekin hali kelmadi.',
  };

  it("to'g'ri ma'lumot qabul qilinadi", () => {
    expect(createTicketSchema.safeParse(valid).success).toBe(true);
  });

  it('juda qisqa mavzu rad etiladi', () => {
    expect(createTicketSchema.safeParse({ ...valid, subject: 'Yo' }).success).toBe(false);
  });

  it('juda qisqa xabar rad etiladi', () => {
    /**
     * "Ishlamayapti" degan bir so'zli murojaatga javob berib
     * bo'lmaydi — xodim baribir qayta so'raydi.
     */
    expect(createTicketSchema.safeParse({ ...valid, message: 'yordam' }).success).toBe(false);
  });

  it("noma'lum tur rad etiladi", () => {
    expect(createTicketSchema.safeParse({ ...valid, category: 'TAXI' }).success).toBe(false);
  });

  it("bo'shliqlar olib tashlanadi", () => {
    const parsed = createTicketSchema.parse({ ...valid, subject: '   Buyurtma kelmadi   ' });

    expect(parsed.subject).toBe('Buyurtma kelmadi');
  });

  it('juda uzun xabar rad etiladi', () => {
    expect(createTicketSchema.safeParse({ ...valid, message: 'a'.repeat(2_001) }).success).toBe(false);
  });
});

describe('javob sxemasi', () => {
  it("bo'sh xabar rad etiladi", () => {
    expect(replyTicketSchema.safeParse({ message: '   ' }).success).toBe(false);
  });

  it('bitta belgi ham yetarli', () => {
    // Javobda "ha" yoki "rahmat" deyish mumkin — bu yerda pastki
    // chegara yo'q, chunki suhbat allaqachon boshlangan.
    expect(replyTicketSchema.safeParse({ message: 'ha' }).success).toBe(true);
  });
});

describe('yakunlash sxemasi', () => {
  it('faqat yakuniy holatlar qabul qilinadi', () => {
    expect(updateTicketStatusSchema.safeParse({ status: 'RESOLVED' }).success).toBe(true);
    expect(updateTicketStatusSchema.safeParse({ status: 'CLOSED' }).success).toBe(true);
  });

  it("`OPEN` va `ANSWERED` ni QO'LDA qo'yib bo'lmaydi", () => {
    /**
     * Bu holatlar xabar yozilganda O'ZI qo'yiladi. Qo'lda qo'yishga
     * ruxsat berilsa, xodim javob yozmasdan "javob berildi" deb
     * belgilab qo'yishi mumkin edi.
     */
    expect(updateTicketStatusSchema.safeParse({ status: 'OPEN' }).success).toBe(false);
    expect(updateTicketStatusSchema.safeParse({ status: 'ANSWERED' }).success).toBe(false);
  });
});
