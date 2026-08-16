import { describe, expect, it } from 'vitest';

import {
  ATTACHMENT_KINDS,
  ATTACHMENT_KIND_CONFIG,
  MAX_ATTACHMENTS,
  isAttachmentKind,
} from '@/config/attachments';

/**
 * Biriktirma turlari — YAGONA manba.
 *
 * Bu fayl oltita joyda ishlatiladi: tanlash oynasi, lentadagi tugma,
 * to'liq ekranli pleyer, statistika, qidiruv va server tekshiruvi.
 * Undagi xatolik hammasiga bir vaqtda tarqaladi.
 */
describe('ATTACHMENT_KIND_CONFIG', () => {
  it('HAR BIR tur uchun ta\'rif bor', () => {
    /*
      Yangi tur qo'shilib, ta'rifi unutilsa, ekran chizishda
      yiqilardi — va bu faqat o'sha turdagi biriktirma bo'lgan
      postda ko'rinardi.
    */
    for (const kind of ATTACHMENT_KINDS) {
      expect(ATTACHMENT_KIND_CONFIG[kind]).toBeDefined();
    }

    expect(Object.keys(ATTACHMENT_KIND_CONFIG)).toHaveLength(ATTACHMENT_KINDS.length);
  });

  it('har bir turda nom, fe\'l va belgi bor', () => {
    for (const kind of ATTACHMENT_KINDS) {
      const config = ATTACHMENT_KIND_CONFIG[kind];

      expect(config.label.length).toBeGreaterThan(0);
      expect(config.action.length).toBeGreaterThan(0);
      expect(config.placeholder.length).toBeGreaterThan(0);
      expect(config.icon).toBeDefined();
    }
  });

  it('harakat fe\'llari TAKRORLANMAYDI', () => {
    /*
      Tomoshabin tugmani bosishdan oldin nima bo'lishini bilishi
      kerak. Hammasi "Ko'rish" bo'lsa, tugma hech narsa va'da
      qilmasdi va kutilmagan sahifaga olib borardi.
    */
    const actions = ATTACHMENT_KINDS.map((kind) => ATTACHMENT_KIND_CONFIG[kind].action);

    expect(new Set(actions).size).toBe(actions.length);
  });

  it('havolalar TO\'G\'RI bo\'limga olib boradi', () => {
    expect(ATTACHMENT_KIND_CONFIG.PRODUCT.href('choy')).toBe('/marketplace/p/choy');
    expect(ATTACHMENT_KIND_CONFIG.MENU_ITEM.href('osh-markazi')).toBe('/food/osh-markazi');
    expect(ATTACHMENT_KIND_CONFIG.RESTAURANT.href('osh-markazi')).toBe('/food/osh-markazi');
    expect(ATTACHMENT_KIND_CONFIG.VACANCY.href('dasturchi')).toBe('/jobs/v/dasturchi');
    expect(ATTACHMENT_KIND_CONFIG.HOTEL.href('hilton')).toBe('/hotel/hilton');
  });

  it('havola HAR DOIM ichki manzil', () => {
    /*
      Tashqi manzil qo'yilsa, tugma odamni ilovadan olib chiqib
      ketardi — bunday narsa ta'rifda sezilmay o'tib ketishi juda
      oson.
    */
    for (const kind of ATTACHMENT_KINDS) {
      expect(ATTACHMENT_KIND_CONFIG[kind].href('x')).toMatch(/^\//);
    }
  });
});

describe('isAttachmentKind', () => {
  it('haqiqiy turni tan oladi', () => {
    expect(isAttachmentKind('PRODUCT')).toBe(true);
    expect(isAttachmentKind('HOTEL')).toBe(true);
  });

  it('begona qiymatni rad etadi', () => {
    // Qiymat manzildan keladi — uni istalgan odam o'zgartira oladi.
    expect(isAttachmentKind('SPACESHIP')).toBe(false);
    expect(isAttachmentKind('product')).toBe(false);
    expect(isAttachmentKind('')).toBe(false);
  });
});

describe('MAX_ATTACHMENTS', () => {
  it('chegara bor va u kichik', () => {
    /*
      Chegarasiz video ostiga o'nlab tugma qo'yish mumkin bo'lardi va
      u videoni emas, reklama ro'yxatini ko'rsatardi.
    */
    expect(MAX_ATTACHMENTS).toBeGreaterThan(0);
    expect(MAX_ATTACHMENTS).toBeLessThanOrEqual(10);
  });
});
