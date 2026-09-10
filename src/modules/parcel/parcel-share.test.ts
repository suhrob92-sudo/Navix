import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Kuzatish havolasi MAXFIY ma'lumot ochmasligi kerak.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Havola istalgan odamning qo'liga tushishi mumkin: uni WhatsApp'da
 * yuborishadi, u guruhga ko'chib o'tadi, keyin ekran suratiga
 * tushadi.
 *
 * `SharedParcelView` ataylab KAMBAG'AL qilib yasalgan. Lekin ertaga
 * kimdir "qulay bo'lsin" deb unga telefon raqamini qo'shishi
 * mumkin — va bu TYPESCRIPT uchun mutlaqo to'g'ri kod bo'ladi.
 * Xato faqat havola tarqalgandan keyin bilinardi.
 *
 * Shu sababli qoida SINOV bilan qulflanadi.
 *
 * Xuddi shunday sinov taksi moduli uchun ham bor
 * (`ride-share.test.ts`) — u yerda ham bir xil xavf.
 */
const TYPES = readFileSync('src/modules/parcel/parcel.types.ts', 'utf8');
const SERVICE = readFileSync('src/modules/parcel/parcel.service.ts', 'utf8');

/** `SharedParcelView` turining ichki qismini ajratib olamiz. */
function sharedViewBody(): string {
  const start = TYPES.indexOf('export interface SharedParcelView {');

  expect(start, 'SharedParcelView topilmadi').toBeGreaterThan(-1);

  const end = TYPES.indexOf('\n}', start);

  return TYPES.slice(start, end);
}

/** `getSharedParcel` funksiyasining tanasi. */
function sharedQueryBody(): string {
  const start = SERVICE.indexOf('export async function getSharedParcel');

  expect(start, 'getSharedParcel topilmadi').toBeGreaterThan(-1);

  const end = SERVICE.indexOf('\n}', start);

  return SERVICE.slice(start, end);
}

describe('posilka kuzatish havolasi', () => {
  /**
   * Bu maydonlar havolada BO'LMASLIGI kerak.
   *
   * Har biri alohida sabab bilan:
   *  · telefon    — begona odam jo'natuvchiga yoki qabul
   *                 qiluvchiga qo'ng'iroq qila olmasligi kerak;
   *  · narx       — bu ikki odam o'rtasidagi gap;
   *  · aniq manzil — uyning eshigigacha ko'rsatish xavfli;
   *  · ichki ID   — u bilan API'ga murojaat qilib bo'lmasligi kerak;
   *  · bekor sababi — shaxsiy izoh bo'lishi mumkin.
   */
  const FORBIDDEN = [
    'recipientPhone',
    'recipientName',
    'senderId',
    'priceTiyin',
    'courierFeeTiyin',
    'fromAddress',
    'toAddress',
    'fromNote',
    'toNote',
    'cancelReason',
    'walletTransactionId',
  ];

  for (const field of FORBIDDEN) {
    it(`turda "${field}" yo'q`, () => {
      expect(sharedViewBody()).not.toContain(field);
    });

    it(`bazadan "${field}" umuman SO'RALMAYDI`, () => {
      /*
        Turda bo'lmasligi yetarli emas: maydon so'rovda qolsa,
        u jurnalga yoki xato xabariga tushib ketishi mumkin.
      */
      expect(sharedQueryBody()).not.toContain(field);
    });
  }

  it('posilkaning `id` si qaytarilmaydi', () => {
    /*
      `id:` aniq izlanadi — `parcelNumber` va boshqa nomlarda ham
      "id" harflari uchraydi.
    */
    expect(sharedViewBody()).not.toMatch(/^\s*id\s*:/m);
    expect(sharedQueryBody()).not.toMatch(/^\s*id:\s*true/m);
  });

  it('kuryerning FAMILIYASI ham qaytarilmaydi', () => {
    /*
      Ism kuryerni tanish uchun yetarli. Familiya esa uni
      ijtimoiy tarmoqlarda topish imkonini berardi.
    */
    expect(sharedQueryBody()).not.toContain('lastName');
  });

  it("kalit bo'yicha qidiriladi, ID bo'yicha emas", () => {
    expect(sharedQueryBody()).toContain('trackToken: token');
  });

  it('kalit yetarlicha uzun', () => {
    /*
      Qisqa kalitni saralab topish mumkin bo'lardi: kimdir ketma-ket
      urinib, begona odamning posilkasini ochib ko'rardi.
    */
    const match = SERVICE.match(/randomBytes\((\d+)\)[\s\S]{0,40}base64url/);

    expect(match, 'kalit yasash topilmadi').not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(16);
  });
});
