import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Pastki menyu qobig'i — takrorlanish qaytmasligi uchun qo'riqchi.
 *
 * ── HAQIQIY MUAMMO ────────────────────────────────────────────────────
 * Ilovada to'qqizta pastki menyu bor (mijoz, feed, haydovchi, kuryer,
 * sotuvchi, restoran, ish beruvchi, admin, kabinet). Ularning
 * o'ralgan qismi BIR XIL yozilgandi:
 *
 *     glass-chrome pb-safe fixed inset-x-0 bottom-0 z-40 border-t
 *
 * Menyuni suzuvchi kapsulaga aylantirish uchun to'qqizta faylni qo'lda
 * tahrirlash kerak bo'lardi. Bittasi unutilsa — ilovaning bir burchagida
 * eski, yopishgan menyu qolib ketardi va buni faqat tasodifan ko'rish
 * mumkin edi.
 *
 * Endi qobiq bitta: `TabBarShell`. Bu sinov yangi menyu qo'shgan odam
 * uni yana qo'lda yozib qo'ymasligini kafolatlaydi.
 */

/** Barcha pastki menyu fayllari — nom qoidasi bo'yicha topiladi. */
const FILES: string[] = readdirSync('src/components', { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('-tab-bar.tsx'))
  .map((name) => `src/components/${name.split('\\').join('/')}`)
  .concat('src/components/layout/cabinet-nav.tsx');

/** Qobiqning o'zi tekshiruvdan tashqarida — u aynan shu joyni belgilaydi. */
const SHELL = 'src/components/app/tab-bar-shell.tsx';

describe("pastki menyu qobig'i", () => {
  it('menyu fayllari topildi', () => {
    /*
      Agar glob buzilsa, quyidagi sinovlar BO'SH ro'yxat ustida
      ishlab, jimgina "o'tdi" deb chiqardi.
    */
    expect(FILES.length).toBeGreaterThanOrEqual(9);
  });

  it("hech bir menyu o'zi `fixed bottom-0` yozmaydi", () => {
    const aybdorlar = FILES.filter((f) => f !== SHELL).filter((f) => {
      const src = readFileSync(f, 'utf8');
      return src.includes('fixed inset-x-0 bottom-0');
    });

    expect(aybdorlar).toEqual([]);
  });

  it('har bir menyu qobiqdan foydalanadi', () => {
    const aybdorlar = FILES.filter((f) => !readFileSync(f, 'utf8').includes('<TabBarShell'));

    expect(aybdorlar).toEqual([]);
  });

  it('qobiq kapsula sinflarini beradi', () => {
    const src = readFileSync(SHELL, 'utf8');

    expect(src).toContain('tabbar-dock');
    expect(src).toContain('tabbar-pill');
  });
});

/**
 * Geometriya — YAGONA manba.
 *
 * Kapsula ekran chetidan uzilgani uchun sahifa oxiri va savat paneli
 * ham aynan shu masofani hisobga olishi kerak. Qo'lda yozilgan son
 * (masalan `pb-28`) telefon "iyagi"ni ham, kapsula masofasini ham
 * bilmaydi — natijada oxirgi qator menyu ostida qolardi.
 */
describe('pastki menyu geometriyasi', () => {
  const CSS = readFileSync('src/app/globals.css', 'utf8');

  it("kapsula masofasi o'zgaruvchida", () => {
    expect(CSS).toMatch(/--chrome-gap:\s*[\d.]+rem;/);
  });

  it('sahifa oxiri kapsula masofasini hisobga oladi', () => {
    expect(CSS).toMatch(/\.pb-tabbar\s*\{[^}]*var\(--chrome-gap\)/);
  });

  it('suzuvchi panel kapsula masofasini hisobga oladi', () => {
    expect(CSS).toMatch(/\.above-tabbar\s*\{[^}]*var\(--chrome-gap\)/);
  });

  it("kapsula atrofidagi bo'sh joy bosishni to'smaydi", () => {
    /*
      Bu eng jim xato bo'lardi: menyu ko'rinishda kichrayadi, lekin
      uning ko'rinmas to'rtburchagi ekranning pastki 90 pikselini
      egallab turadi va ostidagi tugmalar bosilmaydi.
    */
    expect(CSS).toMatch(/\.tabbar-dock\s*\{[^}]*pointer-events:\s*none/);
    expect(CSS).toMatch(/\.tabbar-pill\s*\{[^}]*pointer-events:\s*auto/);
  });
});
