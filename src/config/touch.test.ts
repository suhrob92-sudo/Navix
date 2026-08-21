import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MIN_TOUCH_SIZE } from '@/config/touch';

/**
 * Barmoq nishonining chegarasi.
 *
 * Bu son IKKI joyda ishlatiladi: CSS yordamchi sinfida
 * (`globals.css` dagi `.tap-target`) va uchdan-uchgacha sinovda.
 * Ular bir-biridan ayrilib qolsa, sinov noto'g'ri narsani
 * tekshirardi va nuqson sezilmay o'tib ketardi.
 */
describe('MIN_TOUCH_SIZE', () => {
  it('44 piksel — Apple va Google tavsiyasi', () => {
    expect(MIN_TOUCH_SIZE).toBe(44);
  });

  it("CSS yordamchi sinfi HUDDI SHU sonni ishlatadi", () => {
    /*
      Bu sinov qog'ozdagi kelishuvni emas, HAQIQIY faylni
      tekshiradi: `globals.css` dagi son qo'lda o'zgartirilsa,
      shu yerda bilinadi.
    */
    const css = readFileSync('src/app/globals.css', 'utf8');
    const block = css.slice(css.indexOf('.tap-target::after'));

    expect(block).toContain(`min-width: ${MIN_TOUCH_SIZE}px`);
    expect(block).toContain(`min-height: ${MIN_TOUCH_SIZE}px`);
  });

  it('Tailwind `min-h-11` shu o\'lchamga mos', () => {
    /*
      Suriladigan idish ichidagi tugmalarda soxta qatlam KESILADI,
      shuning uchun u yerda `min-h-11` ishlatiladi. Tailwind'da
      bitta birlik 4px — ya'ni 11 × 4 = 44.
    */
    expect(11 * 4).toBe(MIN_TOUCH_SIZE);
  });
});

describe('FilterChip', () => {
  it('yagona komponent 44px balandlikni kafolatlaydi', () => {
    /*
      Bu tugma ilovaning o'ttizdan ortiq joyida ishlatiladi.
      Ilgari u har joyda QO'LDA nusxa ko'chirilgan edi va
      24-bosqichda balandlikni tuzatish uchun yigirma ikkita
      faylni tahrirlash kerak bo'ldi.

      Endi o'zgarish bitta joyda — sinov ham shu joyni qo'riqlaydi.
    */
    const source = readFileSync('src/components/ui/filter-chip.tsx', 'utf8');

    expect(source).toContain('min-h-11');
  });

  it('eski nusxalar QAYTIB kelmadi', () => {
    /*
      Nusxa ko'chirish jimgina qaytishi mumkin: kimdir yangi
      sahifada eski kodni nusxalaydi. Bu sinov shuni ushlaydi.
    */
    const files = readdirSync('src/app', { recursive: true, encoding: 'utf8' })
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => join('src/app', name));

    const copies = files.filter((file) =>
      readFileSync(file, 'utf8').includes(
        'shrink-0 snap-start items-center rounded-full border px-4 py-2 text-sm font-medium',
      ),
    );

    expect(copies).toEqual([]);
  });
});
