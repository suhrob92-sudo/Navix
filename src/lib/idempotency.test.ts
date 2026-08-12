import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/generated/prisma/client';
import { isDuplicateIdempotencyKey, runIdempotent } from '@/lib/idempotency';

/**
 * Takroriy so'rovlar — pul modullarining eng nozik joyi.
 *
 * Bu sinovlar aynan poyga sinovida topilgan xato uchun: bir vaqtda
 * kelgan ikkita so'rovdan ikkinchisi "Serverda kutilmagan xatolik"
 * qaytarardi va odam pul ketmagan deb o'ylab, qaytadan urinardi.
 */

/** Prisma'ning yagona indeks xatosini yasaydi. */
function duplicateError(target: string | string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

describe('isDuplicateIdempotencyKey', () => {
  it('idempotencyKey takrorlanganini taniydi', () => {
    expect(isDuplicateIdempotencyKey(duplicateError(['idempotencyKey']))).toBe(true);
    expect(isDuplicateIdempotencyKey(duplicateError('wallet_transactions_idempotencyKey_key'))).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * `P2002` — istalgan yagona indeks buzilgani. Ustun tekshirilmasa,
   * buyurtma raqami takrorlangani ham "takroriy so'rov" deb qabul
   * qilinardi va HAQIQIY xato jimgina yashirilardi.
   */
  it('BOSHQA yagona indeks xatosini taniMAYDI', () => {
    expect(isDuplicateIdempotencyKey(duplicateError(['orderNumber']))).toBe(false);
    expect(isDuplicateIdempotencyKey(duplicateError(['phone']))).toBe(false);
  });

  it('boshqa turdagi xatolarni taniMAYDI', () => {
    expect(isDuplicateIdempotencyKey(new Error('oddiy xato'))).toBe(false);
    expect(isDuplicateIdempotencyKey(null)).toBe(false);
    expect(
      isDuplicateIdempotencyKey(
        new Prisma.PrismaClientKnownRequestError('not found', { code: 'P2025', clientVersion: 'test' }),
      ),
    ).toBe(false);
  });
});

describe('runIdempotent', () => {
  it('oddiy holatda amalni bajaradi', async () => {
    const operation = vi.fn().mockResolvedValue('natija');
    const recover = vi.fn();

    await expect(runIdempotent(operation, recover)).resolves.toBe('natija');
    expect(recover).not.toHaveBeenCalled();
  });

  it('takroriy kalitda MAVJUD natijani qaytaradi', async () => {
    const operation = vi.fn().mockRejectedValue(duplicateError(['idempotencyKey']));
    const recover = vi.fn().mockResolvedValue('birinchi natija');

    await expect(runIdempotent(operation, recover)).resolves.toBe('birinchi natija');
    expect(recover).toHaveBeenCalledOnce();
  });

  /**
   * Boshqa xatolar YASHIRILMAYDI.
   *
   * Aks holda "mablag' yetarli emas" yoki "zaxira tugadi" kabi
   * muhim xabarlar yo'qolib, mijoz sababni bilmasdan qolardi.
   */
  it('boshqa xatoni o’tkazib yuboradi', async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Mablag' yetarli emas"));
    const recover = vi.fn();

    await expect(runIdempotent(operation, recover)).rejects.toThrow("Mablag' yetarli emas");
    expect(recover).not.toHaveBeenCalled();
  });

  /**
   * Indeks "bor" dedi, qidiruv esa qayta-qayta "yo'q" — kutilmagan
   * holat. Bunda ham 500 qaytarish noto'g'ri: biz aniq bilamizki,
   * xuddi shu kalit bilan so'rov allaqachon ketmoqda.
   */
  it("natija topilmasa TUSHUNARLI xato beradi (500 emas)", async () => {
    const operation = vi.fn().mockRejectedValue(duplicateError(['idempotencyKey']));
    const recover = vi.fn().mockResolvedValue(null);

    await expect(runIdempotent(operation, recover)).rejects.toThrow('allaqachon bajarilmoqda');

    // Bir marta emas, bir necha marta qidiriladi.
    expect(recover.mock.calls.length).toBeGreaterThan(1);
  });

  /**
   * G'olib so'rovning tranzaksiyasi hali yakunlanmagan bo'lishi
   * mumkin. Bir marta qidirib taslim bo'lish 500 xatoga olib kelardi
   * — aynan shu holat poyga sinovida ko'rindi.
   */
  it('kechikib yakunlangan natijani ham topadi', async () => {
    const operation = vi.fn().mockRejectedValue(duplicateError(['idempotencyKey']));
    const recover = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue('kechikkan natija');

    await expect(runIdempotent(operation, recover)).resolves.toBe('kechikkan natija');
  });
});
