import { describe, expect, it } from 'vitest';

import {
  buildSnippet,
  cleanSearchQuery,
  isSearchableQuery,
  MAX_THREAD_MESSAGES,
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  SEARCH_PAGE_SIZE,
  searchResultText,
  SNIPPET_LENGTH,
  splitHighlight,
} from '@/config/message-search';

/**
 * Xabarlar qidiruvi — testlar.
 */

describe('chegaralar', () => {
  it("eng qisqa so'z ikki belgi", () => {
    /**
     * Bitta harf bo'yicha qidiruv deyarli har bir xabarni topadi va
     * eng og'ir so'rov bo'ladi.
     */
    expect(SEARCH_MIN_LENGTH).toBe(2);
  });

  it("uzunlik chegarasi qisqadan katta", () => {
    expect(SEARCH_MAX_LENGTH).toBeGreaterThan(SEARCH_MIN_LENGTH);
  });

  it('parcha xabardan qisqa', () => {
    // Xabar 4000 belgigacha bo'lishi mumkin.
    expect(SNIPPET_LENGTH).toBeLessThan(4_000);
  });

  it('sahifa hajmi mantiqiy', () => {
    expect(SEARCH_PAGE_SIZE).toBeGreaterThan(0);
    expect(SEARCH_PAGE_SIZE).toBeLessThanOrEqual(50);
  });

  it('suhbat oynasi chegarasi yagona manbada', () => {
    expect(MAX_THREAD_MESSAGES).toBe(100);
  });
});

describe('qidiruv so\'zini tozalash', () => {
  it("atrofdagi bo'shliqni kesadi", () => {
    expect(cleanSearchQuery('  salom  ')).toBe('salom');
  });

  it("ichkaridagi ortiqcha bo'shliqni bittaga tushiradi", () => {
    expect(cleanSearchQuery('salom   dunyo')).toBe('salom dunyo');
  });

  it('juda uzun matnni kesadi', () => {
    expect(cleanSearchQuery('a'.repeat(500))).toHaveLength(SEARCH_MAX_LENGTH);
  });

  it("qidirilishi mumkinligini aniqlaydi", () => {
    expect(isSearchableQuery('a')).toBe(false);
    expect(isSearchableQuery('  a  ')).toBe(false);
    expect(isSearchableQuery('sa')).toBe(true);
    expect(isSearchableQuery('')).toBe(false);
  });
});

describe('parcha olish', () => {
  it("qisqa xabar TO'LIQ qaytadi", () => {
    const result = buildSnippet('Salom dunyo', 'dunyo');

    expect(result.text).toBe('Salom dunyo');
    expect(result.matchIndex).toBe(6);
  });

  it("uzun xabarda topilgan so'z ATROFIDAN olinadi", () => {
    /**
     * Eng muhim tekshiruv: xabar boshidan olinsa, topilgan so'z
     * parchaga umuman tushmasdi.
     */
    const body = `${'x'.repeat(500)} MANZIL ${'y'.repeat(500)}`;
    const result = buildSnippet(body, 'manzil');

    expect(result.text.toLowerCase()).toContain('manzil');
    expect(result.text.length).toBeLessThanOrEqual(SNIPPET_LENGTH + 6);
  });

  it('kesilgan joylar KO\'RSATILADI', () => {
    const body = `${'x'.repeat(500)} MANZIL ${'y'.repeat(500)}`;
    const result = buildSnippet(body, 'manzil');

    // Aks holda matn to'liqdek tuyulardi.
    expect(result.text.startsWith('...')).toBe(true);
    expect(result.text.endsWith('...')).toBe(true);
  });

  it("katta-kichik harf FARQ QILMAYDI", () => {
    expect(buildSnippet('Salom DUNYO', 'dunyo').matchIndex).toBeGreaterThanOrEqual(0);
    expect(buildSnippet('salom dunyo', 'DUNYO').matchIndex).toBeGreaterThanOrEqual(0);
  });

  it("so'z topilmasa -1 qaytadi", () => {
    expect(buildSnippet('Salom dunyo', 'boshqa').matchIndex).toBe(-1);
  });

  it("o'rin PARCHA ichida hisoblanadi", () => {
    const body = `${'x'.repeat(500)}MANZIL`;
    const result = buildSnippet(body, 'MANZIL');

    /**
     * Brauzer xabarning to'liq matnini ko'rmaydi — faqat parchani.
     * Shuning uchun o'rin ham parcha ichida bo'lishi kerak.
     */
    expect(result.matchIndex).toBeLessThan(result.text.length);
    expect(result.text.slice(result.matchIndex, result.matchIndex + 6)).toBe('MANZIL');
  });
});

describe('ajratib ko\'rsatish', () => {
  it("matnni uch bo'lakka ajratadi", () => {
    expect(splitHighlight('Salom dunyo', 'dunyo')).toEqual(['Salom ', 'dunyo', '']);
  });

  it("ASL harflar saqlanadi", () => {
    // "DUNYO" qidirilsa ham matndagi "dunyo" ko'rinishi kerak.
    const [, match] = splitHighlight('Salom dunyo', 'DUNYO');

    expect(match).toBe('dunyo');
  });

  it("topilmasa butun matn birinchi bo'lakda qoladi", () => {
    expect(splitHighlight('Salom dunyo', 'boshqa')).toEqual(['Salom dunyo', '', '']);
  });

  it("bo'sh so'rovda matn buzilmaydi", () => {
    expect(splitHighlight('Salom dunyo', '')).toEqual(['Salom dunyo', '', '']);
  });

  it("HTML matn KOD sifatida talqin qilinmaydi", () => {
    /**
     * Bo'laklar oddiy matn bo'lib qoladi — React ularni xavfsiz
     * chizadi. Bu XSS himoyasining asosi.
     */
    const [before, match, after] = splitHighlight('<script>alert(1)</script> salom', 'salom');

    expect(before).toContain('<script>');
    expect(match).toBe('salom');
    expect(after).toBe('');
  });
});

describe('natija matni', () => {
  it("bo'sh natija", () => {
    expect(searchResultText(0)).toBe('Hech narsa topilmadi');
  });

  it("ko'plik qo'shimchasisiz yoziladi", () => {
    expect(searchResultText(1)).toBe('1 ta xabar topildi');
    expect(searchResultText(7)).toBe('7 ta xabar topildi');
  });
});
