import { describe, expect, it } from 'vitest';

import { rebookHref } from '@/modules/taxi/taxi.types';

/**
 * "Shu yo'nalishga yana" havolasi.
 *
 * ── Nima uchun bu sinov kerak ─────────────────────────────────────────
 * Havola manzillarni SO'ROV PARAMETRLARIDA uzatadi. Bitta maydon
 * tushib qolsa, ekran yarim to'lardi va odam manzil tanlaganini
 * o'ylab, aslida boshqa joyga ketardi.
 *
 * Ustiga, manzil matnida bo'shliq va apostrof bo'ladi ("Amir Temur
 * ko'chasi, 12") — ular kodlanmasa havola buzilardi.
 */

const RIDE = {
  from: { latitude: 41.3255, longitude: 69.2345, address: 'Chorsu bozori' },
  to: { latitude: 41.3111, longitude: 69.2797, address: "Uy — Amir Temur ko'chasi, 12" },
};

describe('rebookHref', () => {
  it('taksi ekraniga olib boradi', () => {
    expect(rebookHref(RIDE).startsWith('/taxi?')).toBe(true);
  });

  it('OLTALA maydonni ham uzatadi', () => {
    const params = new URLSearchParams(rebookHref(RIDE).split('?')[1]);

    for (const key of ['fromLat', 'fromLng', 'fromAddress', 'toLat', 'toLng', 'toAddress']) {
      expect(params.get(key), key).toBeTruthy();
    }
  });

  it('koordinatalarni aniq uzatadi', () => {
    const params = new URLSearchParams(rebookHref(RIDE).split('?')[1]);

    expect(Number(params.get('fromLat'))).toBe(RIDE.from.latitude);
    expect(Number(params.get('toLng'))).toBe(RIDE.to.longitude);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * O'zbek manzillarida apostrof, vergul va bo'shliq bor. Ular
   * kodlanmasa, havola birinchi bo'shliqda kesilardi va manzil
   * yarim yetib borardi.
   */
  it("apostrof va bo'shliqli manzilni buzmaydi", () => {
    const params = new URLSearchParams(rebookHref(RIDE).split('?')[1]);

    expect(params.get('toAddress')).toBe("Uy — Amir Temur ko'chasi, 12");
  });

  it('manzil matnini ham uzatadi — faqat koordinata yetarli emas', () => {
    const params = new URLSearchParams(rebookHref(RIDE).split('?')[1]);

    /*
      Matnsiz ekranda "Xaritadagi nuqta (41.31, 69.28)" chiqardi —
      holbuki odam "Uy" deb saqlagan joyga ketmoqda.
    */
    expect(params.get('fromAddress')).toBe('Chorsu bozori');
  });
});
