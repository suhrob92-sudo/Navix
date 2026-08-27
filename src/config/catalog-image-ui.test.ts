import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { CATALOG_IMAGE_OWNERS, type CatalogImageOwner } from '@/config/catalog-image';

/**
 * Har bir rasm turining EKRANI bormi.
 *
 * ── Nima uchun bu sinov bor (haqiqiy holat) ───────────────────────────
 * Server tomonda rasm tizimi yettita tur bilan ishlardi: mahsulot,
 * taom, mehmonxona, xona, restoran, do'kon, kompaniya. Ruxsatlar
 * yozilgan, sinovlar yashil, hammasi tayyor ko'rinardi.
 *
 * Lekin EKRAN faqat ikkitasiga bor edi. Natijada mehmonxonaga rasm
 * qo'yish ilova ichida umuman IMKONSIZ edi — katalogdagi
 * mehmonxonalar rasmsiz turardi.
 *
 * Bu xatoning eng yomon tomoni: u hech qayerda ko'rinmaydi. Server
 * sinovlari o'tadi, `tsc` jim, `eslint` jim. Faqat odam "nega rasm
 * qo'sha olmayapman?" deb so'raganda ma'lum bo'ladi.
 *
 * Shuning uchun endi har bir tur uchun EKRAN QAYERDA ekani shu yerda
 * yozilgan. Yangi tur qo'shgan odam bu ro'yxatga ham yozishi kerak —
 * yoki "ekran yo'q" deb ochiq aytishi kerak.
 */

interface OwnerUi {
  /** Boshqaruvchi joylashgan fayl. `null` — ekran hali yo'q. */
  file: string | null;
  why: string;
}

const OWNER_UI: Record<CatalogImageOwner, OwnerUi> = {
  PRODUCT: {
    file: 'src/app/(seller)/seller/products/[id]/seller-product-sheet.tsx',
    why: "Sotuvchi o'z mahsulotiga rasm qo'yadi.",
  },
  MENU_ITEM: {
    file: 'src/app/(merchant)/merchant/menu/[id]/merchant-menu-content.tsx',
    why: "Restoran egasi taomga rasm qo'yadi.",
  },
  SHOP: {
    file: 'src/app/(admin)/admin/businesses/business-images.tsx',
    why: "Xodim do'kon rasmini qo'ya oladi — egasi biriktirilmagan bo'lsa ham.",
  },
  RESTAURANT: {
    file: 'src/app/(admin)/admin/businesses/business-images.tsx',
    why: "Xodim restoran rasmini qo'ya oladi.",
  },
  HOTEL: {
    file: 'src/app/(admin)/admin/businesses/business-images.tsx',
    why: "Mehmonxonalarni platforma qo'shadi: `hotels` jadvalida egasi ustuni yo'q.",
  },
  HOTEL_ROOM: {
    file: 'src/app/(admin)/admin/businesses/business-images.tsx',
    why: 'Mijoz mehmonxonani emas, XONANI tanlaydi — uning rasmi alohida kerak.',
  },
  COMPANY: {
    file: null,
    why:
      "Ish beruvchi kabinetida kompaniya sozlamalari ekrani hali yo'q — " +
      "faqat vakansiyalar va arizalar bor. Ekran paydo bo'lganda rasm " +
      "boshqaruvchisi o'sha yerga qo'shiladi.",
  },
};

describe('katalog rasmlari uchun ekranlar', () => {
  it('har bir tur ro\'yxatda bor', () => {
    for (const owner of CATALOG_IMAGE_OWNERS) {
      expect(OWNER_UI[owner], `${owner} uchun ekran ko'rsatilmagan`).toBeDefined();
    }
  });

  it.each(CATALOG_IMAGE_OWNERS.filter((owner) => OWNER_UI[owner].file !== null))(
    '%s — ekrani mavjud va rasm boshqaruvchisini ishlatadi',
    (owner) => {
      const { file } = OWNER_UI[owner];

      expect(existsSync(file!), `${file} topilmadi`).toBe(true);
      expect(readFileSync(file!, 'utf8'), `${file} da CatalogImageManager yo'q`).toContain(
        'CatalogImageManager',
      );
    },
  );

  it("ekransiz turlar sababi bilan yozilgan", () => {
    const missing = CATALOG_IMAGE_OWNERS.filter((owner) => OWNER_UI[owner].file === null);

    for (const owner of missing) {
      expect(OWNER_UI[owner].why.length, `${owner}: sabab juda qisqa`).toBeGreaterThan(40);
    }

    /*
      Ro'yxat qanchalik uzayganini ko'rsatib turadi. Yangi tur ekransiz
      qo'shilsa, bu son oshadi va sinov to'xtatadi.
    */
    expect(missing.length, `Ekransiz turlar: ${missing.join(', ')}`).toBeLessThanOrEqual(1);
  });
});
