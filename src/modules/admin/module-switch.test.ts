import { describe, expect, it } from 'vitest';

import { APP_MODULES, getModuleById } from '@/config/modules';
import { resolveModuleForPath } from '@/modules/admin/module-switch.service';

/**
 * Bo'limlarni yopish tizimi uchun sinovlar.
 *
 * ── Nima uchun aynan BULAR sinaladi ───────────────────────────────────
 * Bu yerdagi xato jimgina yashaydi va faqat eng yomon paytda —
 * bo'lim yopilgan kunda — ma'lum bo'ladi:
 *
 *  · manzil noto'g'ri bog'lansa, yopilgan bo'lim ishlayveradi
 *    (himoya aldamchi bo'ladi);
 *  · prefiks boshqa bo'limga tegib ketsa, ochiq bo'lim yopiladi
 *    (butun modul bekordan ishlamay qoladi).
 */

describe('manzilni bo\'limga bog\'lash', () => {
  it("bo'lim manzilini topadi", () => {
    expect(resolveModuleForPath('/api/v1/food/orders')?.id).toBe('food');
    expect(resolveModuleForPath('/api/v1/market/shops')?.id).toBe('marketplace');
    expect(resolveModuleForPath('/api/v1/hotels')?.id).toBe('hotel');
    expect(resolveModuleForPath('/api/v1/travel/trips')?.id).toBe('travel');
    expect(resolveModuleForPath('/api/v1/parcels')?.id).toBe('delivery');
  });

  it("bo'limga tegishli bo'lmagan manzilda `null`", () => {
    expect(resolveModuleForPath('/api/v1/auth/login')).toBeNull();
    expect(resolveModuleForPath('/api/v1/wallet')).toBeNull();
    expect(resolveModuleForPath('/api/v1/profile')).toBeNull();
  });

  it('admin manzillari HECH QACHON yopilmaydi', () => {
    /**
     * Bu eng muhim shart: agar admin manzili biror bo'limga
     * bog'lanib qolsa, o'sha bo'lim yopilgach uni QAYTA OCHIB
     * bo'lmasdi — panelning o'zi ishlamay qolardi.
     */
    expect(resolveModuleForPath('/api/v1/admin/modules')).toBeNull();
    expect(resolveModuleForPath('/api/v1/admin/modules/food')).toBeNull();
    expect(resolveModuleForPath('/api/v1/modules/status')).toBeNull();
  });

  it("prefiks BO'LAK bo'yicha taqqoslanadi", () => {
    // "market" prefiksi "marketing" ga tegmasligi kerak.
    expect(resolveModuleForPath('/api/v1/marketing/campaigns')).toBeNull();
    expect(resolveModuleForPath('/api/v1/foodie')).toBeNull();
  });

  it('API bo\'lmagan manzil tegmaydi', () => {
    expect(resolveModuleForPath('/food')).toBeNull();
    expect(resolveModuleForPath('/')).toBeNull();
    expect(resolveModuleForPath('')).toBeNull();
  });

  it('versiya raqami muhim emas', () => {
    expect(resolveModuleForPath('/api/v2/food/orders')?.id).toBe('food');
  });
});

describe("bo'limlar reyestri", () => {
  const switchable = APP_MODULES.filter((entry) => entry.canDisable === true);

  it("yopish mumkin bo'lgan bo'limlar bor", () => {
    expect(switchable.length).toBeGreaterThan(3);
  });

  it("har bir yopiladigan bo'limda API manzili ko'rsatilgan", () => {
    /**
     * API manzilisiz bo'lim yopilsa, kartochka yo'qoladi — lekin
     * so'rovlar o'tib ketaveradi. Bu himoyaning eng yomon turi:
     * ko'rinishda bor, amalda yo'q.
     */
    for (const entry of switchable) {
      expect(entry.apiPrefixes, `${entry.id} da apiPrefixes yo'q`).toBeDefined();
      expect(entry.apiPrefixes!.length).toBeGreaterThan(0);
    }
  });

  it("bir manzil ikki bo'limga tegishli emas", () => {
    const seen = new Set<string>();

    for (const entry of APP_MODULES) {
      for (const prefix of entry.apiPrefixes ?? []) {
        expect(seen.has(prefix), `"${prefix}" ikki marta ishlatilgan`).toBe(false);
        seen.add(prefix);
      }
    }
  });

  it('ilovaning ASOSIY qismlarini yopib bo\'lmaydi', () => {
    /**
     * Bu ro'yxat ataylab QO'LDA yozilgan.
     *
     * Kelajakda kimdir hamyonga `canDisable: true` qo'shsa, sinov
     * yiqiladi va u nima qilayotganini qayta o'ylaydi.
     */
    for (const id of ['wallet', 'orders', 'chat', 'security', 'admin', 'shop', 'courier']) {
      expect(getModuleById(id)?.canDisable, `${id} yopiladigan bo'lib qolgan`).not.toBe(true);
    }
  });
});
