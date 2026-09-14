import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/modules/auth/password.service';

describe('Parol xizmati', () => {
  it("hash ochiq parolni o'zida saqlamaydi", async () => {
    const password = 'parol1234';
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(hash.startsWith('$2')).toBe(true);
  });

  it("bir xil parol har safar boshqa hash beradi (tuz qo'shiladi)", async () => {
    const first = await hashPassword('parol1234');
    const second = await hashPassword('parol1234');

    expect(first).not.toBe(second);
  });

  it("to'g'ri parolni tasdiqlaydi", async () => {
    const hash = await hashPassword('parol1234');

    expect(await verifyPassword('parol1234', hash)).toBe(true);
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const hash = await hashPassword('parol1234');

    expect(await verifyPassword('boshqa1234', hash)).toBe(false);
  });

  it("hash bo'lmasa false qaytaradi va yiqilmaydi", async () => {
    expect(await verifyPassword('parol1234', null)).toBe(false);
  });

  it('katta-kichik harfni farqlaydi', async () => {
    const hash = await hashPassword('Parol1234');

    expect(await verifyPassword('parol1234', hash)).toBe(false);
  });

  /**
   * ── HAQIQIY XATO: buzuq hash SERVERNI YIQITARDI ──────────────────────
   * Bazada noto'g'ri shakldagi hash bo'lsa (masalan `"xx"`),
   * `bcrypt.compare` xato tashlardi va kirish so'rovi
   * "500 Serverda kutilmagan xatolik" bilan tugardi.
   *
   * Bu ikki tomondan yomon:
   *  1. Odam "parol noto'g'ri" emas, tushunarsiz javob olardi;
   *  2. Hujumchi javob KODIGA qarab bunday hisoblarni ajrata olardi
   *     (oddiy hisobda 401, buzuqda 500) — ya'ni javobning o'zi
   *     belgi berardi.
   *
   * Bu xato mahalliy bazada haqiqatan uchradi va o'lchab topildi.
   */
  it('BUZUQ hash yiqitmaydi — oddiy rad javob beradi', async () => {
    /*
      ── Nima uchun AYNAN 60 belgi ────────────────────────────────────
      `bcrypt.compare` qisqa matnni darhol "mos emas" deb qaytaradi va
      xato tashlamaydi. Xato FAQAT uzunlik to'g'ri (60 belgi), lekin
      ichki shakli buzuq bo'lganda chiqadi — aynan shunday yozuv
      bazada topildi.

      Birinchi yozgan sinovim qisqa matnlar bilan edi va u tuzatishsiz
      HAM o'tib ketdi. Ya'ni u hech narsani o'lchamasdi.
    */
    const buzuqlar = [
      'xx'.padEnd(60, 'a'),
      '$9y$12$'.padEnd(60, 'a'),
      'not-a-hash'.padEnd(60, 'z'),
      /* Qisqa yozuvlar ham rad etilishi kerak. */
      'xx',
      '',
    ];

    for (const buzuq of buzuqlar) {
      expect(buzuq.length === 60 || buzuq.length < 60).toBe(true);
      expect(await verifyPassword('parol1234', buzuq)).toBe(false);
    }
  });
}, 30_000);
