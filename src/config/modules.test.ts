import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APP_MODULES,
  getModulesByCategory,
  getPublicModules,
  getQuickServices,
  matchModuleByIntent,
  MODULE_CATEGORIES,
  ModuleStatus,
} from '@/config/modules';

/**
 * Modullar reyestri — ilovaning "xaritasi".
 *
 * ── Nima uchun bu sinovlar KERAK ──────────────────────────────────────
 * Reyestrdagi yozuv va haqiqiy sahifa bir-biridan ajralib ketishi
 * mumkin: modul yozilib bo'lgan, lekin reyestrda "rejada" bo'lib
 * qolgan yoki manzili o'zgargan. Ikkalasi ham JIMGINA sodir bo'ladi —
 * kod ishlayveradi, faqat foydalanuvchi ishlayotgan bo'limni "tez
 * orada" deb ko'radi yoki bosganda 404 ga tushadi.
 *
 * Aynan shu ikki xato ilovada topildi: chat `/chat` ga ishora qilardi
 * (bunday sahifa yo'q), AI yordamchi esa pastki menyuda turgan holda
 * "rejada" deb belgilangan edi.
 */

const APP_DIR = join(process.cwd(), 'src', 'app');

/**
 * Berilgan manzil uchun `page.tsx` bormi.
 *
 * Yo'lni to'g'ridan-to'g'ri tekshirib bo'lmaydi: Next.js "route
 * group" papkalari — `(cabinet)`, `(admin)` — manzilga KIRMAYDI.
 * Shuning uchun daraxt bo'ylab yuriladi va guruh papkalari
 * o'tkazib yuboriladi.
 */
function pageExists(href: string): boolean {
  const segments = href.split('/').filter(Boolean);

  function walk(dir: string, rest: string[]): boolean {
    if (rest.length === 0) return existsSync(join(dir, 'page.tsx'));

    const [head, ...tail] = rest;

    if (existsSync(join(dir, head))) {
      if (walk(join(dir, head), tail)) return true;
    }

    // Guruh papkasi (`(cabinet)`) manzilda ko'rinmaydi — ichiga kiramiz.
    for (const entry of readdirSync(dir)) {
      if (!entry.startsWith('(') || !statSync(join(dir, entry)).isDirectory()) continue;

      if (walk(join(dir, entry), rest)) return true;
    }

    return false;
  }

  return walk(APP_DIR, segments);
}

describe('APP_MODULES — yozuvlarning butunligi', () => {
  it('id lar takrorlanmaydi', () => {
    const ids = APP_MODULES.map((module) => module.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('manzillar takrorlanmaydi', () => {
    const hrefs = APP_MODULES.map((module) => module.href);

    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("har bir modulda nom, tavsif va kamida bitta ibora bor", () => {
    for (const entry of APP_MODULES) {
      expect(entry.name.length, entry.id).toBeGreaterThan(0);
      expect(entry.description.length, entry.id).toBeGreaterThan(0);
      expect(entry.aiIntents.length, entry.id).toBeGreaterThan(0);
    }
  });

  it("guruh ro'yxatdan tanlanadi", () => {
    const known = new Set(MODULE_CATEGORIES.map((category) => category.id));

    for (const entry of APP_MODULES) {
      expect(known.has(entry.category), entry.id).toBe(true);
    }
  });

  it("tezkor xizmatlar tartibi takrorlanmaydi", () => {
    const orders = getQuickServices().map((module) => module.quickOrder);

    expect(new Set(orders).size).toBe(orders.length);
  });
});

/**
 * ENG MUHIM SINOV.
 *
 * "Ishlamoqda" deb belgilangan modulning sahifasi BO'LISHI SHART.
 * Aks holda foydalanuvchi qidiruvdan yoki AI javobidan bosib, 404
 * sahifaga tushardi — va bu ilovaning buzilganini bildiradi.
 */
describe('LIVE modullarning sahifasi mavjud', () => {
  for (const entry of APP_MODULES.filter((item) => item.status === ModuleStatus.LIVE)) {
    it(`${entry.id} → ${entry.href}`, () => {
      expect(pageExists(entry.href)).toBe(true);
    });
  }
});

/**
 * Teskari tomoni: sahifasi YO'Q modul "ishlamoqda" bo'lib qolmasin.
 *
 * Bu sinov yuqoridagining nusxasi emas: u tekshiruv funksiyasining
 * o'zi to'g'ri ishlashini isbotlaydi. Funksiya har doim `true`
 * qaytarsa, yuqoridagi sinovlar ma'nosiz bo'lardi.
 */
describe('pageExists tekshiruvi ishonchli', () => {
  it("mavjud sahifani topadi", () => {
    expect(pageExists('/dashboard')).toBe(true);
    expect(pageExists('/messages')).toBe(true);
    expect(pageExists('/wallet/history')).toBe(true);
  });

  it("mavjud bo'lmagan sahifani topmaydi", () => {
    expect(pageExists('/chat')).toBe(false);
    expect(pageExists('/taxi')).toBe(false);
    expect(pageExists('/bunday-sahifa-yoq')).toBe(false);
  });
});

/**
 * Xizmat modullari foydalanuvchiga ko'rsatilmaydi.
 *
 * Admin panel reyestrda turadi (manzili bir joyda bo'lishi uchun),
 * lekin ochiq sahifada, qidiruvda va AI javoblarida chiqmasligi
 * kerak.
 */
describe('Xizmat modullari yashirin', () => {
  it("ochiq ro'yxatda admin yo'q", () => {
    expect(getPublicModules().some((module) => module.id === 'admin')).toBe(false);
  });

  it('guruh bo’yicha ro’yxatda ham yo’q', () => {
    const platform = getModulesByCategory('platform');

    expect(platform.some((module) => module.id === 'admin')).toBe(false);
    // Boshqa platforma modullari esa joyida qoladi.
    expect(platform.some((module) => module.id === 'chat')).toBe(true);
  });

  it('AI yordamchi admin panelga havola bermaydi', () => {
    expect(matchModuleByIntent('admin panel')).toBeUndefined();
    expect(matchModuleByIntent('boshqaruv paneli')).toBeUndefined();
  });

  it('oddiy so’rovlar avvalgidek ishlaydi', () => {
    expect(matchModuleByIntent('ovqat buyurtma qil')?.id).toBe('food');
    expect(matchModuleByIntent('xabar yoz')?.id).toBe('chat');
  });
});
