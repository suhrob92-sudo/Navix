import { describe, expect, it } from 'vitest';

import {
  BUSINESS_KIND_LABELS,
  catalogLabel,
  formatWorkingHours,
  isOpenNow,
  mapsUrl,
} from '@/modules/business/business.types';

describe('catalogLabel', () => {
  it('restoranda "Menyu", do\'konda "Mahsulotlar"', () => {
    expect(catalogLabel('RESTAURANT')).toBe('Menyu');
    expect(catalogLabel('SHOP')).toBe('Mahsulotlar');
  });

  it('har bir tur uchun nom bor', () => {
    expect(BUSINESS_KIND_LABELS.RESTAURANT).toBeTruthy();
    expect(BUSINESS_KIND_LABELS.SHOP).toBeTruthy();
  });
});

describe('formatWorkingHours', () => {
  it('ish vaqtini yozadi', () => {
    expect(formatWorkingHours('10:00', '23:00')).toBe('10:00 — 23:00');
  });
});

describe('isOpenNow', () => {
  it('oddiy ish vaqtini hisoblaydi', () => {
    expect(isOpenNow('10:00', '23:00', '12:30')).toBe(true);
    expect(isOpenNow('10:00', '23:00', '09:59')).toBe(false);
    expect(isOpenNow('10:00', '23:00', '23:00')).toBe(false);
  });

  it('ochilish daqiqasida ochiq', () => {
    expect(isOpenNow('10:00', '23:00', '10:00')).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * "22:00 — 02:00" kabi ish vaqti bor: yopilish soati ochilishdan
   * KICHIK bo'lsa, u ertangi kunga tegishli. Oddiy taqqoslash bunday
   * joyni HAR DOIM yopiq deb ko'rsatardi.
   */
  it("kechasi orqali o'tadigan ish vaqtini hisoblaydi", () => {
    expect(isOpenNow('22:00', '02:00', '23:30')).toBe(true);
    expect(isOpenNow('22:00', '02:00', '01:00')).toBe(true);
    expect(isOpenNow('22:00', '02:00', '03:00')).toBe(false);
    expect(isOpenNow('22:00', '02:00', '12:00')).toBe(false);
  });

  it('kecha-kunduz ishlaydigan joy doim ochiq', () => {
    expect(isOpenNow('00:00', '00:00', '05:00')).toBe(true);
  });
});

describe('mapsUrl', () => {
  it('manzilni xavfsiz kodlaydi', () => {
    const url = mapsUrl('Toshkent', "Amir Temur ko'chasi 12-uy");

    expect(url.startsWith('https://maps.google.com/?q=')).toBe(true);
    // Bo'sh joy va apostrof havolani buzmasligi kerak.
    expect(url).not.toContain(' ');
    expect(url).toContain('Toshkent');
  });
});
