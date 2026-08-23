import { describe, expect, it } from 'vitest';

import { GALLERY_SELECT, THUMB_SELECT, toGallery, toThumb } from '@/modules/catalog/catalog-image.select';

/**
 * Rasm o'qish bo'laklari — testlar.
 */

describe("ro'yxat bo'lagi", () => {
  it("FAQAT bitta rasm oladi", () => {
    /**
     * Eng qimmat xato: `take` unutilsa, 40 mahsulotli sahifa 320 ta
     * rasm manzilini yuklab, mobil internetda ochilmay qolardi.
     */
    expect(THUMB_SELECT.take).toBe(1);
  });

  it('TARTIB bo\'yicha saralaydi', () => {
    // Aks holda "asosiy rasm" tasodifiy tanlanardi.
    expect(THUMB_SELECT.orderBy).toEqual({ sortOrder: 'asc' });
  });

  it("galereya CHEGARASIZ va tartiblangan", () => {
    expect(GALLERY_SELECT.orderBy).toEqual({ sortOrder: 'asc' });
    expect('take' in GALLERY_SELECT).toBe(false);
  });
});

describe('aylantirish', () => {
  it("birinchi rasm qaytadi", () => {
    expect(toThumb([{ url: '/a.jpg', alt: 'A' }])).toEqual({ url: '/a.jpg', alt: 'A' });
  });

  it("rasm bo'lmasa `null`", () => {
    // Rasmsiz mahsulot bo'lishi MUMKIN — bu xato emas.
    expect(toThumb([])).toBeNull();
  });

  it('galereya maydonlari saqlanadi', () => {
    const rows = [{ id: 'x', url: '/a.jpg', alt: 'A', sortOrder: 0 }];

    expect(toGallery(rows)).toEqual(rows);
  });

  it("bo'sh galereya bo'sh ro'yxat", () => {
    expect(toGallery([])).toEqual([]);
  });
});
