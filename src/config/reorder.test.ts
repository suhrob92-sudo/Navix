import { describe, expect, it } from 'vitest';

import { describeReorder, planReorder, type ReorderMenuItem, type ReorderSource } from '@/config/reorder';

/**
 * "Buyurtmani takrorlash" — testlar.
 *
 * Bu yerdagi xato odamni kassada kutilmagan summa bilan qoldiradi,
 * shuning uchun har bir chekinish alohida tekshiriladi.
 */

const MENU: ReorderMenuItem[] = [
  { id: 'lagmon', name: "Lag'mon", price: 45_000_00, isAvailable: true },
  { id: 'somsa', name: 'Somsa', price: 12_000_00, isAvailable: true },
  { id: 'shashlik', name: 'Shashlik', price: 30_000_00, isAvailable: false },
];

const ORDER: ReorderSource[] = [
  { menuItemId: 'lagmon', name: "Lag'mon", quantity: 2, unitPrice: 45_000_00 },
  { menuItemId: 'somsa', name: 'Somsa', quantity: 3, unitPrice: 12_000_00 },
];

describe('reja', () => {
  it('hamma taom joyida bo\'lsa hammasi qo\'shiladi', () => {
    const plan = planReorder(ORDER, MENU);

    expect(plan.lines).toEqual([
      { menuItemId: 'lagmon', quantity: 2 },
      { menuItemId: 'somsa', quantity: 3 },
    ]);
    expect(plan.missing).toEqual([]);
  });

  it('SONI saqlanadi', () => {
    // Uchta somsa buyurtma qilingan edi — uchtaligicha qoladi.
    const plan = planReorder(ORDER, MENU);

    expect(plan.lines.find((line) => line.menuItemId === 'somsa')?.quantity).toBe(3);
  });

  it('menyudan O\'CHIRILGAN taom qo\'shilmaydi', () => {
    const withDeleted: ReorderSource[] = [
      ...ORDER,
      { menuItemId: null, name: 'Eski taom', quantity: 1, unitPrice: 20_000_00 },
    ];

    const plan = planReorder(withDeleted, MENU);

    expect(plan.lines).toHaveLength(2);
    expect(plan.missing).toEqual(['Eski taom']);
  });

  it('menyuda YO\'Q taom qo\'shilmaydi', () => {
    /**
     * Taom ID'si bor, lekin bugungi menyuda topilmadi — restoran
     * uni o'chirgan.
     */
    const plan = planReorder(
      [{ menuItemId: 'yoq', name: 'Manti', quantity: 1, unitPrice: 25_000_00 }],
      MENU,
    );

    expect(plan.lines).toEqual([]);
    expect(plan.missing).toEqual(['Manti']);
  });

  it('bugun TUGAGAN taom qo\'shilmaydi', () => {
    const plan = planReorder(
      [{ menuItemId: 'shashlik', name: 'Shashlik', quantity: 1, unitPrice: 30_000_00 }],
      MENU,
    );

    expect(plan.lines).toEqual([]);
    expect(plan.missing).toEqual(['Shashlik']);
  });

  it('o\'chirilgan taomning nomi ESKI buyurtmadan olinadi', () => {
    // Bugungi menyuda uning nomi umuman yo'q.
    const plan = planReorder(
      [{ menuItemId: null, name: 'Norin', quantity: 1, unitPrice: 30_000_00 }],
      MENU,
    );

    expect(plan.missing).toEqual(['Norin']);
  });
});

describe('narx o\'zgarishi', () => {
  it('o\'zgargan narx BELGILANADI', () => {
    const plan = planReorder(
      [{ menuItemId: 'lagmon', name: "Lag'mon", quantity: 1, unitPrice: 40_000_00 }],
      MENU,
    );

    expect(plan.priceChanges).toEqual([
      { name: "Lag'mon", oldPrice: 40_000_00, newPrice: 45_000_00 },
    ]);
  });

  it('narx TUSHGAN bo\'lsa ham aytiladi', () => {
    // Odam kutilmagan summani ko'rmasligi kerak — yo'nalish ahamiyatsiz.
    const plan = planReorder(
      [{ menuItemId: 'somsa', name: 'Somsa', quantity: 1, unitPrice: 15_000_00 }],
      MENU,
    );

    expect(plan.priceChanges).toHaveLength(1);
  });

  it('narx o\'zgarmagan bo\'lsa jim', () => {
    expect(planReorder(ORDER, MENU).priceChanges).toEqual([]);
  });

  it('qo\'shilmagan taomning narxi tekshirilmaydi', () => {
    const plan = planReorder(
      [{ menuItemId: 'shashlik', name: 'Shashlik', quantity: 1, unitPrice: 1 }],
      MENU,
    );

    expect(plan.priceChanges).toEqual([]);
  });
});

describe('ogohlantirish matni', () => {
  it('hammasi joyida bo\'lsa matn YO\'Q', () => {
    expect(describeReorder(planReorder(ORDER, MENU))).toEqual([]);
  });

  it('bitta taom yo\'q bo\'lsa NOMI aytiladi', () => {
    const plan = planReorder(
      [{ menuItemId: null, name: 'Norin', quantity: 1, unitPrice: 1 }],
      MENU,
    );

    expect(describeReorder(plan)[0]).toContain('Norin');
  });

  it('ko\'p taom yo\'q bo\'lsa SONI ham aytiladi', () => {
    const plan = planReorder(
      [
        { menuItemId: null, name: 'Norin', quantity: 1, unitPrice: 1 },
        { menuItemId: null, name: 'Manti', quantity: 1, unitPrice: 1 },
      ],
      MENU,
    );

    expect(describeReorder(plan)[0]).toContain('2 ta taom');
  });

  it('narx o\'zgarishi ham aytiladi', () => {
    const plan = planReorder(
      [{ menuItemId: 'lagmon', name: "Lag'mon", quantity: 1, unitPrice: 1 }],
      MENU,
    );

    expect(describeReorder(plan).some((note) => note.includes('narxi'))).toBe(true);
  });
});
