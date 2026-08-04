import { describe, expect, it } from 'vitest';

import { toSearchText } from '@/lib/search';

describe('toSearchText', () => {
  it('apostrofning barcha turlarini olib tashlaydi', () => {
    // Bazadagi nom va foydalanuvchi matni BIR XIL natija berishi shart —
    // aks holda "lagmon" so'zi "Lag'mon" taomini hech qachon topmaydi.
    expect(toSearchText("Lag'mon")).toBe('lagmon');
    expect(toSearchText('Lagʻmon')).toBe('lagmon');
    expect(toSearchText('Lagʼmon')).toBe('lagmon');
    expect(toSearchText('Lag`mon')).toBe('lagmon');
    expect(toSearchText('Lag’mon')).toBe('lagmon');
    expect(toSearchText('Lagmon')).toBe('lagmon');
  });

  it("apostrof so'zni ikkiga bo'lib yubormaydi", () => {
    // Agar apostrof probelga aylansa "ko k choy" bo'lib qolardi.
    expect(toSearchText("Ko'k choy")).toBe('kok choy');
    expect(toSearchText("To'y oshi")).toBe('toy oshi');
  });

  it('tinish belgilarini probelga aylantiradi', () => {
    expect(toSearchText('Manti (5 dona)')).toBe('manti 5 dona');
    expect(toSearchText('Cola 0.5')).toBe('cola 0 5');
    expect(toSearchText('Non & Kofe')).toBe('non kofe');
  });

  it("ortiqcha probellarni yig'ishtiradi", () => {
    expect(toSearchText('  KATTA   SET  ')).toBe('katta set');
  });

  it("bo'sh matnda bo'sh qator qaytaradi", () => {
    expect(toSearchText('')).toBe('');
    expect(toSearchText('!!!')).toBe('');
  });

  it('lotin bo\'lmagan harflarni saqlaydi', () => {
    // \p{L} — har qanday tildagi harf. Kirill yozuvi o'girilmaydi,
    // lekin yo'qolib ham ketmaydi.
    expect(toSearchText('Лагмон')).toBe('лагмон');
  });
});
