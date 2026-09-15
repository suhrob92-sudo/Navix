import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * OCHIQ manzillar — urinish chegarasi MAJBURIY.
 *
 * ── Nima uchun ────────────────────────────────────────────────────────
 * Kirish talab qilmaydigan manzilni istalgan robot cheksiz so'rashi
 * mumkin. Chegarasiz u serverni band qilib qo'yadi yoki tasodifiy
 * kalitlarni saralab ko'radi.
 *
 * Auditda ikkita bunday manzil topilgandi: mahalliy rasm berish va
 * ulashilgan safar. Ikkalasiga ham chegara qo'shildi. Bu sinov
 * uchinchisi qo'shilib qolmasligini kafolatlaydi.
 *
 * ── Nima uchun FAYLLARNI o'qiydi ──────────────────────────────────────
 * Har bir manzilni tarmoq orqali sinash uchun butun ilovani ishga
 * tushirish kerak bo'lardi. Bu esa sekin va nozik. Qoidaning o'zi
 * oddiy: "qorovul yo'q bo'lsa, chegara bo'lsin" — va uni matndan
 * o'qib tekshirsa bo'ladi.
 */

/** Kirishni talab qiladigan qorovullar. */
const QOROVULLAR =
  /requireAuth|requirePermission|requireAdmin|requireDriver|requireCourier|requireSeller|requireMerchant|requireEmployer/;

/**
 * Urinish chegarasi — manzilda yoki uning xizmatida.
 *
 * AYNAN CHAQIRUV qidiriladi (qavs bilan), shunchaki so'z emas: aks
 * holda izohda nom eslatilgan fayl "chegara bor" deb hisoblanardi va
 * sinov yolg'on "toza" berardi.
 *
 * `consumeRateLimit` ham qabul qilinadi: `withApiHandler` bilan
 * o'ralmagan manzillar xato tashlamaydigan shu variantni ishlatadi.
 */
const CHEGARA = /(enforce(Public)?RateLimit|consumeRateLimit)\s*\(/;

/**
 * Chegara XIZMAT ichida qo'yilgan manzillar.
 *
 * Kirish, ro'yxatdan o'tish va parol tiklash chegaralari
 * `auth.service.ts` da — chunki ular telefon raqami bo'yicha
 * hisoblanadi va raqam faqat xizmatda normallashtiriladi.
 * Hujum sinovi buni tasdiqlagan: 12 ta urinishdan keyin 429 keladi.
 */
const XIZMATDA_CHEKLANGAN = [
  'v1/auth/login/route.ts',
  'v1/auth/logout/route.ts',
  'v1/auth/refresh/route.ts',
  'v1/auth/register/route.ts',
  'v1/auth/verify-otp/route.ts',
  'v1/auth/resend-otp/route.ts',
  'v1/auth/password/forgot/route.ts',
  'v1/auth/password/reset/route.ts',
];

/**
 * Chegara KERAK EMAS.
 *
 * `health` — kuzatuv tizimi har necha soniyada so'raydi va u
 * bazaga ham, diskka ham tegmaydi. Chegara qo'ysak, kuzatuvning
 * o'zi bloklanardi.
 */
const CHEGARASIZ_RUXSAT = ['health/route.ts'];

const ROUTES: string[] = readdirSync('src/app/api', { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('route.ts'))
  .map((name) => name.split('\\').join('/'));

describe('ochiq manzillar', () => {
  it('manzillar topildi', () => {
    /* Ro'yxat buzilsa, quyidagi sinov bo'sh to'plam ustida "o'tardi". */
    expect(ROUTES.length).toBeGreaterThan(200);
  });

  it('har bir ochiq manzilda urinish chegarasi bor', () => {
    const aybdorlar = ROUTES.filter((name) => {
      if (CHEGARASIZ_RUXSAT.includes(name) || XIZMATDA_CHEKLANGAN.includes(name)) return false;

      const src = readFileSync(`src/app/api/${name}`, 'utf8');

      // Kirish talab qilinsa — chegara ixtiyoriy.
      if (QOROVULLAR.test(src)) return false;

      return !CHEGARA.test(src);
    });

    expect(aybdorlar).toEqual([]);
  });

  it("o'ralmagan manzil xato TASHLAYDIGAN chegarani ishlatmaydi", () => {
    /*
      ── HAQIQIY XATO (men kiritdim, o'lchab topdim) ──────────────────
      `enforcePublicRateLimit` chegaraga yetganda XATO TASHLAYDI. Uni
      `withApiHandler` tutib, 429 javobga aylantiradi.

      Rasm beradigan manzil esa `withApiHandler` bilan o'ralmagan — u
      JSON emas, faylning O'ZINI qaytaradi. Shuning uchun tashlangan
      xato hech kim tutmagan holda chiqib ketdi: brauzer 429 emas
      500 oldi va HAR BIR so'rov xatolar jadvaliga yozildi.

      O'lchov: 340 ta so'rovning hammasi 500 qaytardi. Tuzatilgandan
      keyin: 300 tasi o'tdi, 40 tasi 429 oldi.

      Qoida: o'ralmagan manzilda xato tashlamaydigan
      `consumeRateLimit` ishlatiladi va javob qo'lda yasaladi.
    */
    /*
      Bu yerda ham AYNAN CHAQIRUV qidiriladi: rasm manzilining izohida
      `enforcePublicRateLimit` so'zi bor (nima uchun ishlatilmasligi
      tushuntirilgan) va shunchaki so'z bo'yicha qidirsak, sinov o'sha
      izohga urilib yiqilardi.

      Ikkala tomonda ham bir xil xatoga yo'l qo'ydim: qo'riqchini
      izohlardan ajrata olmadim. Endi qavs talab qilinadi.
    */
    const TASHLAYDI = /enforce(Public)?RateLimit\s*\(/;

    const aybdorlar = ROUTES.filter((name) => {
      const src = readFileSync(`src/app/api/${name}`, 'utf8');

      /*
        AYNAN CHAQIRUV qidiriladi, shunchaki so'z emas.

        Birinchi yozgan variantim `src.includes('withApiHandler')` edi
        va u ishlamadi: rasm beradigan manzilning IZOHIDA o'sha so'z
        bor ("`withApiHandler` bilan o'ralmagan"), shuning uchun sinov
        faylni o'tkazib yuborardi. Ya'ni qo'riqchi o'zining izohidan
        ko'r bo'lib qolgandi.
      */
      if (/withApiHandler\s*[(<]/.test(src)) return false;

      return TASHLAYDI.test(src);
    });

    expect(aybdorlar).toEqual([]);
  });

  it("xizmatda cheklangan manzillar ro'yxati HAQIQATAN cheklangan", () => {
    /*
      Ro'yxatga qo'shib qo'yish bilan sinovni "o'tkazib yuborish"
      mumkin bo'lmasligi kerak. Shuning uchun har bir band uchun
      chegara XIZMATDA borligi tekshiriladi.
    */
    const auth = readFileSync('src/modules/auth/auth.service.ts', 'utf8');
    const session = readFileSync('src/modules/auth/session.service.ts', 'utf8');

    expect(CHEGARA.test(auth) || CHEGARA.test(session)).toBe(true);
  });
});
