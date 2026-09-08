import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Yordamchi joylashuv KUTIB qotib qolmasligi kerak.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * `getCurrentPosition` ning `timeout` sozlamasi FAQAT ruxsat
 * berilgandan KEYIN sanay boshlaydi. Odam ruxsat oynasiga javob
 * bermasa (yoki brauzer uni jimgina bloklasa), na muvaffaqiyat, na
 * xato funksiyasi chaqiriladi.
 *
 * Natijada yordamchi ABADIY "..." bo'lib qolardi — hatto joylashuv
 * umuman kerak bo'lmagan "balansim qancha" savolida ham.
 *
 * Bu sinov shu himoyaning olib tashlanmasligini qulflaydi. Uni
 * brauzer sinovi bilan ushlab bo'lmaydi: xato aynan javob
 * KELMAGANDA yuz beradi.
 */
const SOURCE = readFileSync('src/app/(cabinet)/assistant/assistant-content.tsx', 'utf8');

describe('yordamchi va joylashuv', () => {
  it('joylashuv uchun OZ kutish muddati bor', () => {
    expect(SOURCE).toContain('LOCATION_WAIT_MS');
    /* Taymer aynan `getCurrentPosition` yonida ishga tushishi kerak. */
    expect(SOURCE).toMatch(/setTimeout\(.*LOCATION_WAIT_MS\)/);
  });

  it('javob IKKI marta qaytmaydi', () => {
    /*
      Taymer va brauzer javobi ikkalasi ham `resolve` chaqirishi
      mumkin. Qulf bo'lmasa, ikkinchisi jimgina tashlab yuborilardi
      — bugun zararsiz, ertaga esa yozilgan kodga qarab xato.
    */
    expect(SOURCE).toContain('settled');
  });

  it('muddat 10 soniyadan oshmaydi', () => {
    const match = SOURCE.match(/const LOCATION_WAIT_MS = ([\d_]+);/);

    expect(match).not.toBeNull();
    expect(Number(match![1].replace(/_/g, ''))).toBeLessThanOrEqual(10_000);
  });
});
