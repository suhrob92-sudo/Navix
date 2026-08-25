import { describe, expect, it } from 'vitest';

import {
  FREE_CANCEL_DAYS,
  LATE_CANCEL_REFUND_PERCENT,
  cancellationPolicyRows,
  cancellationTerms,
  daysUntil,
  refundAmount,
} from '@/config/cancellation';

/**
 * Bekor qilish shartlari — testlar.
 *
 * Bu hisob ODAMNING PULIGA tegadi. Chegaradagi bitta kun xatosi
 * mehmonga "yarmi qaytdi" degan kutilmagan xabar berardi.
 */

const TODAY = '2026-08-25';

describe('kunlar farqi', () => {
  it('kelajakdagi sana MUSBAT', () => {
    expect(daysUntil('2026-08-28', TODAY)).toBe(3);
  });

  it("bugungi sana NOL", () => {
    expect(daysUntil(TODAY, TODAY)).toBe(0);
  });

  it("o'tmishdagi sana MANFIY", () => {
    expect(daysUntil('2026-08-20', TODAY)).toBe(-5);
  });

  it('oy chegarasidan oshadi', () => {
    // 25-avgustdan 2-sentabrgacha — sakkiz kun.
    expect(daysUntil('2026-09-02', TODAY)).toBe(8);
  });

  it('yaroqsiz sana hisobni BUZMAYDI', () => {
    expect(daysUntil('salom', TODAY)).toBe(0);
  });
});

describe('shartlar', () => {
  it('uzoq muddat — BEPUL', () => {
    const terms = cancellationTerms('2026-09-25', TODAY);

    expect(terms.tier).toBe('FREE');
    expect(terms.refundPercent).toBe(100);
  });

  it('chegaraning O\'ZI ham bepul', () => {
    /**
     * Aynan uch kun qolganda ham bepul: "3 kun va undan ko'p"
     * degan va'da shuni bildiradi. Bir kun xato qilinsa,
     * mehmon o'zini aldangandek his qilardi.
     */
    const terms = cancellationTerms('2026-08-28', TODAY);

    expect(daysUntil('2026-08-28', TODAY)).toBe(FREE_CANCEL_DAYS);
    expect(terms.tier).toBe('FREE');
  });

  it('chegaradan bir kun beri — YARMI', () => {
    const terms = cancellationTerms('2026-08-27', TODAY);

    expect(terms.tier).toBe('PARTIAL');
    expect(terms.refundPercent).toBe(LATE_CANCEL_REFUND_PERCENT);
  });

  it('ertaga kirish — YARMI', () => {
    expect(cancellationTerms('2026-08-26', TODAY).tier).toBe('PARTIAL');
  });

  it('bugun kirish — BEKOR QILIB BO\'LMAYDI', () => {
    const terms = cancellationTerms(TODAY, TODAY);

    expect(terms.tier).toBe('BLOCKED');
    expect(terms.refundPercent).toBe(0);
  });

  it('kirish kuni o\'tgan — ham bloklangan', () => {
    expect(cancellationTerms('2026-08-20', TODAY).tier).toBe('BLOCKED');
  });

  it('qisman qaytarishda QANCHA KUN qolgani aytiladi', () => {
    // "Kirishga 2 kun qoldi" — odam qarorini shunga qarab qiladi.
    expect(cancellationTerms('2026-08-27', TODAY).text).toContain('2 kun');
  });
});

describe('qaytariladigan summa', () => {
  it("to'liq qaytarish — hammasi", () => {
    expect(refundAmount(45_000_000n, 100)).toBe(45_000_000n);
  });

  it('yarmi', () => {
    expect(refundAmount(45_000_000n, 50)).toBe(22_500_000n);
  });

  it('nol foiz — hech narsa', () => {
    expect(refundAmount(45_000_000n, 0)).toBe(0n);
  });

  it('PASTGA yaxlitlanadi', () => {
    /**
     * Yuqoriga yaxlitlansa, har bekor qilishda bir tiyin yo'qdan
     * paydo bo'lardi — bu hisobni buzadi.
     */
    expect(refundAmount(101n, 50)).toBe(50n);
  });

  it('katta summada ham aniq', () => {
    // BigInt ishlatilgani uchun xavfsiz son chegarasi muammo emas.
    expect(refundAmount(999_999_999_999n, 50)).toBe(499_999_999_999n);
  });

  it("qaytarilgan summa asl summadan OSHMAYDI", () => {
    // Foiz noto'g'ri berilsa ham (masalan 150), ortiqcha pul chiqmaydi.
    expect(refundAmount(45_000_000n, 150)).toBe(45_000_000n);
  });

  it('manfiy foiz — nol', () => {
    expect(refundAmount(45_000_000n, -20)).toBe(0n);
  });
});

describe('jadval', () => {
  it('uchta bosqich', () => {
    expect(cancellationPolicyRows()).toHaveLength(3);
  });

  it('har bir bosqich boshqacha', () => {
    const tiers = cancellationPolicyRows().map((row) => row.tier);

    expect(new Set(tiers).size).toBe(3);
  });

  it('jadval SOZLAMAGA mos', () => {
    /**
     * Matnlar qo'lda yozilsa, sozlama o'zgarganda ular eskirib
     * qolardi va ekranda yolg'on va'da turardi.
     */
    expect(cancellationPolicyRows()[0].when).toContain(String(FREE_CANCEL_DAYS));
    expect(cancellationPolicyRows()[1].refund).toContain(String(LATE_CANCEL_REFUND_PERCENT));
  });
});
