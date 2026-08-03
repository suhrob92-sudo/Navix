import { describe, expect, it } from 'vitest';

import { ADMIN_NAV, isAdminNavItemActive } from '@/config/admin-nav';
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
   * Qo'llab-quvvatlash xodimi murojaatlarni hal qiladi, lekin
   * provayder tarifini o'zgartira olmasligi kerak.
   */
  it("qo'llab-quvvatlash xodimi tranzaksiyalarni ko'radi", () => {
    const visible = visibleFor([Role.SUPPORT]);

    expect(visible).toContain('/admin/transactions');
    expect(visible).toContain('/admin/users');
  });

  it("qo'llab-quvvatlash xodimida provayder boshqarish ruxsati yo'q", () => {
    expect(hasPermission([Role.SUPPORT], Permission.PLATFORM_PROVIDER_MANAGE)).toBe(false);
    expect(hasPermission([Role.SUPPORT], Permission.PLATFORM_USER_SUSPEND)).toBe(false);
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
