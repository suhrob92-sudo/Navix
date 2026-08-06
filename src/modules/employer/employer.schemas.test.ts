import { describe, expect, it } from 'vitest';

import {
  createVacancySchema,
  decideApplicationSchema,
  employerApplicationQuerySchema,
  employerVacancyQuerySchema,
  updateVacancySchema,
} from '@/modules/employer/employer.schemas';

const ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';

const VALID = {
  companyId: ID,
  categoryId: OTHER_ID,
  title: 'Sotuvchi-konsultant',
  description: "Do'konda mijozlarga xizmat ko'rsatasiz va kassada ishlaysiz.",
  city: 'Toshkent',
};

describe('createVacancySchema', () => {
  it("to'g'ri e'lonni qabul qiladi", () => {
    const parsed = createVacancySchema.parse(VALID);

    expect(parsed.title).toBe('Sotuvchi-konsultant');
    expect(parsed.employmentType).toBe('FULL_TIME');
    expect(parsed.experienceLevel).toBe('NONE');
  });

  /**
   * ENG MUHIM TEKSHIRUV — 1.
   *
   * Maoshsiz e'lon TO'LIQ QONUNIY. Ko'p kompaniya raqamni yozmaydi
   * va uni majburiy qilish ularni yolg'on raqam yozishga majbur
   * qilardi. E'londa u "Kelishilgan" bo'lib chiqadi.
   */
  it("maoshsiz e'lonni qabul qiladi", () => {
    const parsed = createVacancySchema.parse(VALID);

    expect(parsed.salaryMinSom).toBeUndefined();
    expect(parsed.salaryMaxSom).toBeUndefined();
  });

  it("maosh oralig'ini qabul qiladi", () => {
    const parsed = createVacancySchema.parse({ ...VALID, salaryMinSom: 3_000_000, salaryMaxSom: 5_000_000 });

    expect(parsed.salaryMinSom).toBe(3_000_000);
    expect(parsed.salaryMaxSom).toBe(5_000_000);
  });

  /**
   * ENG MUHIM TEKSHIRUV — 2.
   *
   * `min > max` bo'lsa e'lon ma'nosini yo'qotadi va ro'yxatda ham
   * noto'g'ri saralanadi.
   */
  it("teskari oraliqni rad etadi", () => {
    const result = createVacancySchema.safeParse({ ...VALID, salaryMinSom: 9_000_000, salaryMaxSom: 3_000_000 });

    expect(result.success).toBe(false);
  });

  it('teng chegaralarni qabul qiladi', () => {
    // "Aniq 5 mln" — to'g'ri holat, rad etilmasligi kerak.
    const parsed = createVacancySchema.parse({ ...VALID, salaryMinSom: 5_000_000, salaryMaxSom: 5_000_000 });

    expect(parsed.salaryMinSom).toBe(parsed.salaryMaxSom);
  });

  it("juda kichik maoshni rad etadi", () => {
    // 50 000 so'm — deyarli har doim xato kiritish (kunlik haq).
    expect(createVacancySchema.safeParse({ ...VALID, salaryMinSom: 50_000 }).success).toBe(false);
  });

  it('juda katta maoshni rad etadi', () => {
    // Odatda tiyinni so'm deb yozib yuborilgan bo'ladi.
    expect(createVacancySchema.safeParse({ ...VALID, salaryMinSom: 900_000_000 }).success).toBe(false);
  });

  it("kasr maoshni rad etadi", () => {
    expect(createVacancySchema.safeParse({ ...VALID, salaryMinSom: 3_000_000.5 }).success).toBe(false);
  });

  /**
   * ENG MUHIM TEKSHIRUV — 3.
   *
   * Bo'sh tavsifli e'lon nomzod uchun foydasiz: u nima ish
   * qilishini bilmasdan ariza yuboradi va ikkala tomon ham vaqtini
   * behuda sarflaydi.
   */
  it('qisqa tavsifni rad etadi', () => {
    expect(createVacancySchema.safeParse({ ...VALID, description: 'Ish bor' }).success).toBe(false);
  });

  it('qisqa lavozim nomini rad etadi', () => {
    expect(createVacancySchema.safeParse({ ...VALID, title: 'Ha' }).success).toBe(false);
  });

  it("shahar bo'sh bo'lsa rad etadi", () => {
    expect(createVacancySchema.safeParse({ ...VALID, city: ' ' }).success).toBe(false);
  });

  it("noto'g'ri bandlik turini rad etadi", () => {
    expect(createVacancySchema.safeParse({ ...VALID, employmentType: 'FREELANCE' }).success).toBe(false);
  });

  /**
   * Egalik SO'ROVDAN kelmaydi.
   *
   * `ownerId` qabul qilinsa, begona kompaniya nomidan e'lon joylash
   * mumkin bo'lardi. Kompaniya egaligi serverda tekshiriladi.
   */
  it("egasini qabul qilmaydi", () => {
    const parsed = createVacancySchema.parse({ ...VALID, ownerId: ID });

    expect(parsed).not.toHaveProperty('ownerId');
  });

  it("e'lon holatini qabul qilmaydi", () => {
    // Yangi e'lon har doim ochiq bo'ladi — buni mijoz hal qilmaydi.
    const parsed = createVacancySchema.parse({ ...VALID, isActive: false });

    expect(parsed).not.toHaveProperty('isActive');
  });
});

