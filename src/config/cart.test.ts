import { describe, expect, it } from 'vitest';

import {
  MAX_CART_LINES,
  MAX_QUANTITY_PER_LINE,
  REMINDER_AFTER_HOURS,
  REMINDER_BEFORE_HOURS,
  cartLineKey,
  clampQuantity,
  isReminderDue,
  mergeCartLines,
  reminderSubject,
  totalQuantity,
} from '@/config/cart';

/**
 * Savat qoidalari — testlar.
 */

describe('savat qatorining kaliti', () => {
  it('variantsiz mahsulotda faqat mahsulot nomeri', () => {
    /**
     * Eski savatlar ham shu ko'rinishda saqlangan — kalit
     * o'zgarsa, ular yo'qolardi.
     */
    expect(cartLineKey('p1')).toBe('p1');
    expect(cartLineKey('p1', null)).toBe('p1');
  });

  it('HAR BIR variant alohida qator', () => {
    /**
     * Bir xil mahsulotning qora va oq rangi savatda ikki alohida
     * qator bo'lishi kerak. Aks holda ikkinchi rang birinchisining
     * sonini oshirib yuborardi.
     */
    expect(cartLineKey('p1', 'qora')).not.toBe(cartLineKey('p1', 'oq'));
    expect(cartLineKey('p1', 'qora')).not.toBe(cartLineKey('p1'));
  });
});

describe('miqdorni chegaraga keltirish', () => {
  it("noldan kichik miqdor BITTAGA aylanadi", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
  });

  it("eng ko'p chegarasi ushlab turiladi", () => {
    expect(clampQuantity(1_000)).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("kasr son butunlanadi", () => {
    expect(clampQuantity(2.7)).toBe(2);
  });

  it("son bo'lmagan qiymat BITTAGA aylanadi", () => {
    // Manzil yoki eski savatdan har qanday qiymat kelishi mumkin.
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe('savatlarni birlashtirish', () => {
  it("serverda yo'q qator QO'SHILADI", () => {
    const merged = mergeCartLines(
      [{ productId: 'a', variantId: null, quantity: 1 }],
      [{ productId: 'b', variantId: null, quantity: 2 }],
    );

    expect(merged).toHaveLength(2);
  });

  it('ENG KATTA son olinadi, yig\'indi EMAS', () => {
    /**
     * Yig'indi xavfli: birlashtirish ikki marta ishlab ketsa
     * (so'rov qaytarilsa), miqdor har safar ikki barobar oshardi.
     *
     * "Eng kattasi" esa necha marta takrorlansa ham bir xil
     * natija beradi.
     */
    const merged = mergeCartLines(
      [{ productId: 'a', variantId: null, quantity: 3 }],
      [{ productId: 'a', variantId: null, quantity: 2 }],
    );

    expect(merged).toEqual([{ productId: 'a', variantId: null, quantity: 3 }]);
  });

  it('IKKI MARTA birlashtirish natijani o\'zgartirmaydi', () => {
    const server = [{ productId: 'a', variantId: null, quantity: 3 }];
    const local = [{ productId: 'a', variantId: null, quantity: 5 }];

    const once = mergeCartLines(server, local);
    const twice = mergeCartLines(once, local);

    expect(twice).toEqual(once);
  });

  it('variantlar ALOHIDA qator bo\'lib qoladi', () => {
    const merged = mergeCartLines(
      [{ productId: 'a', variantId: 'qora', quantity: 1 }],
      [{ productId: 'a', variantId: 'oq', quantity: 1 }],
    );

    expect(merged).toHaveLength(2);
  });

  it("qatorlar soni CHEGARADAN oshmaydi", () => {
    const local = Array.from({ length: MAX_CART_LINES + 10 }, (_, index) => ({
      productId: `p${index}`,
      variantId: null,
      quantity: 1,
    }));

    expect(mergeCartLines([], local)).toHaveLength(MAX_CART_LINES);
  });

  it('birlashtirishda miqdor CHEGARAGA keltiriladi', () => {
    const merged = mergeCartLines([], [{ productId: 'a', variantId: null, quantity: 5_000 }]);

    expect(merged[0].quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("kirish ro'yxatlari O'ZGARMAYDI", () => {
    const server = [{ productId: 'a', variantId: null, quantity: 3 }];

    mergeCartLines(server, [{ productId: 'a', variantId: null, quantity: 9 }]);

    expect(server[0].quantity).toBe(3);
  });
});

describe('jami dona soni', () => {
  it("bo'sh savatda nol", () => {
    expect(totalQuantity([])).toBe(0);
  });

  it('barcha qatorlar qo\'shiladi', () => {
    expect(
      totalQuantity([
        { productId: 'a', variantId: null, quantity: 2 },
        { productId: 'b', variantId: null, quantity: 3 },
      ]),
    ).toBe(5);
  });
});

describe('eslatma vaqti', () => {
  it("juda ERTA eslatilmaydi", () => {
    /**
     * Bir necha soatdan keyin eslatish bezorilik: odam hali
     * o'ylayotgan yoki shunchaki ishda bo'lishi mumkin.
     */
    expect(isReminderDue(1)).toBe(false);
    expect(isReminderDue(REMINDER_AFTER_HOURS - 1)).toBe(false);
  });

  it('bir kundan keyin eslatiladi', () => {
    expect(isReminderDue(REMINDER_AFTER_HOURS)).toBe(true);
    expect(isReminderDue(48)).toBe(true);
  });

  it("juda ESKI savat haqida eslatilmaydi", () => {
    /**
     * Ikki hafta oldingi savat haqida eslatish foydasiz va faqat
     * asabga tegadi — odam bildirishnomalarni butunlay o'chirib
     * qo'yadi.
     */
    expect(isReminderDue(REMINDER_BEFORE_HOURS + 1)).toBe(false);
    expect(isReminderDue(24 * 30)).toBe(false);
  });
});

describe('eslatma matni', () => {
  it('bitta mahsulotda faqat nomi', () => {
    expect(reminderSubject('Redmi Note 14', 0)).toBe('Redmi Note 14');
  });

  it("ko'p mahsulotda qolganlari SANALADI", () => {
    /**
     * Hamma nomni sanash telefon ekranida kesilib qolardi va
     * hech narsa tushunarli bo'lmasdi.
     */
    expect(reminderSubject('Redmi Note 14', 2)).toBe('Redmi Note 14 va yana 2 ta mahsulot');
  });
});
