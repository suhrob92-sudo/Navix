import { describe, expect, it } from 'vitest';

import { CABINET_NAV, findActiveNavItem } from '@/config/cabinet-nav';

describe('Kabinet navigatsiyasi', () => {
  it("har bir bo'lim manzili noyob", () => {
    const hrefs = CABINET_NAV.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('barcha manzillar "/" bilan boshlanadi', () => {
    for (const item of CABINET_NAV) {
      expect(item.href.startsWith('/'), `${item.href} noto'g'ri`).toBe(true);
    }
  });

  describe('findActiveNavItem', () => {
    it('aniq mos kelgan manzilni topadi', () => {
      expect(findActiveNavItem('/profile')?.href).toBe('/profile');
    });

    it("ichki sahifada ham asosiy bo'limni topadi", () => {
      expect(findActiveNavItem('/addresses/new')?.href).toBe('/addresses');
    });

    it("exact bo'limda faqat aniq moslik hisoblanadi", () => {
      // `/dashboard` exact: true — ichki sahifa uni faollashtirmasligi kerak.
      expect(findActiveNavItem('/dashboard')?.href).toBe('/dashboard');
      expect(findActiveNavItem('/dashboard/statistika')).toBeUndefined();
    });

    it("noma'lum manzilda undefined qaytaradi", () => {
      expect(findActiveNavItem('/mavjud-emas')).toBeUndefined();
    });

    it("o'xshash boshlanishli manzilni chalkashtirmaydi", () => {
      // `/securityXYZ` — `/security` emas.
      expect(findActiveNavItem('/securityXYZ')).toBeUndefined();
    });
  });
});
