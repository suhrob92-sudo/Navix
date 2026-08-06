import { describe, expect, it } from 'vitest';

import { ApiClientError, isServerUnreachable, toUserMessage } from '@/lib/api-client';

/**
 * ── Nima uchun bu farq shunchalik muhim (HAQIQIY XATO) ────────────────
 * Ilgari ilova "sessiya yo'q" va "serverga yetib bo'lmadi" holatlarini
 * bir xil ko'rardi. Ikkalasida ham foydalanuvchi kirish sahifasiga
 * haydalardi.
 *
 * Baza o'chib qolganda esa oqibati og'ir edi: brauzer kirish
 * sahifasiga o'tardi, `proxy.ts` esa cookie borligini ko'rib uni
 * ilovaga qaytarardi — cheksiz aylanish va ekranda ABADIY skelet.
 *
 * Shuning uchun bu funksiya alohida va test bilan qulflangan.
 */
describe('isServerUnreachable — serverga yetib bo\'ldimi', () => {
  it("tarmoq xatosi — yetib bo'lmadi", () => {
    // `status: 0` — javob umuman kelmadi (muddat tugadi yoki aloqa uzildi).
    expect(isServerUnreachable(new ApiClientError(0, 'SERVICE_UNAVAILABLE', 'Aloqa yo\'q'))).toBe(true);
  });

  it("brauzerning TypeError'i ham — yetib bo'lmadi", () => {
    // `fetch` tarmoq uzilganda aynan shu xatoni tashlaydi.
    expect(isServerUnreachable(new TypeError('Failed to fetch'))).toBe(true);
  });

  it("500 — server buzilgan, ya'ni yetib bo'lmadi", () => {
    // Baza o'chiq bo'lsa server aynan 500 qaytaradi.
    expect(isServerUnreachable(new ApiClientError(500, 'INTERNAL_ERROR', 'Xatolik'))).toBe(true);
  });

  it('503 — xizmat vaqtincha ishlamayapti', () => {
    expect(isServerUnreachable(new ApiClientError(503, 'SERVICE_UNAVAILABLE', 'Band'))).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * 401 — bu server ANIQ javobi: "sessiyangiz yo'q". Bunda odam
   * haqiqatan tizimdan chiqqan va uni kirish sahifasiga yuborish
   * TO'G'RI. Agar bu ham "aloqa yo'q" deb hisoblansa, chiqib ketgan
   * odam hech qachon qayta kira olmasdi.
   */
  it("401 — sessiya yo'q, bu boshqa holat", () => {
    expect(isServerUnreachable(new ApiClientError(401, 'UNAUTHORIZED', 'Sessiya tugagan'))).toBe(false);
  });

  it("403 — ruxsat yo'q, bu ham boshqa holat", () => {
    expect(isServerUnreachable(new ApiClientError(403, 'FORBIDDEN', 'Ruxsat yo\'q'))).toBe(false);
  });

  it('400 va 404 — oddiy xatolar', () => {
    expect(isServerUnreachable(new ApiClientError(400, 'VALIDATION_ERROR', 'Xato'))).toBe(false);
    expect(isServerUnreachable(new ApiClientError(404, 'NOT_FOUND', 'Topilmadi'))).toBe(false);
  });

  it('429 — juda ko\'p so\'rov, server ishlayapti', () => {
    // Server javob berdi, demak unga yetib borildi.
    expect(isServerUnreachable(new ApiClientError(429, 'RATE_LIMITED', 'Kuting'))).toBe(false);
  });

  it("noma'lum xato — yetib bo'lmadi deb hisoblanmaydi", () => {
    // Aks holda dasturdagi oddiy xato "aloqa yo'q" ekranini chiqarardi
    // va haqiqiy sabab yashirinib qolardi.
    expect(isServerUnreachable(new Error('kutilmagan'))).toBe(false);
    expect(isServerUnreachable('matn')).toBe(false);
    expect(isServerUnreachable(null)).toBe(false);
  });
});

describe('toUserMessage', () => {
  it('API xabarini o\'zgartirmasdan beradi', () => {
    expect(toUserMessage(new ApiClientError(404, 'NOT_FOUND', 'Vakansiya topilmadi'))).toBe('Vakansiya topilmadi');
  });

  it("tarmoq xatosiga o'zbekcha xabar beradi", () => {
    expect(toUserMessage(new TypeError('Failed to fetch'))).toContain('Internetga ulanishda muammo');
  });

  it("noma'lum xatoga ham xabar topiladi", () => {
    expect(toUserMessage({ nimadir: true })).toContain('Kutilmagan xatolik');
  });
});
