import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Safar suhbati MAVJUD chat modulidan foydalanadi.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Eng oson yo'l — taksi uchun alohida xabar tizimi yozish bo'lardi:
 * o'z jadvali, o'z ekrani. U tezroq yozilardi, lekin natijada
 * foydalanuvchida IKKITA xabarlar ro'yxati paydo bo'lardi va u
 * haydovchining xabarini qayerdan qidirishni bilmasdi.
 *
 * Bu sinov taksi modulining chatga BOG'LANGANIDA qolishini
 * qo'riqlaydi: agar kimdir kelajakda parallel tizim yozsa, bu yerda
 * to'xtatiladi.
 */

const TAXI_SERVICE = 'src/modules/taxi/taxi.service.ts';

describe('safar suhbati', () => {
  it('mavjud chat xizmatini chaqiradi', () => {
    const source = readFileSync(TAXI_SERVICE, 'utf8');

    expect(source).toContain("from '@/modules/chat/chat.service'");
    expect(source).toContain('openServiceConversation');
  });

  /**
   * Taksi moduli SUHBAT jadvaliga to'g'ridan-to'g'ri yozmasligi kerak.
   *
   * `pairKey` mantiqi, nusxadan himoya va a'zolik qoidalari chat
   * modulida turadi. Ikkinchi joydan yozilsa, ular chetlab
   * o'tilardi va bir odam bilan ikkita suhbat paydo bo'lishi
   * mumkin edi.
   */
  it("suhbat jadvaliga o'zi yozmaydi", () => {
    const source = readFileSync(TAXI_SERVICE, 'utf8');

    expect(source).not.toMatch(/prisma\.conversation\.(create|upsert)/);
    expect(source).not.toMatch(/tx\.conversation\.(create|upsert)/);
  });

  /**
   * Ruxsat TAKSI modulida tekshiriladi.
   *
   * Chat moduli safar haqida hech narsa bilmaydi — "bu ikkovi bir
   * safarning tomonimi" degan savolga faqat shu modul javob bera
   * oladi. Tekshiruv yo'qolsa, istalgan odam istalgan kishiga
   * suhbat ochib olardi.
   */
  it('safar egaligini tekshiradi', () => {
    const source = readFileSync(TAXI_SERVICE, 'utf8');
    const block = source.slice(source.indexOf('export async function openRideChat'));

    expect(block).toContain('riderId: userId');
    expect(block).toContain('driver: { userId }');
    expect(block).toContain('isRideActive');
  });
});