describe('updateVacancySchema', () => {
  it("bo'sh so'rovni qabul qiladi", () => {
    // Hech narsa o'zgarmasa ham xato emas.
    expect(updateVacancySchema.safeParse({}).success).toBe(true);
  });

  it("e'lonni yopishga ruxsat beradi", () => {
    expect(updateVacancySchema.parse({ isActive: false }).isActive).toBe(false);
  });

  /**
   * `null` va `undefined` BOSHQA-BOSHQA narsa.
   *
   * `null` — "maoshni olib tashla, Kelishilgan bo'lsin";
   * `undefined` — "maoshga tegilmasin".
   */
  it("maoshni null bilan olib tashlashga ruxsat beradi", () => {
    const parsed = updateVacancySchema.parse({ salaryMinSom: null, salaryMaxSom: null });

    expect(parsed.salaryMinSom).toBeNull();
    expect(parsed.salaryMaxSom).toBeNull();
  });

  it('teskari oraliqni bu yerda ham rad etadi', () => {
    const result = updateVacancySchema.safeParse({ salaryMinSom: 9_000_000, salaryMaxSom: 3_000_000 });

    expect(result.success).toBe(false);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * E'lonni boshqa kompaniyaga ko'chirib bo'lmaydi — aks holda uni
   * begona kompaniyaga "sovg'a qilib" yuborish yo'li ochilardi.
   */
  it("kompaniyani almashtirishga yo'l qo'ymaydi", () => {
    const parsed = updateVacancySchema.parse({ companyId: ID });

    expect(parsed).not.toHaveProperty('companyId');
  });

  it('ariza sonini qabul qilmaydi', () => {
    const parsed = updateVacancySchema.parse({ applicationCount: 999 });

    expect(parsed).not.toHaveProperty('applicationCount');
  });
});

describe('decideApplicationSchema', () => {
  it('uchta qarorni qabul qiladi', () => {
    expect(decideApplicationSchema.parse({ status: 'VIEWED' }).status).toBe('VIEWED');
    expect(decideApplicationSchema.parse({ status: 'INVITED' }).status).toBe('INVITED');
    expect(decideApplicationSchema.parse({ status: 'REJECTED' }).status).toBe('REJECTED');
  });

  it('izohni qabul qiladi va tozalaydi', () => {
    const parsed = decideApplicationSchema.parse({ status: 'INVITED', note: '  Ertaga soat 10 da  ' });

    expect(parsed.note).toBe('Ertaga soat 10 da');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Arizani faqat NOMZODNING O'ZI qaytarib oladi. Ish beruvchiga bu
   * imkon berilsa, u noqulay nomzodni "o'zi qaytarib olgan" qilib
   * ko'rsatib qo'yishi mumkin bo'lardi.
   */
  it("WITHDRAWN holatini rad etadi", () => {
    expect(decideApplicationSchema.safeParse({ status: 'WITHDRAWN' }).success).toBe(false);
  });

  it("SENT holatiga qaytarishni rad etadi", () => {
    // Orqaga qaytish yo'q: "yangi" belgisi qayta tiklanmaydi.
    expect(decideApplicationSchema.safeParse({ status: 'SENT' }).success).toBe(false);
  });

  it('juda uzun izohni rad etadi', () => {
    expect(decideApplicationSchema.safeParse({ status: 'INVITED', note: 'a'.repeat(501) }).success).toBe(false);
  });

  it("holatsiz so'rovni rad etadi", () => {
    expect(decideApplicationSchema.safeParse({ note: 'salom' }).success).toBe(false);
  });
});

describe('employerVacancyQuerySchema', () => {
  it("standart filtr — BARCHA e'lonlar", () => {
    // Ish beruvchi yopiq e'lonlarini ham ko'ra olishi kerak.
    expect(employerVacancyQuerySchema.parse({}).status).toBe('ALL');
  });

  it('kompaniya bo\'yicha filtrlashga ruxsat beradi', () => {
    expect(employerVacancyQuerySchema.parse({ companyId: ID }).companyId).toBe(ID);
  });

  it("egasini qabul qilmaydi", () => {
    const parsed = employerVacancyQuerySchema.parse({ ownerId: ID });

    expect(parsed).not.toHaveProperty('ownerId');
  });
});

describe('employerApplicationQuerySchema', () => {
  it('standart filtr — JAVOB KUTAYOTGANLAR', () => {
    // Kabinetga kirgan odamning birinchi savoli: "kimga javob berishim kerak?"
    expect(employerApplicationQuerySchema.parse({}).status).toBe('PENDING');
  });

  it("e'lon bo'yicha filtrlashga ruxsat beradi", () => {
    expect(employerApplicationQuerySchema.parse({ vacancyId: ID }).vacancyId).toBe(ID);
  });

  it("WITHDRAWN filtrini rad etadi", () => {
    // Qaytarib olingan arizalar ish beruvchi ro'yxatida alohida
    // bo'lim sifatida ko'rsatilmaydi.
    expect(employerApplicationQuerySchema.safeParse({ status: 'WITHDRAWN' }).success).toBe(false);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * `userId` so'rovda qabul qilinsa, ish beruvchi platformadagi
   * istalgan odamning arizalarini — telefon raqami bilan birga —
   * so'rab olardi.
   */
  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    const parsed = employerApplicationQuerySchema.parse({ userId: ID });

    expect(parsed).not.toHaveProperty('userId');
  });
});
