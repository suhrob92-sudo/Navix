import { describe, expect, it } from 'vitest';

import {
  Permission,
  ROLE_PERMISSIONS,
  Role,
  hasAnyPermission,
  hasPermission,
  resolvePermissions,
} from '@/config/rbac';

describe('RBAC — rollar va ruxsatlar', () => {
  it("har bir rol uchun ruxsatlar ro'yxati aniqlangan", () => {
    for (const role of Object.values(Role)) {
      expect(ROLE_PERMISSIONS[role], `${role} roli uchun ruxsatlar yo'q`).toBeDefined();
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('SUPER_ADMIN barcha ruxsatlarga ega', () => {
    const allPermissions = Object.values(Permission);
    const superAdminPermissions = resolvePermissions([Role.SUPER_ADMIN]);

    for (const permission of allPermissions) {
      expect(superAdminPermissions.has(permission), `SUPER_ADMIN'da ${permission} yo'q`).toBe(true);
    }
  });

  it("oddiy mijozda admin ruxsati bo'lmaydi", () => {
    expect(hasPermission([Role.CUSTOMER], Permission.PLATFORM_ADMIN_ACCESS)).toBe(false);
    expect(hasPermission([Role.CUSTOMER], Permission.PLATFORM_USER_SUSPEND)).toBe(false);
  });

  it("mijoz o'z profili va hamyoni bilan ishlay oladi", () => {
    expect(hasPermission([Role.CUSTOMER], Permission.PROFILE_READ)).toBe(true);
    expect(hasPermission([Role.CUSTOMER], Permission.WALLET_TRANSFER)).toBe(true);
  });

  it("haydovchi safar buyurtmasini qabul qila oladi, mijoz esa yo'q", () => {
    expect(hasPermission([Role.DRIVER], Permission.TAXI_RIDE_ACCEPT)).toBe(true);
    expect(hasPermission([Role.CUSTOMER], Permission.TAXI_RIDE_ACCEPT)).toBe(false);
  });

  it('bir nechta rol ruxsatlari birlashtiriladi', () => {
    const permissions = resolvePermissions([Role.CUSTOMER, Role.MERCHANT]);

    expect(permissions.has(Permission.ORDER_CREATE)).toBe(true);
    expect(permissions.has(Permission.CATALOG_PRODUCT_MANAGE)).toBe(true);
  });

  it('hasAnyPermission kamida bitta moslikda true qaytaradi', () => {
    expect(
      hasAnyPermission([Role.COURIER], [Permission.PLATFORM_ADMIN_ACCESS, Permission.DELIVERY_ORDER_ACCEPT]),
    ).toBe(true);

    expect(hasAnyPermission([Role.COURIER], [Permission.PLATFORM_ADMIN_ACCESS, Permission.PAYMENT_REFUND])).toBe(
      false,
    );
  });

  it("noma'lum rol xatolik bermaydi, bo'sh to'plam qaytaradi", () => {
    // @ts-expect-error — ataylab noto'g'ri qiymat beramiz, kod yiqilmasligi kerak.
    expect(resolvePermissions(['NOMALUM_ROL']).size).toBe(0);
  });
});
