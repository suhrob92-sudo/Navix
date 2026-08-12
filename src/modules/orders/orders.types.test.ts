import { describe, expect, it } from 'vitest';

import { ordersQuerySchema } from '@/modules/orders/orders.schemas';
import { emptyOrdersText, ORDER_FILTERS, ORDER_KIND_META, type OrderKind } from '@/modules/orders/orders.types';

const KINDS: OrderKind[] = ['FOOD', 'MARKET', 'HOTEL', 'TRAVEL', 'PARCEL'];

describe('ORDER_KIND_META', () => {
  it('har bir tur uchun nom va rang bor', () => {
    for (const kind of KINDS) {
      expect(ORDER_KIND_META[kind].label.length, kind).toBeGreaterThan(0);
      expect(ORDER_KIND_META[kind].color.length, kind).toBeGreaterThan(0);
    }
  });

  it('nomlar takrorlanmaydi', () => {
    const labels = KINDS.map((kind) => ORDER_KIND_META[kind].label);

    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('ORDER_FILTERS', () => {
  it('qiymatlar takrorlanmaydi', () => {
    const values = ORDER_FILTERS.map((item) => item.value);

    expect(new Set(values).size).toBe(values.length);
  });
});

describe('emptyOrdersText', () => {
  it('tur tanlanganda uning nomi aytiladi', () => {
    expect(emptyOrdersText('ALL', 'HOTEL')).toContain('Mehmonxona');
  });

  /**
   * Matn filtrga qarab O'ZGARADI.
   *
   * Bitta umumiy "buyurtma yo'q" yozuvi chalkash bo'lardi: odam
   * "Faol" ni tanlab, "hali buyurtma bermagansiz" degan yozuvni
   * o'qib, buyurtmalari yo'qolgan deb o'ylardi.
   */
  it("filtr bo'yicha boshqacha matn", () => {
    const all = emptyOrdersText('ALL', 'ALL');
    const active = emptyOrdersText('ACTIVE', 'ALL');
    const finished = emptyOrdersText('FINISHED', 'ALL');

    expect(new Set([all, active, finished]).size).toBe(3);
    expect(active).toContain('faol');
  });
});

describe('ordersQuerySchema', () => {
  it('standart qiymatlar', () => {
    const parsed = ordersQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.filter).toBe('ALL');
    expect(parsed.kind).toBe('ALL');
  });

  it('sahifa raqamini o’giradi', () => {
    expect(ordersQuerySchema.parse({ page: '3' }).page).toBe(3);
  });

  /**
   * Ro'yxat BESHTA manbadan yig'iladi va har biridan
   * `sahifa × o'lcham` tadan olinadi. Chegarasiz sahifa raqami
   * beshta jadvaldan minglab yozuv so'rash yo'li bo'lardi.
   */
  it("juda katta sahifani rad etadi", () => {
    expect(ordersQuerySchema.safeParse({ page: 1000 }).success).toBe(false);
    expect(ordersQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it("o'lchamni mijoz tanlay olmaydi", () => {
    expect(ordersQuerySchema.parse({ pageSize: 500 })).not.toHaveProperty('pageSize');
  });

  it("noma'lum turni rad etadi", () => {
    expect(ordersQuerySchema.safeParse({ kind: 'TAXI' }).success).toBe(false);
    expect(ordersQuerySchema.safeParse({ kind: 'FOOD' }).success).toBe(true);
  });

  it("boshqa odamning ID sini qabul qilmaydi", () => {
    // Kimning buyurtmasi ekani TOKENDAN olinadi, so'rovdan emas.
    expect(ordersQuerySchema.parse({ userId: 'x' })).not.toHaveProperty('userId');
  });
});
