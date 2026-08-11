import { describe, expect, it } from 'vitest';

import { clientErrorSchema, errorLogQuerySchema, resolveErrorSchema } from '@/modules/error-log/error-log.schemas';
import {
  cleanErrorMessage,
  cleanPath,
  ERROR_SOURCE_LABELS,
  formatErrorCount,
  isIgnoredError,
  normalizeMessage,
} from '@/modules/error-log/error-log.types';

describe('cleanPath', () => {
  /**
   * ── Bu testlarning MA'NOSI ──────────────────────────────────────────
   * Manzilda token, telefon raqami yoki qidiruv so'zi bo'lishi mumkin.
   * Ular jurnalga tushsa, jurnalni ko'ra oladigan har bir odam ularni
   * o'qiy olardi.
   */
  it("so'rov parametrlari olib tashlanadi", () => {
    expect(cleanPath('/api/v1/users?token=maxfiy123')).toBe('/api/v1/users');
    expect(cleanPath('/search?q=telefon+raqami')).toBe('/search');
  });

  it('lavha (#) belgisi ham olib tashlanadi', () => {
    expect(cleanPath('/profile#bo-lim')).toBe('/profile');
  });

  it("to'liq manzildan faqat yo'l qismi olinadi", () => {
    // Brauzerdan `window.location.href` kelishi mumkin.
    expect(cleanPath('https://navix.uz/feed?tab=LATEST')).toBe('/feed');
  });

  it("bo'sh manzil bosh sahifaga aylanadi", () => {
    expect(cleanPath('')).toBe('/');
  });
});

describe('normalizeMessage', () => {
  /**
   * ── Bu testlarning MA'NOSI ──────────────────────────────────────────
   * ID'lar qoldirilsa, har bir foydalanuvchi uchun alohida qator
   * yaratilardi va ro'yxat bir kunda ishlatib bo'lmas holga kelardi.
   */
  it("UUID'lar birlashtiriladi", () => {
    const first = normalizeMessage('User 6a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d topilmadi');
    const second = normalizeMessage('User 9f8e7d6c-5b4a-4938-a271-6c5d4e3f2a1b topilmadi');

    expect(first).toBe(second);
  });

  it('uzun sonlar birlashtiriladi', () => {
    expect(normalizeMessage('Buyurtma 123456 topilmadi')).toBe(normalizeMessage('Buyurtma 987654 topilmadi'));
  });

  it('qisqa sonlar SAQLANADI', () => {
    // "404" va "500" — bular ma'noli farq, birlashtirilmasligi kerak.
    expect(normalizeMessage('Xato 404')).not.toBe(normalizeMessage('Xato 500'));
  });
});

describe('isIgnoredError', () => {
  it('tarmoq uzilishi yozilmaydi', () => {
    // Bu bizning xatomiz emas — foydalanuvchining aloqasi uzilgan.
    expect(isIgnoredError('TypeError: Failed to fetch')).toBe(true);
    expect(isIgnoredError('NetworkError when attempting to fetch resource')).toBe(true);
  });

  it("bekor qilingan so'rov yozilmaydi", () => {
    expect(isIgnoredError('AbortError: The operation was aborted')).toBe(true);
  });

  it('haqiqiy xato YOZILADI', () => {
    expect(isIgnoredError("TypeError: Cannot read properties of undefined (reading 'id')")).toBe(false);
    expect(isIgnoredError('PrismaClientKnownRequestError: jadval topilmadi')).toBe(false);
  });
});

describe('formatErrorCount', () => {
  it("kichik sonlar to'liq ko'rinadi", () => {
    expect(formatErrorCount(1)).toBe('1');
    expect(formatErrorCount(999)).toBe('999');
  });

  it('mingdan oshgani qisqartiriladi', () => {
    expect(formatErrorCount(1_000)).toBe('1K');
    expect(formatErrorCount(1_250)).toBe('1.2K');
  });
});

describe('ERROR_SOURCE_LABELS', () => {
  it('ikkala manba ham nomlangan', () => {
    expect(ERROR_SOURCE_LABELS.SERVER).toBe('Server');
    expect(ERROR_SOURCE_LABELS.BROWSER).toBe('Brauzer');
  });
});

describe('clientErrorSchema', () => {
  it('oddiy hisobotni qabul qiladi', () => {
    const result = clientErrorSchema.parse({
      kind: 'TypeError',
      message: 'Cannot read properties of undefined',
      path: '/feed',
    });

    expect(result.kind).toBe('TypeError');
    expect(result.path).toBe('/feed');
  });

  it("bo'sh xabar rad etiladi", () => {
    expect(clientErrorSchema.safeParse({ message: '   ' }).success).toBe(false);
  });

  it('juda uzun xabar rad etiladi', () => {
    // Bu manzil ochiq — cheklovsiz unga istalgancha matn tiqish mumkin bo'lardi.
    expect(clientErrorSchema.safeParse({ message: 'x'.repeat(1_001) }).success).toBe(false);
  });

  it('juda uzun iz rad etiladi', () => {
    expect(clientErrorSchema.safeParse({ message: 'xato', stack: 'x'.repeat(4_001) }).success).toBe(false);
  });
});

describe('errorLogQuerySchema', () => {
  it("sukut bo'yicha faqat yangi xatolar", () => {
    const result = errorLogQuerySchema.parse({});

    expect(result.status).toBe('OPEN');
    expect(result.source).toBe('ALL');
  });

  it('sahifa hajmi cheklangan', () => {
    expect(errorLogQuerySchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });
});

describe('resolveErrorSchema', () => {
  it('holatni qabul qiladi', () => {
    expect(resolveErrorSchema.parse({ isResolved: true }).isResolved).toBe(true);
  });

  it("noto'g'ri tur rad etiladi", () => {
    expect(resolveErrorSchema.safeParse({ isResolved: 'ha' }).success).toBe(false);
  });
});

describe('cleanErrorMessage', () => {
  /**
   * ── Bu testlarning MA'NOSI ──────────────────────────────────────────
   * Prisma xatosi telefon ekranida bir necha ekran to'la shovqin
   * bo'ladi va sabab eng oxirida yoziladi. Tozalanmasa, jurnalni
   * telefondan o'qib bo'lmaydi.
   */
  it('Turbopack modul nomlari olib tashlanadi', () => {
    const raw = 'Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$src__["prisma"].post.findFirst()`';

    expect(cleanErrorMessage(raw)).not.toContain('TURBOPACK');
  });

  it("ichki fayl yo'llari olib tashlanadi", () => {
    const raw = 'Xato /home/user/Navix/.next/dev/server/chunks/abc.js:3540 da';

    expect(cleanErrorMessage(raw)).not.toContain('.next');
  });

  it("yangi qatorlar bitta probelga yig'iladi", () => {
    expect(cleanErrorMessage('birinchi\n\n   ikkinchi')).toBe('birinchi ikkinchi');
  });

  it('uzun matndan OXIRI qoldiriladi', () => {
    // Sabab har doim oxirida yoziladi.
    const raw = `${'x'.repeat(500)} SABAB SHU YERDA`;

    expect(cleanErrorMessage(raw)).toContain('SABAB SHU YERDA');
  });

  it("qisqa matn o'zgarmaydi", () => {
    expect(cleanErrorMessage('Oddiy xato')).toBe('Oddiy xato');
  });
});
