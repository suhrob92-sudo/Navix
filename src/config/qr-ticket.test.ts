import { describe, expect, it } from 'vitest';

import { QR_ERROR_LEVEL, canShowQr, ticketQrPayload } from '@/config/qr-ticket';

/**
 * Chipta QR kodi — testlar.
 *
 * QR kodini istalgan odam skanerlashi mumkin, shuning uchun uning
 * ICHIDA nima borligi xavfsizlik masalasi.
 */

const TICKET = 'NVX-T-20260810-A1B2C3';

describe('QR ichidagi matn', () => {
  it('chipta raqamini beradi', () => {
    expect(ticketQrPayload(TICKET)).toBe(TICKET);
  });

  it('katta harfga keltiradi', () => {
    // Skaner natijasini solishtirish oson bo'lsin.
    expect(ticketQrPayload('nvx-t-1')).toBe('NVX-T-1');
  });

  it("ortiqcha bo'shliq olib tashlanadi", () => {
    expect(ticketQrPayload('  NVX-T-1  ')).toBe('NVX-T-1');
  });

  it('SHAXSIY ma\'lumot tushmaydi', () => {
    /**
     * QR ni yonidagi odam ham skanerlashi mumkin. Unda ism,
     * telefon yoki summa bo'lmasligi SHART.
     */
    const payload = ticketQrPayload(TICKET);

    expect(payload).not.toMatch(/\+998/);
    expect(payload).not.toMatch(/so'm/);
    expect(payload).toBe(TICKET);
  });

  it('faqat chipta raqamidan iborat — boshqa hech narsa', () => {
    // Matn uzunligi raqam uzunligiga TENG: ichida qo'shimcha yo'q.
    expect(ticketQrPayload(TICKET)).toHaveLength(TICKET.length);
  });
});

describe('QR qachon ko\'rsatiladi', () => {
  it('amaldagi chiptada — ha', () => {
    expect(canShowQr('CONFIRMED')).toBe(true);
  });

  it('BEKOR qilingan chiptada — yo\'q', () => {
    /**
     * Amal qilmaydigan chiptaning QR kodi nazoratchini ham,
     * yo'lovchini ham chalg'itardi.
     */
    expect(canShowQr('CANCELLED')).toBe(false);
  });

  it('tugagan safarda — yo\'q', () => {
    expect(canShowQr('COMPLETED')).toBe(false);
  });
});

describe('sozlama', () => {
  it("xatoga chidamlilik o'rtacha", () => {
    // "L" quyosh ostida o'qilmaydi, "H" kichik ekranda zichlashadi.
    expect(QR_ERROR_LEVEL).toBe('M');
  });
});
