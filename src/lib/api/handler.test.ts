import { describe, expect, it } from 'vitest';

import { toDeveloperHint } from '@/lib/api/handler';

/**
 * `toDeveloperHint` faqat ishlab chiqish rejimida ishlatiladi, lekin
 * uning vazifasi muhim: telefondan tashxis qo'yish shunga bog'liq.
 */
describe('toDeveloperHint', () => {
  it("qisqa xabarni o'zgartirmaydi", () => {
    expect(toDeveloperHint('Baza javob bermadi')).toBe('Baza javob bermadi');
  });

  it('Turbopack modul nomlarini olib tashlaydi', () => {
    const noisy =
      'Invalid __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$prisma$2e$ts__$28$ecmascript$29$__["prisma"].findMany()';

    const result = toDeveloperHint(noisy);

    expect(result).not.toContain('TURBOPACK');
    expect(result).toContain('prisma');
  });

  it("uzun xabarning OXIRGI qismini saqlaydi — sabab o'sha yerda", () => {
    const cause = 'The table `public.service_providers` does not exist in the current database.';
    const long = `${'x'.repeat(2000)}\n\n${cause}`;

    const result = toDeveloperHint(long);

    expect(result).toContain(cause);
    expect(result.startsWith('…')).toBe(true);
  });

  it('chegaradan oshmaydi', () => {
    const result = toDeveloperHint('y'.repeat(5000), 100);
    // 100 ta belgi + boshidagi "…"
    expect(result.length).toBe(101);
  });
});
