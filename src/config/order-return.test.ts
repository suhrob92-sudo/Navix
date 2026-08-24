import { describe, expect, it } from 'vitest';

import {
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
  RETURN_WINDOW_DAYS,
  calculateRefund,
  checkReturnEligibility,
  daysLeftInWindow,
  isSellerFault,
  refundsDeliveryFee,
} from '@/config/order-return';

/**
 * Qaytarish qoidalari — testlar.
 *
 * Bu yerdagi har bir hisob PUL bilan bog'liq, shuning uchun
 * chegaradagi holatlar alohida tekshiriladi.
 */

const DAY = 86_400_000;

describe('ayb kimda', () => {
  it('mahsulot nuqsonlari — SOTUVCHIDA', () => {
    expect(isSellerFault('DAMAGED')).toBe(true);
    expect(isSellerFault('WRONG_ITEM')).toBe(true);
    expect(isSellerFault('NOT_AS_DESCRIBED')).toBe(true);
  });

  it('fikrdan qaytish — XARIDORDA', () => {
    expect(isSellerFault('CHANGED_MIND')).toBe(false);
  });

  it('"boshqa sabab" sotuvchining aybi DEB HISOBLANMAYDI', () => {
    /**
     * Noaniq sabab uchun yetkazish haqini sotuvchidan olish
     * adolatsiz bo'lardi: nima bo'lganini hech kim bilmaydi.
     */
    expect(isSellerFault('OTHER')).toBe(false);
  });
});

describe('muddat', () => {
  const delivered = new Date('2026-08-01T10:00:00Z').toISOString();

  it('yetkazilgan kuni to\'liq muddat bor', () => {
    const now = new Date('2026-08-01T10:00:00Z');

    expect(daysLeftInWindow(delivered, now)).toBe(RETURN_WINDOW_DAYS);
  });

  it('kunlar sanab boradi', () => {
    const now = new Date('2026-08-08T10:00:00Z');

    expect(daysLeftInWindow(delivered, now)).toBe(7);
  });

  it('muddatning OXIRGI daqiqasida hali mumkin', () => {
    /**
     * Chegara nozik: bir daqiqa oldin "mumkin", bir daqiqa keyin
     * "kech". Ikkalasi ham tekshiriladi.
     */
    const now = new Date(new Date(delivered).getTime() + RETURN_WINDOW_DAYS * DAY - 60_000);

    expect(daysLeftInWindow(delivered, now)).toBe(1);
  });

  it('muddat tugagach NOL', () => {
    const now = new Date(new Date(delivered).getTime() + RETURN_WINDOW_DAYS * DAY);

    expect(daysLeftInWindow(delivered, now)).toBe(0);
  });

  it('yaroqsiz sana NOL beradi', () => {
    // Xato sana tufayli muddat "cheksiz" bo'lib qolmasligi kerak.
    expect(daysLeftInWindow('salom')).toBe(0);
  });
});

