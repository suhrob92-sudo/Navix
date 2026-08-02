import { describe, expect, it } from 'vitest';

import { ErrorCode } from '@/lib/api/errors';
import { apiError, apiSuccess, buildPagination } from '@/lib/api/response';

describe('apiSuccess — muvaffaqiyatli javob', () => {
  it("yagona formatda ma'lumot qaytaradi", async () => {
    const response = apiSuccess({ id: '1' }, { requestId: 'req-1' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: '1' });
    expect(body.meta.requestId).toBe('req-1');
    expect(body.meta.timestamp).toBeTypeOf('string');
  });

  it("berilgan status kodini qo'llaydi", async () => {
    const response = apiSuccess({ ok: true }, { requestId: 'req-2', status: 201 });
    expect(response.status).toBe(201);
  });

  it("sahifalash ma'lumotini meta ichiga qo'shadi", async () => {
    const response = apiSuccess([], {
      requestId: 'req-3',
      pagination: buildPagination(2, 10, 35),
    });
    const body = await response.json();

    expect(body.meta.pagination.page).toBe(2);
    expect(body.meta.pagination.totalPages).toBe(4);
  });
});

describe('apiError — xatolik javobi', () => {
  it('kod, xabar va statusni qaytaradi', async () => {
    const response = apiError({
      requestId: 'req-4',
      code: ErrorCode.NOT_FOUND,
      message: 'Foydalanuvchi topilmadi',
      status: 404,
    });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.error.message).toBe('Foydalanuvchi topilmadi');
  });

  it("maydon xatoliklarini qo'shadi", async () => {
    const response = apiError({
      requestId: 'req-5',
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Xato',
      status: 400,
      details: { phone: ["Telefon raqami noto'g'ri"] },
    });
    const body = await response.json();

    expect(body.error.details.phone).toEqual(["Telefon raqami noto'g'ri"]);
  });
});

describe('buildPagination — sahifalash hisobi', () => {
  it("birinchi sahifada oldingi sahifa bo'lmaydi", () => {
    const pagination = buildPagination(1, 20, 100);

    expect(pagination.hasPrevious).toBe(false);
    expect(pagination.hasNext).toBe(true);
    expect(pagination.totalPages).toBe(5);
  });

  it("oxirgi sahifada keyingi sahifa bo'lmaydi", () => {
    const pagination = buildPagination(5, 20, 100);

    expect(pagination.hasNext).toBe(false);
    expect(pagination.hasPrevious).toBe(true);
  });

  it("natija bo'lmasa sahifalar soni nolga teng", () => {
    const pagination = buildPagination(1, 20, 0);

    expect(pagination.totalPages).toBe(0);
    expect(pagination.hasNext).toBe(false);
  });
});
