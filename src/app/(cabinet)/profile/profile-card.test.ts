import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Profil kartochkasi — bosilishi SHART.
 *
 * ── HAQIQIY MUAMMO ────────────────────────────────────────────────────
 * Kartochkada odamning ismi, raqami va rasmi turadi. Ularni
 * o'zgartirmoqchi bo'lgan odam avval AYNAN shu kartochkani bosadi —
 * boshqa hech qayerga qaramaydi. Lekin kartochka oddiy `div` edi va
 * bosishga javob bermasdi.
 */
const SRC = readFileSync('src/app/(cabinet)/profile/profile-content.tsx', 'utf8');

describe('profil kartochkasi', () => {
  it('sozlamalarga olib boradi', () => {
    expect(SRC).toContain('href="/profile/settings"');
  });

  it('qoplama butun kartochkani egallaydi', () => {
    /*
      `absolute inset-0` bo'lmasa, havola faqat o'z matni qadar
      joyni egallardi va kartochkaning qolgan qismi yana
      bosilmasdi — ya'ni xato QAYTARDI, lekin ko'rinishda hech
      narsa o'zgarmasdi.
    */
    expect(SRC).toMatch(/href="\/profile\/settings"[\s\S]{0,200}absolute inset-0/);
  });

  it('`@nom` havolasi qoplamadan YUQORIDA turadi', () => {
    /*
      Qoplama matn ustida turadi. `@nom` havolasiga `z-20`
      berilmasa, u qoplama ostida qolardi va bosilmasdi:
      ko'rinishda havola, amalda esa oddiy yozuv. Eng jim
      xatolardan biri.
    */
    expect(SRC).toMatch(/href=\{`\/u\/\$\{data\.username\}`\}[\s\S]{0,200}z-20/);
  });
});
