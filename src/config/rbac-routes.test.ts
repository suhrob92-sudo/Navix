import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { Permission, ROLE_PERMISSIONS, Role, type PermissionValue } from '@/config/rbac';

/**
 * IMTIYOZLI yo'llar rostdan himoyalanganmi.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Ruxsat tekshiruvini qo'shish — bir qator kod. Uni UNUTISH ham bir
 * qator kod: shunchaki yozmaslik.
 *
 * Natijasi darhol ko'rinmaydi. Yangi yo'l ishlaydi, sahifa ochiladi,
 * hamma narsa joyida ko'rinadi — chunki uni yozgan odam allaqachon
 * admin. Muammo faqat begona odam o'sha manzilni topganda chiqadi.
 *
 * 53-bosqichdan keyingi auditda AYNAN shunday holat topildi:
 * `/api/v1/seller/returns` da faqat `requireAuth` turardi.
 * Ma'lumot xavfsiz edi (egalik tekshirilardi), lekin ROL
 * tekshirilmasdi — ya'ni admin SELLER rolini olib tashlasa ham,
 * o'sha odam qaytarishlarni tasdiqlashda davom etardi.
 *
 * ── Nima uchun matn bo'yicha tekshiriladi ─────────────────────────────
 * Yo'lni haqiqiy so'rov bilan sinash ancha ishonchli bo'lardi, lekin
 * 229 ta yo'l uchun bu o'nlab sekund va haqiqiy baza degani.
 *
 * Matn tekshiruvi esa bir zumda ishlaydi va aynan UNUTISHNI ushlaydi
 * — bu sinov qidirayotgan xato shu.
 */

const API_ROOT = 'src/app/api/v1';

/**
 * Ruxsat TALAB QILADIGAN bo'limlar.
 *
 * Ular kabinet: har birining o'z roli bor va u rol platformaning
 * "o'chirish" tugmasi hisoblanadi.
 */
const PRIVILEGED_AREAS = ['admin', 'seller', 'courier', 'merchant', 'employer'] as const;

/** Kabinet sahifalari va ularning qo'riqchisi. */
const CABINET_GUARDS: readonly { group: string; guard: string }[] = [
  { group: '(admin)', guard: 'RequireAdmin' },
  { group: '(seller)', guard: 'RequireSeller' },
  { group: '(courier)', guard: 'RequireCourier' },
  { group: '(merchant)', guard: 'RequireMerchant' },
  { group: '(employer)', guard: 'RequireEmployer' },
];

function findFiles(dir: string, name: string): string[] {
  let entries: string[];

  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) return findFiles(full, name);

    return entry === name ? [full] : [];
  });
}

describe('imtiyozli API yo\'llari', () => {
  for (const area of PRIVILEGED_AREAS) {
    const files = findFiles(join(API_ROOT, area), 'route.ts');

    it(`/${area} — yo'llar topildi`, () => {
      /*
        Bo'lim bo'shab qolsa, quyidagi sinovlar jimgina o'tib
        ketardi va himoya yo'qolganini hech kim sezmasdi.
      */
      expect(files.length).toBeGreaterThan(0);
    });

    for (const file of files) {
      it(`${file.replace(`${API_ROOT}/`, '')} — RUXSAT tekshiradi`, () => {
        const source = readFileSync(file, 'utf8');

        /*
          `requireAuth` YETARLI EMAS: u faqat "kirganmi" deb
          so'raydi. Kabinet esa rolga tegishli.
        */
        expect(source, `${file} da requirePermission yo'q`).toContain('requirePermission');
      });

      it(`${file.replace(`${API_ROOT}/`, '')} — ANIQ ruxsat nomini ko'rsatadi`, () => {
        const source = readFileSync(file, 'utf8');

        expect(source, `${file} da Permission.* yo'q`).toMatch(/Permission\.[A-Z_]+/);
      });
    }
  }
});

