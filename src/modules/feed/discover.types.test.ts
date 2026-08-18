import { describe, expect, it } from 'vitest';

import {
  MIN_SEARCH_LENGTH,
  SEARCH_SCOPES,
  SEARCH_SCOPE_LABELS,
  type SearchScope,
} from '@/modules/feed/discover.types';
import { feedSearchQuerySchema, searchHistoryQuerySchema } from '@/modules/feed/feed.schemas';
import { MAX_SEARCH_HISTORY } from '@/modules/feed/search-history.service';

describe('SEARCH_SCOPES', () => {
  it("har bir turda ekranda ko'rinadigan yozuv bor", () => {
    /*
      Yozuvsiz tur qatorda BO'SH tugma bo'lardi: uni ko'rish ham,
      nima qilishini bilish ham mumkin emasdi.
    */
    for (const scope of SEARCH_SCOPES) {
      expect(SEARCH_SCOPE_LABELS[scope]).toBeTruthy();
    }
  });

  it("yozuvlar ro'yxatida ortiqchasi yo'q", () => {
    // Olib tashlangan tur yozuvi qolib ketsa, u hech qachon
    // ko'rinmaydigan "o'lik" matn bo'lardi.
    expect(Object.keys(SEARCH_SCOPE_LABELS).sort()).toEqual([...SEARCH_SCOPES].sort());
  });

  it("POST va VIDEO ALOHIDA turlar", () => {
    /*
      Ular ekranda boshqacha chiziladi: video — panjara, post —
      kartochka. Bitta turga birlashtirilsa, panjara buzilardi.
    */
    expect(SEARCH_SCOPES).toContain('POST');
    expect(SEARCH_SCOPES).toContain('VIDEO');
  });

  it("birinchi tur — BARCHASI", () => {
    // Qatorning boshida turadi va odatiy tanlov ham shu.
    expect(SEARCH_SCOPES[0]).toBe('ALL');
  });
});

describe('feedSearchQuerySchema', () => {
  it("so'rovsiz ham qabul qilinadi (kashf qilish holati)", () => {
    const result = feedSearchQuerySchema.safeParse({});

    expect(result.success && result.data.scope).toBe('ALL');
    expect(result.success && result.data.q).toBeUndefined();
  });

  it("har bir tur qabul qilinadi", () => {
    for (const scope of SEARCH_SCOPES) {
      expect(feedSearchQuerySchema.safeParse({ q: 'burger', scope }).success).toBe(true);
    }
  });

  it("noma'lum tur RAD etiladi", () => {
    expect(feedSearchQuerySchema.safeParse({ q: 'burger', scope: 'PRODUCT' }).success).toBe(false);
  });

  it("juda uzun so'rov rad etiladi", () => {
    expect(feedSearchQuerySchema.safeParse({ q: 'a'.repeat(200) }).success).toBe(false);
  });

  it("tarixga yozish ODATDA o'chiq", () => {
    /*
      Bu eng muhim odatiy qiymat: yoqiq bo'lsa, har bosilgan harf
      tarixga tushib, ro'yxat "b", "bu", "bur" bilan to'lardi.
    */
    const result = feedSearchQuerySchema.safeParse({ q: 'burger' });

    expect(result.success && result.data.remember).toBe(false);
  });

  it("belgi yoqilganda mantiqiy qiymatga aylanadi", () => {
    const on = feedSearchQuerySchema.safeParse({ q: 'burger', remember: '1' });
    const off = feedSearchQuerySchema.safeParse({ q: 'burger', remember: '0' });

    expect(on.success && on.data.remember).toBe(true);
    expect(off.success && off.data.remember).toBe(false);
  });

  it("belgining boshqa qiymati RAD etiladi", () => {
    // "true" yoki "ha" jimgina `false` bo'lib qolmasligi kerak.
    expect(feedSearchQuerySchema.safeParse({ q: 'burger', remember: 'true' }).success).toBe(false);
  });
});

describe('searchHistoryQuerySchema', () => {
  it("so'zsiz — BUTUN tarix o'chadi", () => {
    const result = searchHistoryQuerySchema.safeParse({});

    expect(result.success && result.data.q).toBeUndefined();
  });

  it("bitta so'z berilishi mumkin", () => {
    const result = searchHistoryQuerySchema.safeParse({ q: '  burger ' });

    expect(result.success && result.data.q).toBe('burger');
  });
});

describe('chegaralar', () => {
  it("qidiruv so'zi juda qisqa bo'lmasligi kerak", () => {
    /*
      Bitta harf bo'yicha qidirilsa, deyarli hamma narsa mos
      kelardi va natija foydasiz bo'lardi.
    */
    expect(MIN_SEARCH_LENGTH).toBeGreaterThanOrEqual(2);
  });

  it("tarix uzunligi ekranga sig'adigan darajada", () => {
    // Tarix qidiruv maydonining ostida turadi: uzun ro'yxat butun
    // ekranni egallab, kashf qilish bo'limini pastga surardi.
    expect(MAX_SEARCH_HISTORY).toBeGreaterThan(0);
    expect(MAX_SEARCH_HISTORY).toBeLessThanOrEqual(15);
  });

  it("tur nomlari qidiruv turi bilan MOS", () => {
    const scopes: SearchScope[] = [...SEARCH_SCOPES];

    expect(scopes).toHaveLength(Object.keys(SEARCH_SCOPE_LABELS).length);
  });
});
