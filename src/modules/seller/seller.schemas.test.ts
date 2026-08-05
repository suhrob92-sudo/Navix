import { describe, expect, it } from 'vitest';

import {
  createSellerProductSchema,
  sellerOrderQuerySchema,
  updateSellerOrderStatusSchema,
  updateSellerProductSchema,
  updateSellerShopSchema,
} from '@/modules/seller/seller.schemas';

const CATEGORY_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3311';

function validProduct() {
  return {
    name: 'Redmi Note 14 6/128GB',
    categoryId: CATEGORY_ID,
    priceSom: 2_690_000,
    stock: 12,
  };
}

describe('createSellerProductSchema', () => {
  it("to'g'ri mahsulotni qabul qiladi", () => {
    expect(createSellerProductSchema.parse(validProduct()).name).toBe('Redmi Note 14 6/128GB');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * `slug` va `searchName` so'rovdan KELMASLIGI kerak: ikkalasini ham
   * server nomdan hisoblaydi. Sxema ularni qabul qilsa, sotuvchi
   * boshqa mahsulotning manzilini "o'g'irlashi" yoki qidiruv ustunini
   * nomga mos kelmaydigan qilib yozishi mumkin bo'lardi.
   */
  it("manzil va qidiruv ustunini qabul qilmaydi", () => {
    const parsed = createSellerProductSchema.parse({
      ...validProduct(),
      slug: 'boshqa-mahsulot',
      searchName: 'arzon telefon aksiya',
    });

    expect(parsed).not.toHaveProperty('slug');
    expect(parsed).not.toHaveProperty('searchName');
  });

  it("do'kon ID'sini so'rov tanasidan qabul qilmaydi", () => {
    // Do'kon manzildan olinadi va EGALIK bo'yicha tekshiriladi.
    const parsed = createSellerProductSchema.parse({
      ...validProduct(),
      shopId: '3f2504e0-4f89-41d3-9a0c-0305e82c3399',
    });

    expect(parsed).not.toHaveProperty('shopId');
  });

  it('nomsiz mahsulotni rad etadi', () => {
    expect(createSellerProductSchema.safeParse({ ...validProduct(), name: 'TV' }).success).toBe(false);
  });

  it('manfiy zaxirani rad etadi', () => {
    expect(createSellerProductSchema.safeParse({ ...validProduct(), stock: -1 }).success).toBe(false);
  });

  it("nol zaxirani qabul qiladi", () => {
    // "Tugagan, lekin katalogda tursin" — to'liq qonuniy holat.
    expect(createSellerProductSchema.safeParse({ ...validProduct(), stock: 0 }).success).toBe(true);
  });

  it('kasr narxni rad etadi', () => {
    // Narx TIYINGA o'giriladi; kasr so'm yaxlitlash xatosini keltiradi.
    expect(createSellerProductSchema.safeParse({ ...validProduct(), priceSom: 2_690_000.5 }).success).toBe(false);
  });

  it('haddan tashqari katta narxni rad etadi', () => {
    // Ko'pincha bu tiyinni so'm deb yozish xatosi.
    expect(createSellerProductSchema.safeParse({ ...validProduct(), priceSom: 5_000_000_000 }).success).toBe(false);
  });
});

describe('updateSellerProductSchema', () => {
  it("bo'sh o'zgarishni qabul qiladi", () => {
    // Hech narsa o'zgarmasa ham xato emas — forma shunchaki yopiladi.
    expect(updateSellerProductSchema.parse({})).toEqual({});
  });

  /**
   * `null` va `undefined` FARQI.
   *
   * `null` — "chegirmani olib tashla", `undefined` — "tegmadim".
   * Ikkalasi bir xil ishlansa, chegirmani hech qachon o'chirib
   * bo'lmasdi.
   */
  it("eski narxni o'chirish uchun null qabul qiladi", () => {
    expect(updateSellerProductSchema.parse({ oldPriceSom: null }).oldPriceSom).toBeNull();
    expect(updateSellerProductSchema.parse({}).oldPriceSom).toBeUndefined();
  });

  it("toifani o'zgartirishga ruxsat bermaydi", () => {
    // Katalogdagi joyni ko'chirish — alohida qaror, tasodifan emas.
    const parsed = updateSellerProductSchema.parse({ categoryId: CATEGORY_ID });

    expect(parsed).not.toHaveProperty('categoryId');
  });

  it('zaxirani nolga tushirishga ruxsat beradi', () => {
    expect(updateSellerProductSchema.parse({ stock: 0 }).stock).toBe(0);
  });
});

describe('updateSellerShopSchema', () => {
  it("do'konni yopishga ruxsat beradi", () => {
    expect(updateSellerShopSchema.parse({ isOpen: false }).isOpen).toBe(false);
  });

  it("narx va eng kam summani o'zgartirishga ruxsat bermaydi", () => {
    /**
     * Yetkazish narxi va eng kam buyurtma — SHARTNOMA sharti.
     * Sotuvchi uni kabinetdan o'zgartira olmasligi kerak, aks holda
     * xaridor savatni to'ldirib bo'lgach shart o'zgarib qolardi.
     */
    const parsed = updateSellerShopSchema.parse({ isOpen: true, deliveryFee: 0, minOrder: 0 });

    expect(parsed).not.toHaveProperty('deliveryFee');
    expect(parsed).not.toHaveProperty('minOrder');
  });

  it("nol kunlik yetkazishni rad etadi", () => {
    expect(updateSellerShopSchema.safeParse({ deliveryDays: 0 }).success).toBe(false);
  });
});

describe('updateSellerOrderStatusSchema', () => {
  it("ruxsat etilgan holatlarni qabul qiladi", () => {
    expect(updateSellerOrderStatusSchema.parse({ status: 'PACKING' }).status).toBe('PACKING');
  });

  it("PENDING ga qaytarishni rad etadi", () => {
    // Orqaga qaytish holatlar avtomatida ham yo'q — sxema birinchi to'siq.
    expect(updateSellerOrderStatusSchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });

  it("qisqa sababni rad etadi", () => {
    // Xaridor shu matnni ko'radi: "yo" degan sabab hech narsa aytmaydi.
    expect(updateSellerOrderStatusSchema.safeParse({ status: 'CANCELLED', reason: 'yo' }).success).toBe(false);
  });
});

describe('sellerOrderQuerySchema', () => {
  it('standart filtr — FAOL buyurtmalar', () => {
    // Sotuvchi kabinetga bajarilishi kerak ish uchun kiradi.
    expect(sellerOrderQuerySchema.parse({}).status).toBe('ACTIVE');
  });

  it("noto'g'ri do'kon ID'sini rad etadi", () => {
    expect(sellerOrderQuerySchema.safeParse({ shopId: 'texnomart' }).success).toBe(false);
  });
});