describe('so\'rov yuborish mumkinmi', () => {
  const delivered = new Date('2026-08-01T10:00:00Z').toISOString();
  const now = new Date('2026-08-05T10:00:00Z');

  it('yetkazilgan buyurtma uchun MUMKIN', () => {
    const result = checkReturnEligibility(
      { status: 'DELIVERED', deliveredAt: delivered, hasReturnRequest: false },
      now,
    );

    expect(result.canRequest).toBe(true);
    expect(result.daysLeft).toBe(10);
  });

  it('YETKAZILMAGAN buyurtma uchun mumkin emas', () => {
    /**
     * Hali kelmagan narsani qaytarib bo'lmaydi. Bunday buyurtmani
     * BEKOR qilish kerak — bu boshqa amal.
     */
    const result = checkReturnEligibility(
      { status: 'SHIPPED', deliveredAt: null, hasReturnRequest: false },
      now,
    );

    expect(result.canRequest).toBe(false);
    expect(result.reason).toBe('NOT_DELIVERED');
  });

  it('MUDDAT o\'tgach mumkin emas', () => {
    const late = new Date('2026-09-01T10:00:00Z');

    const result = checkReturnEligibility(
      { status: 'DELIVERED', deliveredAt: delivered, hasReturnRequest: false },
      late,
    );

    expect(result.canRequest).toBe(false);
    expect(result.reason).toBe('WINDOW_CLOSED');
  });

  it('IKKINCHI so\'rov yuborib bo\'lmaydi', () => {
    /**
     * Aks holda ikkita so'rov bir xil mahsulotni qamrab olishi va
     * pul IKKI MARTA qaytishi mumkin edi.
     */
    const result = checkReturnEligibility(
      { status: 'DELIVERED', deliveredAt: delivered, hasReturnRequest: true },
      now,
    );

    expect(result.canRequest).toBe(false);
    expect(result.reason).toBe('ALREADY_REQUESTED');
  });

  it('allaqachon so\'ralgan bo\'lsa MUDDAT tekshirilmaydi ham', () => {
    // Birinchi sabab eng aniqrog'i bo'lishi kerak.
    const late = new Date('2026-09-01T10:00:00Z');

    expect(
      checkReturnEligibility(
        { status: 'DELIVERED', deliveredAt: delivered, hasReturnRequest: true },
        late,
      ).reason,
    ).toBe('ALREADY_REQUESTED');
  });
});

describe('qaytariladigan summa', () => {
  const lines = [
    { unitPrice: 100_000, quantity: 2 },
    { unitPrice: 50_000, quantity: 1 },
  ];

  const deliveryFee = 25_000;

  it('mahsulotlar narxi qo\'shiladi', () => {
    expect(
      calculateRefund(lines, { deliveryFee, reason: 'CHANGED_MIND', isFullReturn: false }),
    ).toBe(250_000);
  });

  it('SOTUVCHI aybi + TO\'LIQ qaytarish — yetkazish ham qaytadi', () => {
    expect(
      calculateRefund(lines, { deliveryFee, reason: 'DAMAGED', isFullReturn: true }),
    ).toBe(275_000);
  });

  it('sotuvchi aybi, lekin QISMAN — yetkazish qaytmaydi', () => {
    /**
     * Bitta mahsulot qaytsa, qolganlari baribir yetkazilgan va
     * kuryer ishini bajargan.
     */
    expect(
      calculateRefund(lines, { deliveryFee, reason: 'DAMAGED', isFullReturn: false }),
    ).toBe(250_000);
  });

  it('to\'liq qaytarish, lekin XARIDOR fikridan qaytgan — yetkazish qaytmaydi', () => {
    expect(
      calculateRefund(lines, { deliveryFee, reason: 'CHANGED_MIND', isFullReturn: true }),
    ).toBe(250_000);
  });

  it('bo\'sh ro\'yxatda faqat yetkazish hisoblanadi', () => {
    // Bunday holat bo'lmasligi kerak, lekin hisob buzilmasligi shart.
    expect(calculateRefund([], { deliveryFee, reason: 'DAMAGED', isFullReturn: true })).toBe(25_000);
  });

  it('ekrandagi va\'da hisob bilan MOS keladi', () => {
    /**
     * Xaridor "Yuborish" dan oldin yetkazish qaytishini ko'radi.
     * Ikki joyda ikki xil qoida bo'lsa, u aldangandek his qilardi.
     */
    for (const reason of RETURN_REASONS.map((option) => option.value)) {
      for (const isFullReturn of [true, false]) {
        const promised = refundsDeliveryFee(reason, isFullReturn);
        const actual =
          calculateRefund(lines, { deliveryFee, reason, isFullReturn }) > 250_000;

        expect(actual).toBe(promised);
      }
    }
  });
});

describe('ro\'yxatlar', () => {
  it('sabablar takrorlanmaydi', () => {
    const values = RETURN_REASONS.map((option) => option.value);

    expect(new Set(values).size).toBe(values.length);
  });

  it('har bir holatning nomi bor', () => {
    for (const status of ['PENDING', 'APPROVED', 'REJECTED'] as const) {
      expect(RETURN_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});
