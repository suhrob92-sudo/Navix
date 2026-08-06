import { describe, expect, it } from 'vitest';

import { applicationQuerySchema, createApplicationSchema, vacancyQuerySchema } from '@/modules/job/job.schemas';

const VACANCY_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('vacancyQuerySchema', () => {
  it("standart tartib — YANGI e'lonlar", () => {
    // Ish qidiruvchi uchun eskirgan e'lon foydasiz: o'rin allaqachon band.
    expect(vacancyQuerySchema.parse({}).sort).toBe('new');
  });

  it('filtrlarni qabul qiladi', () => {
    const parsed = vacancyQuerySchema.parse({
      search: '  dasturchi ',
      category: 'it',
      city: 'Toshkent',
      employmentType: 'REMOTE',
      experienceLevel: 'JUNIOR',
      sort: 'salary',
    });

    expect(parsed.search).toBe('dasturchi');
    expect(parsed.employmentType).toBe('REMOTE');
    expect(parsed.experienceLevel).toBe('JUNIOR');
    expect(parsed.sort).toBe('salary');
  });

  /**
   * Maosh chegarasi SO'MDA keladi.
   *
   * Manzil satrida tiyin yozish (`minSalarySom=300000000`) foydalanuvchi
   * uchun tushunarsiz bo'lardi va nol sanashda xato qilish oson.
   */
  it("maosh chegarasini so'mda qabul qiladi", () => {
    expect(vacancyQuerySchema.parse({ minSalarySom: '3000000' }).minSalarySom).toBe(3_000_000);
  });

  it('manfiy maosh chegarasini rad etadi', () => {
    expect(vacancyQuerySchema.safeParse({ minSalarySom: '-1' }).success).toBe(false);
  });

  it("noma'lum bandlik turini rad etadi", () => {
    expect(vacancyQuerySchema.safeParse({ employmentType: 'FREELANCE' }).success).toBe(false);
  });

  it("noma'lum tartibni rad etadi", () => {
    expect(vacancyQuerySchema.safeParse({ sort: 'random' }).success).toBe(false);
  });

  it("bo'sh qidiruv so'zini rad etadi", () => {
    expect(vacancyQuerySchema.safeParse({ search: '   ' }).success).toBe(false);
  });
});

describe('createApplicationSchema', () => {
  it('vakansiya bilan arizani qabul qiladi', () => {
    const parsed = createApplicationSchema.parse({ vacancyId: VACANCY_ID });

    expect(parsed.vacancyId).toBe(VACANCY_ID);
    expect(parsed.coverNote).toBeUndefined();
  });

  it('qisqa xat ixtiyoriy va tozalanadi', () => {
    // Ko'p nomzod telefondan yozadi — majburiy uzun matn to'siq bo'lardi.
    const parsed = createApplicationSchema.parse({
      vacancyId: VACANCY_ID,
      coverNote: '  3 yil shu sohada ishlaganman  ',
    });

    expect(parsed.coverNote).toBe('3 yil shu sohada ishlaganman');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Telefon raqami PROFILDAN olinadi, so'rovdan emas. Aks holda
   * nomzod begona odamning raqamini yozib, uni keraksiz
   * qo'ng'iroqlarga ko'mib tashlashi mumkin edi.
   */
  it("telefon raqamini qabul qilmaydi", () => {
    const parsed = createApplicationSchema.parse({ vacancyId: VACANCY_ID, contactPhone: '901234567' });

    expect(parsed).not.toHaveProperty('contactPhone');
  });

  /**
   * Kim yuborayotgani TOKENDAN olinadi.
   *
   * `userId` so'rovda qabul qilinsa, begona odam nomidan ariza
   * yuborish mumkin bo'lardi.
   */
  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    const parsed = createApplicationSchema.parse({ vacancyId: VACANCY_ID, userId: VACANCY_ID });

    expect(parsed).not.toHaveProperty('userId');
  });

  it('ariza holatini qabul qilmaydi', () => {
    // Holatni faqat ish beruvchi o'zgartiradi, nomzod emas.
    const parsed = createApplicationSchema.parse({ vacancyId: VACANCY_ID, status: 'INVITED' });

    expect(parsed).not.toHaveProperty('status');
  });

  it("noto'g'ri vakansiya ID'sini rad etadi", () => {
    expect(createApplicationSchema.safeParse({ vacancyId: 'yoq' }).success).toBe(false);
    expect(createApplicationSchema.safeParse({}).success).toBe(false);
  });

  it('juda uzun xatni rad etadi', () => {
    const result = createApplicationSchema.safeParse({
      vacancyId: VACANCY_ID,
      coverNote: 'a'.repeat(1_001),
    });

    expect(result.success).toBe(false);
  });
});

describe('applicationQuerySchema', () => {
  it('standart filtr — barcha arizalar', () => {
    expect(applicationQuerySchema.parse({}).status).toBe('ALL');
  });

  it("javob kutilayotganlarni alohida so'rashga ruxsat beradi", () => {
    expect(applicationQuerySchema.parse({ status: 'ACTIVE' }).status).toBe('ACTIVE');
  });

  /**
   * Bu yerda ham `userId` yo'q: ro'yxat tokendagi odamniki bo'ladi.
   * Aks holda birov boshqasining arizalarini — ular bilan birga
   * telefon raqamini — o'qib olardi.
   */
  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    const parsed = applicationQuerySchema.parse({ userId: VACANCY_ID });

    expect(parsed).not.toHaveProperty('userId');
  });

  it("noma'lum filtrni rad etadi", () => {
    expect(applicationQuerySchema.safeParse({ status: 'WITHDRAWN' }).success).toBe(false);
  });
});
