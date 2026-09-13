import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Yuqori panel qobig'i — takrorlanish qaytmasligi uchun qo'riqchi.
 *
 * Pastki menyu bilan aynan shu holat bo'lgan edi: bir xil qator
 * bir nechta faylda takrorlanardi va bittasini unutish ilovada
 * ikki xil panel paydo bo'lishi demak edi.
 */

/** `src` ichidagi barcha TSX fayllar. */
const TSX: string[] = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => `src/${name.split('\\').join('/')}`);

/** Qobiqning o'zi — u aynan shu joyni belgilaydi. */
const SHELL = 'src/components/app/header-shell.tsx';

/**
 * Reklama sayti paneli — ILOVA paneli EMAS.
 *
 * U kirmagan mehmon ko'radigan bosh sahifada turadi va butunlay
 * boshqa vazifani bajaradi: keng ekran, "Kirish" tugmasi, ochiladigan
 * menyu. Uni ilova qobig'iga majburlash noto'g'ri bo'lardi.
 */
const SAYT = 'src/components/layout/site-header.tsx';

describe("yuqori panel qobig'i", () => {
  it('fayllar topildi', () => {
    /* Ro'yxat buzilsa, quyidagi sinov bo'sh to'plam ustida "o'tardi". */
    expect(TSX.length).toBeGreaterThan(100);
  });

  it("hech kim o'zi `sticky top-0` yozmaydi", () => {
    /*
      Yagona tekshiruv SHU: yopishgan panel qo'lda yozilsa, u
      qobiqdan chetda qoladi va ilovada ikki xil panel paydo
      bo'ladi. Fayl nomiga emas, AYNAN SHU qatorga qaraymiz —
      chunki muammo nomda emas, takrorlangan qatorda.
    */
    const aybdorlar = TSX.filter((f) => f !== SHELL && f !== SAYT).filter((f) =>
      readFileSync(f, 'utf8').includes('sticky top-0'),
    );

    expect(aybdorlar).toEqual([]);
  });

  it('qobiqdan kamida uchta panel foydalanadi', () => {
    const foydalanuvchilar = TSX.filter((f) => readFileSync(f, 'utf8').includes('<HeaderShell'));

    expect(foydalanuvchilar.length).toBeGreaterThanOrEqual(3);
  });
});

describe('yuqori panel geometriyasi', () => {
  const CSS = readFileSync('src/app/globals.css', 'utf8');

  it('yuqori va pastki panel BIR XIL masofada turadi', () => {
    /*
      Ikkalasi ham `--chrome-gap` dan oladi. Alohida sonlar berilsa,
      tepada 12px, pastda 16px bo'lib qolardi — ekran qiyshiq
      ko'rinardi va buni faqat yonma-yon qo'yib payqash mumkin.
    */
    expect(CSS).toMatch(/\.header-dock\s*\{[^}]*padding:\s*var\(--chrome-gap\)/);
    expect(CSS).toMatch(/\.tabbar-dock\s*\{[^}]*var\(--chrome-gap\)/);
  });

  it("kapsula atrofidagi bo'sh joy bosishni to'smaydi", () => {
    expect(CSS).toMatch(/\.header-dock\s*\{[^}]*pointer-events:\s*none/);
    expect(CSS).toMatch(/\.header-pill\s*\{[^}]*pointer-events:\s*auto/);
  });
});
