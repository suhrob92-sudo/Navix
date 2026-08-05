import { describe, expect, it } from 'vitest';

import { deliveryQuerySchema, updateDeliveryStatusSchema } from '@/modules/courier/courier.schemas';

describe('deliveryQuerySchema', () => {
  it("standart filtr — kuryerning QO'LIDAGI topshiriqlari", () => {
    // Kuryer kabinetga "hozir nima qilishim kerak" degan savol bilan kiradi.
    expect(deliveryQuerySchema.parse({}).status).toBe('ACTIVE');
  });

  it('umumiy ro\'yxatni so\'rashga ruxsat beradi', () => {
    expect(deliveryQuerySchema.parse({ status: 'AVAILABLE' }).status).toBe('AVAILABLE');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * So'rovda KURYER ID'si bo'lmasligi kerak. Aks holda bitta kuryer
   * boshqasining topshiriqlarini — ular bilan birga mijozlarning
   * manzil va telefonlarini — so'rab olardi.
   */
  it("kuryer ID'sini qabul qilmaydi", () => {
    const parsed = deliveryQuerySchema.parse({ courierId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' });

    expect(parsed).not.toHaveProperty('courierId');
  });

  it("noto'g'ri filtrni rad etadi", () => {
    expect(deliveryQuerySchema.safeParse({ status: 'PICKED_UP' }).success).toBe(false);
  });
});

describe('updateDeliveryStatusSchema', () => {
  it('bosqichlarni qabul qiladi', () => {
    expect(updateDeliveryStatusSchema.parse({ status: 'PICKED_UP' }).status).toBe('PICKED_UP');
    expect(updateDeliveryStatusSchema.parse({ status: 'DELIVERED' }).status).toBe('DELIVERED');
  });

  it("voz kechishga ruxsat beradi", () => {
    const parsed = updateDeliveryStatusSchema.parse({ status: 'OFFERED', reason: 'mototsikl buzildi' });

    expect(parsed.status).toBe('OFFERED');
    expect(parsed.reason).toBe('mototsikl buzildi');
  });

  /**
   * Topshiriqni OLISH bu yerda yo'q — u alohida endpoint.
   *
   * Sababi: bu raqobatli amal va yutqazgan kuryer "boshqa kuryer
   * oldi" degan aniq javob olishi kerak. Umumiy `PATCH` orqali
   * bunday javob berib bo'lmasdi.
   */
  it("ACCEPTED holatini qabul qilmaydi", () => {
    expect(updateDeliveryStatusSchema.safeParse({ status: 'ACCEPTED' }).success).toBe(false);
  });

  it("bekor qilishni qabul qilmaydi", () => {
    // Yetkazishni kuryer emas, buyurtmaning o'zi bekor qiladi.
    expect(updateDeliveryStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(false);
  });

  it('qisqa sababni rad etadi', () => {
    expect(updateDeliveryStatusSchema.safeParse({ status: 'OFFERED', reason: 'yo' }).success).toBe(false);
  });

  it("haq summasini qabul qilmaydi", () => {
    // Haq bazadagi topshiriqdan olinadi — mijozdan hech qachon emas.
    const parsed = updateDeliveryStatusSchema.parse({ status: 'DELIVERED', fee: 999_999 });

    expect(parsed).not.toHaveProperty('fee');
  });
});
