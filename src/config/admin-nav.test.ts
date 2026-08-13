import { describe, expect, it } from 'vitest';

import { ADMIN_NAV, ADMIN_SECTIONS, isAdminNavItemActive } from '@/config/admin-nav';
import { Permission, Role, hasPermission } from '@/config/rbac';

describe('ADMIN_NAV', () => {
  it("barcha manzillar '/admin' bilan boshlanadi", () => {
    for (const item of ADMIN_NAV) {
      expect(item.href.startsWith('/admin')).toBe(true);
    }
  });

  it('manzillar takrorlanmaydi', () => {
    const hrefs = ADMIN_NAV.map((item) => item.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("rollarga qarab ko'rinadigan bo'limlar", () => {
  function visibleFor(roles: string[]): string[] {
    return ADMIN_NAV.filter((item) =>
      hasPermission(roles as Parameters<typeof hasPermission>[0], item.permission),
    ).map((item) => item.href);
  }

  it("oddiy foydalanuvchi hech qanday bo'limni ko'rmaydi", () => {
    expect(visibleFor([Role.CUSTOMER])).toEqual([]);
  });

  it("administrator hamma bo'limni ko'radi", () => {
    expect(visibleFor([Role.ADMIN])).toHaveLength(ADMIN_NAV.length);
  });

  /**
   * Qo'llab-quvvatlash xodimi murojaatlarni hal qiladi: to'lovni topadi
   * va foydalanuvchini ko'radi. Lekin tarifni o'zgartira olmaydi.
   */
  it("qo'llab-quvvatlash xodimi to'lovlar va odamlarni ko'radi", () => {
    const visible = visibleFor([Role.SUPPORT]);

    expect(visible).toContain('/admin/payments');
    expect(visible).toContain('/admin/users');
  });

  it("qo'llab-quvvatlash xodimida provayder boshqarish ruxsati yo'q", () => {
    expect(hasPermission([Role.SUPPORT], Permission.PLATFORM_PROVIDER_MANAGE)).toBe(false);
    expect(hasPermission([Role.SUPPORT], Permission.PLATFORM_USER_SUSPEND)).toBe(false);
  });

  /**
   * Audit jurnalida boshqa foydalanuvchilarning IP manzillari va
   * amallari bor — bu qo'llab-quvvatlash ishi uchun kerak emas.
   */
  it("qo'llab-quvvatlash xodimi audit jurnalini ko'rmaydi", () => {
    expect(visibleFor([Role.SUPPORT])).not.toContain('/admin/audit');
    expect(hasPermission([Role.SUPPORT], Permission.PLATFORM_AUDIT_READ)).toBe(false);
  });

  /**
   * Pulni qaytarish — qo'llab-quvvatlashning asosiy vositasi.
   * Har bir qaytarish audit jurnaliga yoziladi, shuning uchun
   * bu ruxsat xodimda bo'lishi mumkin.
   */
  it("qo'llab-quvvatlash xodimi pulni qaytara oladi", () => {
    expect(hasPermission([Role.SUPPORT], Permission.PAYMENT_REFUND)).toBe(true);
  });

  it('oddiy mijoz pulni qaytara olmaydi', () => {
    expect(hasPermission([Role.CUSTOMER], Permission.PAYMENT_REFUND)).toBe(false);
  });

  /**
   * Rol berish — tizimning kaliti: bu ruxsatga ega odam o'ziga
   * istalgan huquqni bera oladi. Shuning uchun faqat SUPER_ADMIN da.
   */
  it('rol boshqarish faqat bosh administratorda', () => {
    expect(hasPermission([Role.SUPER_ADMIN], Permission.PLATFORM_ROLE_MANAGE)).toBe(true);
    expect(hasPermission([Role.ADMIN], Permission.PLATFORM_ROLE_MANAGE)).toBe(false);
  });
});

describe('isAdminNavItemActive', () => {
  const dashboard = ADMIN_NAV[0];
  const providers = ADMIN_NAV[1];

  it("bosh sahifa faqat aynan '/admin' da faol", () => {
    expect(isAdminNavItemActive('/admin', dashboard)).toBe(true);
    expect(isAdminNavItemActive('/admin/providers', dashboard)).toBe(false);
  });

  it("ichki sahifada ham bo'lim faol qoladi", () => {
    expect(isAdminNavItemActive('/admin/providers', providers)).toBe(true);
    expect(isAdminNavItemActive('/admin/providers/new', providers)).toBe(true);
    expect(isAdminNavItemActive('/admin/users', providers)).toBe(false);
  });
});

describe('ADMIN_SECTIONS', () => {
  it("barcha manzillar '/admin/' bilan boshlanadi", () => {
    for (const section of ADMIN_SECTIONS) {
      expect(section.href.startsWith('/admin/')).toBe(true);
    }
  });

  it('manzillar takrorlanmaydi', () => {
    const hrefs = ADMIN_SECTIONS.map((section) => section.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("pastki paneldagi bo'limlar bu yerda TAKRORLANMAYDI", () => {
    /**
     * Bir bo'lim ikki joyda turmasligi kerak: xodim uni panelda ham,
     * kartochkada ham ko'rib, ikkitasi boshqa-boshqa joy deb
     * o'ylardi.
     */
    const navHrefs = new Set(ADMIN_NAV.map((item) => item.href));

    for (const section of ADMIN_SECTIONS) {
      expect(navHrefs.has(section.href), `${section.href} ikki joyda`).toBe(false);
    }
  });

  it("har bir bo'limda izoh bor", () => {
    for (const section of ADMIN_SECTIONS) {
      expect(section.description.trim().length).toBeGreaterThan(10);
    }
  });

  it("oddiy foydalanuvchi hech qanday kartochkani ko'rmaydi", () => {
    const visible = ADMIN_SECTIONS.filter((section) =>
      hasPermission([Role.CUSTOMER] as Parameters<typeof hasPermission>[0], section.permission),
    );

    expect(visible).toEqual([]);
  });

  it("qo'llab-quvvatlash xodimi faqat o'ziga tegishlisini ko'radi", () => {
    const visible = ADMIN_SECTIONS.filter((section) =>
      hasPermission([Role.SUPPORT] as Parameters<typeof hasPermission>[0], section.permission),
    ).map((section) => section.href);

    /**
     * SUPPORT foydalanuvchi murojaatlarini hal qiladi. U bo'limni
     * yopa olmaydi, kontentni yashira olmaydi va navbat ro'yxatidagi
     * telefon raqamlarini ko'ra olmaydi.
     */
    expect(visible).not.toContain('/admin/modules');
    expect(visible).not.toContain('/admin/businesses');
    expect(visible).not.toContain('/admin/content');
    expect(visible).not.toContain('/admin/waitlist');
  });

  it("administrator hamma kartochkani ko'radi", () => {
    const visible = ADMIN_SECTIONS.filter((section) =>
      hasPermission([Role.ADMIN] as Parameters<typeof hasPermission>[0], section.permission),
    );

    expect(visible).toHaveLength(ADMIN_SECTIONS.length);
  });
});
