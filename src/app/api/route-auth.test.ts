import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * HAR BIR API yo'li himoyalanganini tekshiradi.
 *
 * ── Nima uchun bu sinov statik (kodni O'QIYDI) ────────────────────────
 * Yo'llar ko'p va har oy yangisi qo'shiladi. Bitta yangi yo'lda
 * `requireAuth` unutilsa, hech qanday sinov yiqilmasdi: unutilgan
 * tekshiruv uchun sinov ham yozilmagan bo'lardi. Ya'ni bu — sinov
 * YOZILMAGAN holatdan himoya.
 *
 * Qoida sodda: yo'l yo avtorizatsiyani talab qiladi, yoki quyidagi
 * ro'yxatda SABABI bilan ochiq deb belgilanadi. Uchinchi yo'l yo'q.
 */

const API = join(process.cwd(), 'src/app/api');

/**
 * ATAYLAB ochiq yo'llar — har biri sababi bilan.
 *
 * Ro'yxatga qo'shish — ONGLI qaror. Yangi yo'l shu yerga tushsa,
 * kod ko'rikchisi "nega ochiq?" deb so'rashi kerak.
 */
const OCHIQ_YOLLAR: Readonly<Record<string, string>> = {
  'health/route.ts': 'Servis tirikligini tekshirish — monitoring uchun.',

  // ── Kirish va ro'yxatdan o'tish ────────────────────────────────────
  'v1/auth/login/route.ts': "Kirish — token hali yo'q.",
  'v1/auth/register/route.ts': "Ro'yxatdan o'tish — token hali yo'q.",
  'v1/auth/refresh/route.ts': 'Refresh token bilan ishlaydi, access token bilan emas.',
  'v1/auth/verify-otp/route.ts': "OTP tasdig'i — token hali yo'q.",
  'v1/auth/resend-otp/route.ts': "OTP qayta yuborish — token hali yo'q.",
  'v1/auth/password/forgot/route.ts': "Parolni unutgan odamda token bo'lmaydi.",
  'v1/auth/password/reset/route.ts': 'Bir martalik kalit bilan ishlaydi.',

  // ── Ochiq katalog: kirmasdan ko'rish mumkin ────────────────────────
  'v1/hotels/route.ts': "Mehmonxonalar ro'yxati — ochiq katalog.",
  'v1/hotels/[slug]/route.ts': 'Mehmonxona sahifasi — ochiq katalog.',
  'v1/travel/trips/route.ts': "Reyslar ro'yxati — ochiq katalog.",
  'v1/travel/trips/[scheduleId]/route.ts': 'Reys sahifasi — ochiq katalog.',
  'v1/jobs/categories/route.ts': "Vakansiya turkumlari — ochiq ma'lumotnoma.",
  'v1/jobs/cities/route.ts': "Shaharlar ro'yxati — ochiq ma'lumotnoma.",
  'v1/modules/status/route.ts': "Qaysi bo'lim ochiqligi — kirishdan oldin ham kerak.",

  // ── Bir martalik MAXFIY kalit avtorizatsiya o'rnini bosadi ─────────
  'v1/parcels/track/[token]/route.ts': "Kuzatuv kaliti — jo'natuvchi uni qabul qiluvchiga beradi.",
  'v1/taxi/share/[token]/route.ts': 'Safarni ulashish kaliti — yaqinlari kuzatishi uchun.',
  'v1/chat/invite/[code]/route.ts': 'Suhbatga taklif kodi.',
  'v1/referral/[code]/route.ts': "Taklif kodi — yangi odam hali ro'yxatdan o'tmagan.",
  'v1/files/[...key]/route.ts': "Fayl kaliti taxmin qilib bo'lmaydigan darajada uzun.",

  // ── Brauzer yuboradigan hisobotlar ─────────────────────────────────
  'v1/client-errors/route.ts': "Brauzerdagi xato hisoboti — kirmagan odamda ham bo'ladi.",
  'v1/csp-report/route.ts': 'Brauzer CSP hisoboti — uni brauzer yuboradi, odam emas.',
  'v1/waitlist/route.ts': 'Navbatga yozilish — hali foydalanuvchi emas.',
};

const QOROVULLAR = /\b(requireAuth|optionalAuth|requirePermission|requireAnyPermission|requireRole)\s*\(/;

/**
 * Izohlarni olib tashlaydi.
 *
 * ── Nima uchun kerak (haqiqiy xato) ───────────────────────────────────
 * Ilgari shunga o'xshash sinov izoh ichidagi `requireAuth` so'zini
 * ham topib, himoyalanmagan yo'lni "himoyalangan" deb sanagan edi.
 * Sinov o'tardi, teshik esa joyida qolardi.
 */
function izohsiz(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function yollar(dir: string): string[] {
  const topildi: string[] = [];

  for (const nom of readdirSync(dir)) {
    const yol = join(dir, nom);

    if (statSync(yol).isDirectory()) topildi.push(...yollar(yol));
    else if (nom === 'route.ts') topildi.push(relative(API, yol));
  }

  return topildi.sort();
}

const HAMMASI = yollar(API);

describe("API yo'llari himoyasi", () => {
  it("yo'llar topildi", () => {
    // Skaner buzilsa, qolgan sinovlar bo'sh ro'yxatda "o'tib" ketardi.
    expect(HAMMASI.length).toBeGreaterThan(200);
  });

  it("har bir yopiq yo'l avtorizatsiyani talab qiladi", () => {
    const himoyasiz = HAMMASI.filter((yol) => {
      if (yol in OCHIQ_YOLLAR) return false;

      return !QOROVULLAR.test(izohsiz(readFileSync(join(API, yol), 'utf8')));
    });

    expect(himoyasiz, `Bu yo'llarda avtorizatsiya yo'q:\n${himoyasiz.join('\n')}`).toEqual([]);
  });

  it("ochiq yo'llar ro'yxatida ESKIRGAN yozuv yo'q", () => {
    /*
      O'chirilgan yoki ko'chirilgan yo'l ro'yxatda qolsa, ertaga
      o'sha nomdagi yangi yo'l tekshiruvsiz o'tib ketardi.
    */
    const yoq = Object.keys(OCHIQ_YOLLAR).filter((yol) => !HAMMASI.includes(yol));

    expect(yoq, `Bu yo'llar endi mavjud emas:\n${yoq.join('\n')}`).toEqual([]);
  });

  it("har bir ochiq yo'lning SABABI yozilgan", () => {
    const sababsiz = Object.entries(OCHIQ_YOLLAR)
      .filter(([, sabab]) => sabab.trim().length < 15)
      .map(([yol]) => yol);

    expect(sababsiz).toEqual([]);
  });

  it("admin yo'llari ROL yoki RUXSAT talab qiladi, oddiy kirish yetarli emas", () => {
    /*
      ── Nima uchun alohida qoida ────────────────────────────────────
      `requireAuth` faqat "kirganmi" deb so'raydi. Admin yo'lida bu
      yetarli emas: har qanday ro'yxatdan o'tgan odam kirgan bo'ladi.

      Buzilsa: oddiy foydalanuvchi admin paneliga kirib, boshqalarning
      ma'lumotini ko'rardi.
    */
    const kuchsiz = HAMMASI.filter((yol) => yol.startsWith('v1/admin/')).filter((yol) => {
      const src = izohsiz(readFileSync(join(API, yol), 'utf8'));

      return !/\b(requirePermission|requireAnyPermission|requireRole)\s*\(/.test(src);
    });

    expect(kuchsiz, `Admin yo'llari faqat kirishni tekshiradi:\n${kuchsiz.join('\n')}`).toEqual([]);
  });
});
