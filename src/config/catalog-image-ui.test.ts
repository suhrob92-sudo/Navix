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
  /** Boshqaruvchi joylashgan fayllar. Bo'sh ro'yxat — ekran hali yo'q. */
  files: readonly string[];
  why: string;
}

const OWNER_UI: Record<CatalogImageOwner, OwnerUi> = {
  PRODUCT: {
    files: ['src/app/(seller)/seller/products/[id]/seller-product-sheet.tsx'],
    why: "Sotuvchi o'z mahsulotiga rasm qo'yadi.",
  },
  MENU_ITEM: {
    files: ['src/app/(merchant)/merchant/menu/[id]/merchant-menu-content.tsx'],
    why: "Restoran egasi taomga rasm qo'yadi.",
  },
  SHOP: {
    files: [
      'src/app/(seller)/seller/seller-dashboard-content.tsx',
      'src/app/(admin)/admin/businesses/business-images.tsx',
    ],
    why:
      "Egasi o'z do'koniga rasm qo'yadi; xodim ham qo'ya oladi — egasi " +
      "biriktirilmagan yoki yordam kerak bo'lgan holat uchun.",
  },
  RESTAURANT: {
    files: [
      'src/app/(merchant)/merchant/merchant-dashboard-content.tsx',
      'src/app/(admin)/admin/businesses/business-images.tsx',
    ],
    why: "Egasi o'z restoraniga rasm qo'yadi; xodim ham qo'ya oladi.",
  },
  HOTEL: {
    files: ['src/app/(admin)/admin/businesses/business-images.tsx'],
    why: "Mehmonxonalarni platforma qo'shadi: `hotels` jadvalida egasi ustuni yo'q.",
  },
  HOTEL_ROOM: {
    files: ['src/app/(admin)/admin/businesses/business-images.tsx'],
    why: 'Mijoz mehmonxonani emas, XONANI tanlaydi — uning rasmi alohida kerak.',
  },
  COMPANY: {
    files: [],
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

  it.each(CATALOG_IMAGE_OWNERS.filter((owner) => OWNER_UI[owner].files.length > 0))(
    '%s — ekrani mavjud va rasm boshqaruvchisini ishlatadi',
    (owner) => {
      for (const file of OWNER_UI[owner].files) {
        expect(existsSync(file), `${file} topilmadi`).toBe(true);

        /*
          Ekran boshqaruvchini TO'G'RIDAN-TO'G'RI yoki umumiy panel
          orqali ishlatishi mumkin — ikkalasi ham to'g'ri.
        */
        const source = readFileSync(file, 'utf8');
        const usesManager =
          source.includes('CatalogImageManager') || source.includes('CatalogImagePanel');

        expect(usesManager, `${file} da rasm boshqaruvchisi yo'q`).toBe(true);
      }
    },
  );

  it("ekransiz turlar sababi bilan yozilgan", () => {
    const missing = CATALOG_IMAGE_OWNERS.filter((owner) => OWNER_UI[owner].files.length === 0);

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
