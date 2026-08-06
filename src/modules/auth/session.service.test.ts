import { describe, expect, it } from 'vitest';

import { classifyRefreshToken, detectDeviceLabel } from '@/modules/auth/session.service';

describe('detectDeviceLabel — qurilma nomini aniqlash', () => {
  it('iPhone Safari', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    expect(detectDeviceLabel(userAgent)).toBe('Safari / iPhone');
  });

  it('Android Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

    expect(detectDeviceLabel(userAgent)).toBe('Chrome / Android');
  });

  it('Windows Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    expect(detectDeviceLabel(userAgent)).toBe('Chrome / Windows');
  });

  it("Edge brauzeri Chrome deb noto'g'ri aniqlanmaydi", () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

    expect(detectDeviceLabel(userAgent)).toBe('Edge / Windows');
  });

  it('macOS Firefox', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0';

    expect(detectDeviceLabel(userAgent)).toBe('Firefox / macOS');
  });

  it("User-Agent bo'lmasa umumiy nom qaytaradi", () => {
    expect(detectDeviceLabel(null)).toBe("Noma'lum qurilma");
    expect(detectDeviceLabel(undefined)).toBe("Noma'lum qurilma");
    expect(detectDeviceLabel('')).toBe("Noma'lum qurilma");
  });
});

describe('classifyRefreshToken — token qanday qabul qilinadi', () => {
  const NOW = new Date('2026-08-06T12:00:30.000Z');
  /** 5 soniya oldin almashtirilgan — muhlat ichida. */
  const JUST_ROTATED = new Date('2026-08-06T12:00:25.000Z');
  /** 5 daqiqa oldin almashtirilgan — muhlat allaqachon o'tgan. */
  const LONG_AGO = new Date('2026-08-06T11:55:30.000Z');

  const state = {
    currentHash: 'hozirgi',
    previousHash: 'oldingi',
    rotatedAt: JUST_ROTATED,
  };

  it('joriy token — oddiy almashtirish', () => {
    expect(classifyRefreshToken('hozirgi', state, NOW)).toBe('current');
  });

  /**
   * ENG MUHIM TEKSHIRUV — 1.
   *
   * Refresh token cookie'da va u barcha varaqlar uchun bitta. Ikkita
   * varaq bir vaqtda yangilashni boshlasa, ikkinchisi eski token
   * bilan keladi. Bu o'g'irlik emas — foydalanuvchi hech narsa
   * qilmagan.
   */
  it("bir necha soniya oldingi token — o'g'irlik emas", () => {
    expect(classifyRefreshToken('oldingi', state, NOW)).toBe('grace');
  });

  /**
   * ENG MUHIM TEKSHIRUV — 2.
   *
   * Himoya YO'QOLMASLIGI kerak: muhlat o'tgach eski token qabul
   * qilinmaydi va sessiya yopiladi.
   */
  it("muhlat o'tgan eski token — sessiya yopiladi", () => {
    expect(classifyRefreshToken('oldingi', { ...state, rotatedAt: LONG_AGO }, NOW)).toBe('unknown');
  });

  it('muhlat chegarasi: 30 soniya ichida qabul qilinadi', () => {
    const rotatedAt = new Date(NOW.getTime() - 29_000);

    expect(classifyRefreshToken('oldingi', { ...state, rotatedAt }, NOW)).toBe('grace');
  });

  it('muhlat chegarasi: 31 soniyada rad etiladi', () => {
    const rotatedAt = new Date(NOW.getTime() - 31_000);

    expect(classifyRefreshToken('oldingi', { ...state, rotatedAt }, NOW)).toBe('unknown');
  });

  it('butunlay notanish token — sessiya yopiladi', () => {
    expect(classifyRefreshToken('begona', state, NOW)).toBe('unknown');
  });

  it("oldingi token yo'q bo'lsa faqat joriysi qabul qilinadi", () => {
    const fresh = { currentHash: 'hozirgi', previousHash: null, rotatedAt: null };

    expect(classifyRefreshToken('hozirgi', fresh, NOW)).toBe('current');
    expect(classifyRefreshToken('oldingi', fresh, NOW)).toBe('unknown');
  });

  it("almashtirish vaqti yozilmagan bo'lsa muhlat berilmaydi", () => {
    // Vaqtsiz muhlatni sanab bo'lmaydi — ishonchsiz holatda rad etamiz.
    const broken = { currentHash: 'hozirgi', previousHash: 'oldingi', rotatedAt: null };

    expect(classifyRefreshToken('oldingi', broken, NOW)).toBe('unknown');
  });

  it('soat orqaga surilgan bo\'lsa ham rad etiladi', () => {
    // Kelajakdagi vaqt — ishonchsiz. Muhlat cho'zilib ketmasligi kerak.
    const future = { ...state, rotatedAt: new Date(NOW.getTime() + 60_000) };

    expect(classifyRefreshToken('oldingi', future, NOW)).toBe('unknown');
  });

  it("bo'sh satr joriy hash bilan adashtirilmaydi", () => {
    const empty = { currentHash: '', previousHash: null, rotatedAt: null };

    // Bu holat bo'lmasligi kerak, lekin bo'lsa ham hech narsa o'tmaydi.
    expect(classifyRefreshToken('begona', empty, NOW)).toBe('unknown');
  });
});
