import { describe, expect, it } from 'vitest';

import { PROTECTED_PREFIXES, protectedPathPatterns } from '@/config/protected-routes';

describe('himoyalangan sahifalar', () => {
  it("har bir manzil '/' bilan boshlanadi", () => {
    // Boshida "/" bo'lmasa `startsWith` ham, `headers()` ham ishlamaydi.
    for (const prefix of PROTECTED_PREFIXES) {
      expect(prefix.startsWith('/')).toBe(true);
    }
  });

  it("manzil oxirida '/' bo'lmaydi", () => {
    // "/wallet/" bo'lsa "/wallet" manzili qamrab olinmasdi.
    for (const prefix of PROTECTED_PREFIXES) {
      expect(prefix.endsWith('/')).toBe(false);
    }
  });

  it('takrorlanish yo\'q', () => {
    expect(new Set(PROTECTED_PREFIXES).size).toBe(PROTECTED_PREFIXES.length);
  });

  it('asosiy bo\'limlar ro\'yxatda bor', () => {
    // Ro'yxatdan tushib qolgan bo'lim IKKI xatoga olib keladi: u ochiq
    // qoladi va HTML'i keshlanib, eskirib qoladi.
    for (const required of ['/dashboard', '/wallet', '/marketplace', '/seller', '/courier', '/admin']) {
      expect(PROTECTED_PREFIXES).toContain(required);
    }
  });
});

describe('next.config uchun naqshlar', () => {
  /**
   * Har bir bo'lim IKKI naqsh beradi.
   *
   * Next.js `headers()` da "/wallet" naqshi FAQAT o'sha manzilga
   * tegishli — "/wallet/history" unga kirmaydi. Shuning uchun
   * ichki sahifalar uchun ":path*" alohida qo'shiladi.
   */
  it('har bir bo\'lim uchun ikkita naqsh yasaydi', () => {
    const patterns = protectedPathPatterns();

    expect(patterns).toHaveLength(PROTECTED_PREFIXES.length * 2);
    expect(patterns).toContain('/wallet');
    expect(patterns).toContain('/wallet/:path*');
  });

  it('barcha naqshlar to\'g\'ri ko\'rinishda', () => {
    for (const pattern of protectedPathPatterns()) {
      expect(pattern.startsWith('/')).toBe(true);
      expect(pattern).not.toContain('//');
    }
  });
});
