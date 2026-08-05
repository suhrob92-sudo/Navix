import { describe, expect, it } from 'vitest';

import { canTransition as canFoodTransition } from '@/modules/food/food.types';
import { canTransition as canMarketTransition } from '@/modules/market/market.types';
import {
  DELIVERY_ACTION_LABELS,
  DELIVERY_FLOW,
  DELIVERY_STATUS_LABELS,
  DELIVERY_TRANSITIONS,
  MAX_ACTIVE_DELIVERIES,
  canRelease,
  canTransition,
  isActive,
  nextStatus,
  type DeliveryStatusName,
} from '@/modules/courier/courier.types';

const ALL_STATUSES: DeliveryStatusName[] = ['OFFERED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'];

describe('yetkazish holatlari', () => {
  it('har bir holat uchun nom bor', () => {
    for (const status of ALL_STATUSES) {
      expect(DELIVERY_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it('har bir holat uchun jadval qatori bor', () => {
    for (const status of ALL_STATUSES) {
      expect(DELIVERY_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("bosqichni sakrab o'tib bo'lmaydi", () => {
    // Olib chiqmasdan topshirib bo'lmaydi.
    expect(canTransition('ACCEPTED', 'DELIVERED')).toBe(false);
    expect(canTransition('OFFERED', 'PICKED_UP')).toBe(false);
    expect(canTransition('ACCEPTED', 'PICKED_UP')).toBe(true);
  });

  it("yakuniy holatdan hech qayerga chiqib bo'lmaydi", () => {
    expect(DELIVERY_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(DELIVERY_TRANSITIONS.CANCELLED).toHaveLength(0);
    expect(nextStatus('DELIVERED')).toBeNull();
  });

  it('keyingi qadam ketma-ketlikka mos keladi', () => {
    expect(nextStatus('OFFERED')).toBe('ACCEPTED');
    expect(nextStatus('ACCEPTED')).toBe('PICKED_UP');
    expect(nextStatus('PICKED_UP')).toBe('DELIVERED');
  });

  it('ketma-ketlikda bekor qilish yo\'q', () => {
    // `CANCELLED` — chetga chiqish, oddiy bosqich emas.
    expect(DELIVERY_FLOW).not.toContain('CANCELLED');
  });
});

describe('topshiriqdan voz kechish', () => {
  /**
   * Bu qoida boshqa jadvallardan FARQ QILADI va ataylab shunday.
   *
   * Buyurtma orqaga qaytmaydi, topshiriq esa qaytadi: kuryerning
   * mototsikli buzilishi mumkin. Mijoz kutib qolgandan ko'ra
   * topshiriqni boshqa kuryer olgani yaxshiroq.
   */
  it('buyurtma olinmagan bo\'lsa mumkin', () => {
    expect(canRelease('ACCEPTED')).toBe(true);
  });

  it("buyurtma qo'lida bo'lsa mumkin emas", () => {
    // Mahsulot kuryerda — uni javonga qaytarib bo'lmaydi.
    expect(canRelease('PICKED_UP')).toBe(false);
    expect(canRelease('DELIVERED')).toBe(false);
  });
});

describe('amal tugmalari', () => {
  it('har bir holat uchun qator bor', () => {
    for (const status of ALL_STATUSES) {
      expect(DELIVERY_ACTION_LABELS[status]).toBeDefined();
    }
  });

  /**
   * `OFFERED` ataylab bo'sh: umumiy ro'yxatdagi topshiriqni "olish"
   * boshqa amal va u alohida tugma bilan bajariladi.
   */
  it("faqat kuryerning O'Z bosqichlarida yozuv bor", () => {
    expect(DELIVERY_ACTION_LABELS.OFFERED).toBe('');
    expect(DELIVERY_ACTION_LABELS.ACCEPTED).not.toBe('');
    expect(DELIVERY_ACTION_LABELS.PICKED_UP).not.toBe('');
    expect(DELIVERY_ACTION_LABELS.DELIVERED).toBe('');
  });

  it('faol holatlarni to\'g\'ri aniqlaydi', () => {
    expect(isActive('ACCEPTED')).toBe(true);
    expect(isActive('PICKED_UP')).toBe(true);
    expect(isActive('OFFERED')).toBe(false);
    expect(isActive('DELIVERED')).toBe(false);
  });
});

describe('buyurtma bilan bog\'liqlik invarianti', () => {
  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Topshiriq buyurtma "yo'lga chiqarilganda" ochiladi. Agar o'sha
   * holatdan bekor qilishga ruxsat bo'lsa, buyurtma bekor bo'lib
   * topshiriq esa kuryerda qolib ketardi: kuryer yo'lga chiqadi,
   * mijozga esa pul allaqachon qaytarilgan bo'ladi.
   *
   * Hozir bunday bo'lishi MUMKIN EMAS va test buni doimiy
   * qo'riqlaydi — jadvallar o'zgarsa darhol yiqiladi.
   */
  it("topshiriq ochiladigan holatdan bekor qilib bo'lmaydi", () => {
    expect(canFoodTransition('DELIVERING', 'CANCELLED')).toBe(false);
    expect(canMarketTransition('SHIPPED', 'CANCELLED')).toBe(false);
  });
});

describe('bir vaqtdagi topshiriqlar chegarasi', () => {
  it('musbat va mantiqiy', () => {
    // Chegarasiz bo'lsa bitta kuryer butun ro'yxatni band qilardi.
    expect(MAX_ACTIVE_DELIVERIES).toBeGreaterThan(0);
    expect(MAX_ACTIVE_DELIVERIES).toBeLessThanOrEqual(10);
  });
});