describe('kabinet sahifalari', () => {
  for (const { group, guard } of CABINET_GUARDS) {
    it(`${group} — qolipda qo'riqchi bor`, () => {
      /*
        ── Nima uchun QOLIP, sahifa emas ──────────────────────────
        Sahifalarda tekshirish "eslab qolish" ga tayanadi: yangi
        sahifa qo'shilib, qo'riqchi unutilsa, ekran hamma uchun
        ochilib qolardi.

        Qolip esa barcha sahifalarni o'raydi — uni unutib
        bo'lmaydi.
      */
      const layout = readFileSync(join('src/app', group, 'layout.tsx'), 'utf8');

      expect(layout, `${group}/layout.tsx da ${guard} yo'q`).toContain(guard);
    });
  }
});

describe('rollar jadvali', () => {
  it('CUSTOMER da PLATFORM ruxsati YO\'Q', () => {
    /**
     * Eng muhim shart. Oddiy foydalanuvchiga bironta platforma
     * ruxsati tushib qolsa, u admin panelining bir qismini ocha
     * olardi.
     */
    const platform = ROLE_PERMISSIONS[Role.CUSTOMER].filter((p) => p.startsWith('platform:'));

    expect(platform).toEqual([]);
  });

  it('CUSTOMER da KABINET ruxsati ham yo\'q', () => {
    const cabinets: PermissionValue[] = [
      Permission.COURIER_DASHBOARD_ACCESS,
      Permission.MERCHANT_DASHBOARD_ACCESS,
      Permission.SELLER_DASHBOARD_ACCESS,
      Permission.EMPLOYER_DASHBOARD_ACCESS,
    ];

    for (const permission of cabinets) {
      expect(ROLE_PERMISSIONS[Role.CUSTOMER]).not.toContain(permission);
    }
  });

  it('ROL BERISH huquqi faqat SUPER_ADMIN da', () => {
    /**
     * ── Nima uchun bu eng muhim qator ───────────────────────────────
     * Bu huquq bilan odam O'ZIGA istalgan rolni bera oladi — ya'ni
     * qolgan barcha cheklovlar ma'nosiz bo'lib qoladi.
     *
     * Oddiy admin ham buni qila olsa, uning hisobini qo'lga
     * kiritgan odam darhol super-admin bo'lardi.
     */
    const canManageRoles = Object.entries(ROLE_PERMISSIONS)
      .filter(([, permissions]) => permissions.includes(Permission.PLATFORM_ROLE_MANAGE))
      .map(([role]) => role);

    expect(canManageRoles).toEqual([Role.SUPER_ADMIN]);
  });

  it('SUPPORT xodimida O\'CHIRISH huquqlari yo\'q', () => {
    /**
     * Qo'llab-quvvatlash xodimi ko'p ma'lumot ko'radi, lekin
     * platformani o'zgartira olmasligi kerak: modul yoqish,
     * biznes tahrirlash, foydalanuvchini bloklash — bularning
     * hech biri unda yo'q.
     */
    const forbidden: PermissionValue[] = [
      Permission.PLATFORM_MODULE_MANAGE,
      Permission.PLATFORM_BUSINESS_MANAGE,
      Permission.PLATFORM_USER_SUSPEND,
      Permission.PLATFORM_ROLE_MANAGE,
      Permission.PLATFORM_PROVIDER_MANAGE,
    ];

    for (const permission of forbidden) {
      expect(ROLE_PERMISSIONS[Role.SUPPORT], `SUPPORT da ${permission} bo'lmasligi kerak`).not.toContain(
        permission,
      );
    }
  });

  it('har bir ruxsat kamida bitta rolga tegishli', () => {
    /**
     * Hech kimga tegishli bo'lmagan ruxsat — o'lik kod. Undan
     * yomoni: u yo'lda ishlatilsa, o'sha yo'lga HECH KIM kira
     * olmaydi va buni faqat foydalanuvchi shikoyat qilganda
     * bilishardi.
     */
    const granted = new Set(Object.values(ROLE_PERMISSIONS).flat());
    const orphans = Object.values(Permission).filter((p) => !granted.has(p));

    expect(orphans).toEqual([]);
  });

  it('SUPER_ADMIN da hamma ruxsat bor', () => {
    expect(ROLE_PERMISSIONS[Role.SUPER_ADMIN]).toHaveLength(Object.values(Permission).length);
  });
});
