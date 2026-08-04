import { describe, expect, it } from 'vitest';

import { cleanValue } from '../scripts/env-setup.mjs';

/**
 * Bu testlarning har biri HAQIQATDA uchragan xatoga asoslangan.
 *
 * Telefonda uzun manzilni nusxalash — eng ko'p xato chiqadigan joy:
 * qavs qolib ketadi, nomi ikki marta yoziladi, qo'shtirnoq yopilmaydi.
 * `cleanValue` shularning hammasini tozalashi kerak.
 */

describe('cleanValue', () => {
  const REDIS = 'rediss://default:token@infinite-monster-222348.upstash.io:6379';
  const POSTGRES = 'postgresql://user:parol@ep-dawn-mud-pooler.eu-central-1.aws.neon.tech/neondb';

  it("toza qiymatga tegmaydi", () => {
    expect(cleanValue(REDIS, 'REDIS_URL')).toBe(REDIS);
  });

  it("namunadan qolgan qavslarni olib tashlaydi", () => {
    // "<Neon manzili>" o'rniga qavslar bilan birga qo'yilgan.
    expect(cleanValue(`<${POSTGRES}>`, 'DATABASE_URL')).toBe(POSTGRES);
  });

  it("qo'shtirnoqlarni olib tashlaydi", () => {
    expect(cleanValue(`"${REDIS}"`, 'REDIS_URL')).toBe(REDIS);
    expect(cleanValue(`'${REDIS}'`, 'REDIS_URL')).toBe(REDIS);
  });

  it("nomi bilan birga nusxalanganini tushunadi", () => {
    // Upstash "REDIS_URL=..." ko'rinishida beradi.
    expect(cleanValue(`REDIS_URL="${REDIS}"`, 'REDIS_URL')).toBe(REDIS);
  });

  it("nomi IKKI MARTA yozilganini ham tuzatadi", () => {
    // Aynan shu xato uchradi: qavs ichiga to'liq qator qo'yilgan.
    expect(cleanValue(`<REDIS_URL="${REDIS}">`, 'REDIS_URL')).toBe(REDIS);
  });

  it("yopilmagan qo'shtirnoqni tozalaydi", () => {
    expect(cleanValue(`"${REDIS}`, 'REDIS_URL')).toBe(REDIS);
    expect(cleanValue(`${REDIS}"`, 'REDIS_URL')).toBe(REDIS);
  });

  it('ortiqcha probellarni olib tashlaydi', () => {
    expect(cleanValue(`   ${REDIS}   `, 'REDIS_URL')).toBe(REDIS);
  });

  it("nom kichik harfda yozilgan bo'lsa ham tushunadi", () => {
    expect(cleanValue(`redis_url=${REDIS}`, 'REDIS_URL')).toBe(REDIS);
  });

  it("manzil ichidagi belgilarga TEGMAYDI", () => {
    // Parolda "<" yoki tirnoq bo'lishi mumkin — ular o'rtada, uchida emas.
    const tricky = 'postgresql://user:pa<ro>l@host/db?sslmode=require';
    expect(cleanValue(tricky, 'DATABASE_URL')).toBe(tricky);
  });

  it("bo'sh qiymatda bo'sh qator qaytaradi", () => {
    expect(cleanValue('', 'REDIS_URL')).toBe('');
    expect(cleanValue('   ', 'REDIS_URL')).toBe('');
  });
});
