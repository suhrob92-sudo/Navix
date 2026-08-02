import { describe, expect, it } from 'vitest';

import {
  APP_MODULES,
  MODULE_CATEGORIES,
  getModuleById,
  getModulesByCategory,
  matchModuleByIntent,
} from '@/config/modules';

describe('Modullar reyestri', () => {
  it("har bir modul id'si noyob", () => {
    const ids = APP_MODULES.map((module) => module.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('har bir modul mavjud guruhga tegishli', () => {
    const categoryIds = new Set(MODULE_CATEGORIES.map((category) => category.id));

    for (const appModule of APP_MODULES) {
      expect(categoryIds.has(appModule.category), `${appModule.id} noma'lum guruhda`).toBe(true);
    }
  });

  it('har bir modulda manzil va kamida bitta AI niyati bor', () => {
    for (const appModule of APP_MODULES) {
      expect(appModule.href.startsWith('/'), `${appModule.id} manzili "/" bilan boshlanmagan`).toBe(true);
      expect(appModule.aiIntents.length, `${appModule.id} uchun AI niyati yo'q`).toBeGreaterThan(0);
    }
  });

  it('getModuleById mavjud modulni topadi', () => {
    expect(getModuleById('taxi')?.name).toBe('Taksi');
    expect(getModuleById('mavjud-emas')).toBeUndefined();
  });

  it('getModulesByCategory faqat shu guruh modullarini qaytaradi', () => {
    const mobility = getModulesByCategory('mobility');

    expect(mobility.length).toBeGreaterThan(0);
    expect(mobility.every((module) => module.category === 'mobility')).toBe(true);
  });

  describe('AI niyatini aniqlash', () => {
    it("to'g'ridan-to'g'ri buyruqni tanidi", () => {
      expect(matchModuleByIntent('taxi chaqir')?.id).toBe('taxi');
      expect(matchModuleByIntent('ish top')?.id).toBe('jobs');
    });

    it('gap ichidagi buyruqni ham tanidi', () => {
      expect(matchModuleByIntent('Iltimos, menga pizza buyurtma qil')?.id).toBe('food');
    });

    it("katta-kichik harfga bog'liq emas", () => {
      expect(matchModuleByIntent('TAXI CHAQIR')?.id).toBe('taxi');
    });

    it('mos kelmasa undefined qaytaradi', () => {
      expect(matchModuleByIntent('bugun ob-havo qanday')).toBeUndefined();
      expect(matchModuleByIntent('   ')).toBeUndefined();
    });
  });
});
