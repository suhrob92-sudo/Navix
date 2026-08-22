import { describe, expect, it } from 'vitest';

import { CSP_REPORT_PATH, ENFORCED_CSP, REPORT_ONLY_CSP } from '@/config/csp';

/**
 * CSP qoidalari — testlar.
 *
 * Bu yerdagi tekshiruvlar bitta narsani qo'riqlaydi: majburiy qoidaga
 * xato qo'shilsa, u butun saytni oq ekranga aylantirishi mumkin.
 * Shuning uchun majburiy ro'yxat QISQA va aniq bo'lib qolishi kerak.
 */

/** Qoidalarni nomi bo'yicha ajratadi. */
function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split(';').map((part) => {
      const [name, ...rest] = part.trim().split(/\s+/);

      return [name, rest.join(' ')];
    }),
  );
}

describe('majburiy qoidalar', () => {
  const rules = directives(ENFORCED_CSP);

  it('faqat xavfsiz qoidalardan iborat', () => {
    /**
     * Bu ro'yxat ATAYLAB qat'iy: yangi qoida qo'shilsa, test tushadi
     * va uni qo'shgan odam "bu haqiqatan hech narsani buzmaydimi?"
     * degan savolga javob berishga majbur bo'ladi.
     */
    expect([...rules.keys()].sort()).toEqual(['base-uri', 'form-action', 'frame-ancestors', 'object-src']);
  });

  it('saytni begona iframe ichiga solib bo\'lmaydi', () => {
    expect(rules.get('frame-ancestors')).toBe("'none'");
  });

  it('formani begona serverga yuborib bo\'lmaydi', () => {
    expect(rules.get('form-action')).toBe("'self'");
  });

  it('nisbiy manzillarni burib yuborib bo\'lmaydi', () => {
    expect(rules.get('base-uri')).toBe("'self'");
  });

  it("eskirgan <object> orqali kod ishga tushmaydi", () => {
    expect(rules.get('object-src')).toBe("'none'");
  });

  it("skript va uslub qoidalari MAJBURIYDA yo'q", () => {
    // Ular sahifani sindirishi mumkin — hozircha faqat kuzatuvda.
    expect(rules.has('script-src')).toBe(false);
    expect(rules.has('default-src')).toBe(false);
  });
});

describe('kuzatuv qoidalari', () => {
  const rules = directives(REPORT_ONLY_CSP);

  it("hisobot manzili ko'rsatilgan", () => {
    expect(rules.get('report-uri')).toBe(CSP_REPORT_PATH);
  });

  it("'unsafe-eval' ruxsat etilmagan", () => {
    /**
     * O'lchandi: kutubxona kod yasashga urinadi, lekin try/catch
     * ichida — CSP to'ssa sekinroq yo'lga o'zi o'tadi.
     *
     * Ya'ni ruxsat berish shart emas, berish esa CSP ma'nosini
     * yo'qotardi.
     */
    expect(REPORT_ONLY_CSP).not.toContain('unsafe-eval');
  });

  it("skriptlarda 'unsafe-inline' ruxsat etilmagan", () => {
    // Aynan shuni o'lchayapmiz — ruxsat berilsa, kuzatuv ma'nosiz.
    expect(rules.get('script-src')).toBe("'self'");
  });

  it('majburiy qoidalarning hammasi bu yerda ham bor', () => {
    const enforced = directives(ENFORCED_CSP);

    for (const [name, value] of enforced) {
      expect(rules.get(name)).toBe(value);
    }
  });

  it('rasm va ovoz tashqi ombordan kelishi mumkin', () => {
    // Vercel Blob domeni har loyihada boshqacha.
    expect(rules.get('img-src')).toContain('https:');
    expect(rules.get('media-src')).toContain('https:');
  });

  it("hech bir qoida bo'sh emas", () => {
    for (const [name, value] of rules) {
      expect(name.length).toBeGreaterThan(0);
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
