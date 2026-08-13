import { describe, expect, it } from 'vitest';

import { LEGAL_DOCUMENTS, getLegalDocument, legalHref } from '@/config/legal';
import { LEGAL_ENTITY, hasFullRequisites, requisiteRows } from '@/config/legal/company';
import { TRIP_RULES } from '@/config/travel';
import { MAX_TOP_UP_SOM, MIN_TOP_UP_SOM } from '@/lib/money';
import type { LegalDocument } from '@/config/legal/legal.types';

/**
 * Huquqiy hujjatlar uchun sinovlar.
 *
 * ── Nima uchun MATNNI sinash kerak ────────────────────────────────────
 * Bu fayllar oddiy matndek ko'rinadi, lekin ular SHARTNOMA. Ulardagi
 * xato dasturni buzmaydi — u jimgina yashab qoladi va faqat nizo
 * chiqqanda ma'lum bo'ladi.
 *
 * Shuning uchun bu yerda avtomatik topish MUMKIN bo'lgan narsalar
 * tekshiriladi: takrorlangan langar, bo'sh bo'lim, mundarijadan
 * tushib qolgan sarlavha va hujjat matni bilan koddagi sozlamaning
 * mos kelishi.
 */

/** Hujjatdagi barcha matnni bitta satrga yig'adi. */
function allText(document: LegalDocument): string {
  return document.sections
    .flatMap((section) => [
      section.title,
      ...section.blocks.flatMap((block) => {
        if (block.kind === 'text' || block.kind === 'note') return [block.value];
        if (block.kind === 'list') return [...block.items];

        return [...block.head, ...block.rows.flat()];
      }),
    ])
    .join('\n');
}

describe('huquqiy hujjatlar', () => {
  it("uchta hujjat ham ro'yxatda", () => {
    expect(LEGAL_DOCUMENTS).toHaveLength(3);
  });

  it("manzil nomlari takrorlanmaydi", () => {
    const slugs = LEGAL_DOCUMENTS.map((document) => document.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('manzil nomlari faqat kichik harf va chiziqchadan iborat', () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(document.slug).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it("nomi bo'yicha topiladi", () => {
    for (const document of LEGAL_DOCUMENTS) {
      expect(getLegalDocument(document.slug)).toBe(document);
    }
  });

  it("noma'lum nom uchun `null` qaytadi", () => {
    expect(getLegalDocument('yoq-bunday-hujjat')).toBeNull();
  });

  it("havola to'g'ri yasaladi", () => {
    expect(legalHref('oferta')).toBe('/legal/oferta');
  });
});

describe.each(LEGAL_DOCUMENTS.map((document) => [document.title, document] as const))('%s', (_title, document) => {
  it("sarlavha va izoh bo'sh emas", () => {
    expect(document.title.trim().length).toBeGreaterThan(0);
    expect(document.summary.trim().length).toBeGreaterThan(0);
  });

  it("tahrir sanasi `YYYY-MM-DD` ko'rinishida", () => {
    expect(document.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(new Date(document.updatedAt).getTime())).toBe(false);
  });

  it("bo'limlar bor", () => {
    expect(document.sections.length).toBeGreaterThan(3);
  });

  it("bo'lim langarlari takrorlanmaydi", () => {
    const ids = document.sections.map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("langarlar manzilda ishlatishga yaroqli", () => {
    for (const section of document.sections) {
      // Katta harf, bo'shliq va o'zbekcha apostrof havolani buzadi.
      expect(section.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("har bir bo'limda kamida bitta blok bor", () => {
    for (const section of document.sections) {
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it("bo'sh matn yo'q", () => {
    for (const section of document.sections) {
      for (const block of section.blocks) {
        if (block.kind === 'text' || block.kind === 'note') {
          expect(block.value.trim().length).toBeGreaterThan(0);
        }

        if (block.kind === 'list') {
          expect(block.items.length).toBeGreaterThan(0);
          for (const item of block.items) expect(item.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("jadval qatorlari sarlavha bilan bir xil uzunlikda", () => {
    for (const section of document.sections) {
      for (const block of section.blocks) {
        if (block.kind !== 'table') continue;

        expect(block.rows.length).toBeGreaterThan(0);

        for (const row of block.rows) {
          expect(row).toHaveLength(block.head.length);
        }
      }
    }
  });

  it("aloqa uchun pochta manzili hujjat ichida yoki rekvizitlarda bor", () => {
    const text = allText(document);

    expect(text.includes(LEGAL_ENTITY.email) || document.requiresRequisites === true).toBe(true);
  });
});

/**
 * Hujjat matni koddagi HAQIQIY qoidaga mos kelishi.
 *
 * Eng xavfli xato — hujjatda bir raqam, kodda boshqa raqam turishi.
 * Bu sinovlar shu qiymatlar matnga sozlamadan tushayotganini
 * tasdiqlaydi: sozlama o'zgarsa va matn qotib qolsa, sinov yiqiladi.
 */
describe('matn koddagi qoidaga mos', () => {
  const offerText = allText(LEGAL_DOCUMENTS.find((document) => document.slug === 'oferta')!);
  const termsText = allText(LEGAL_DOCUMENTS.find((document) => document.slug === 'shartlar')!);

  it("chipta qaytarish soati offertada ko'rsatilgan", () => {
    expect(offerText).toContain(String(TRIP_RULES.fullRefundHours));
  });

  it('kech bekor qilish foizi offertada mos', () => {
    expect(offerText).toContain(`${TRIP_RULES.lateRefundPercent}%`);
  });

  it("hamyon chegaralari shartlarda mos", () => {
    // Summalar bo'sh joy bilan guruhlanadi ("10 000 000"), shuning
    // uchun raqamlarning o'zi solishtiriladi.
    const digits = termsText.replace(/\D/g, '');

    expect(digits).toContain(String(MIN_TOP_UP_SOM));
    expect(digits).toContain(String(MAX_TOP_UP_SOM));
  });
});

describe('rekvizitlar', () => {
  it("to'ldirilmagan maydonlar ro'yxatga tushmaydi", () => {
    const rows = requisiteRows({
      legalName: null,
      taxId: null,
      address: null,
      bankAccount: null,
      bankName: null,
      registrationNumber: null,
      email: 'test@navix.uz',
      supportHours: 'Har kuni',
      country: "O'zbekiston Respublikasi",
    });

    const labels = rows.map(([label]) => label);

    expect(labels).not.toContain('STIR');
    expect(labels).toContain('Elektron pochta');
  });

  it("hammasi to'ldirilganda to'liq deb hisoblanadi", () => {
    const full = {
      legalName: '«NAVIX» MChJ',
      taxId: '123456789',
      address: 'Toshkent',
      bankAccount: '20208000000000000001',
      bankName: 'Bank, MFO 00000',
      registrationNumber: 'A-1',
      email: 'test@navix.uz',
      supportHours: 'Har kuni',
      country: "O'zbekiston Respublikasi",
    };

    expect(hasFullRequisites(full)).toBe(true);
    expect(requisiteRows(full).map(([label]) => label)).toContain('STIR');
  });

  it("bitta maydon yetishmasa to'liq emas", () => {
    expect(
      hasFullRequisites({
        legalName: '«NAVIX» MChJ',
        taxId: '123456789',
        address: 'Toshkent',
        bankAccount: '20208000000000000001',
        bankName: 'Bank',
        registrationNumber: null,
        email: 'test@navix.uz',
        supportHours: 'Har kuni',
        country: "O'zbekiston Respublikasi",
      }),
    ).toBe(false);
  });
});
