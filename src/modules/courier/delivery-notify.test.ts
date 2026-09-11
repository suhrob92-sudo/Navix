import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { DeliveryKind } from '@/modules/courier/courier.types';

/**
 * Har bir topshiriq turi EGASINI topa olishi kerak.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * `findCustomerId` faqat ovqat va marketplace buyurtmalarini
 * bilardi. Posilkada u `null` qaytarardi va bildirishnoma umuman
 * yuborilmasdi.
 *
 * Natijada posilka jo'natgan odam HECH QANDAY xabar olmasdi: na
 * kuryer topilganda, na olib ketilganda, na yetkazilganda. U faqat
 * sahifani ochib tekshirib turishi mumkin edi.
 *
 * Ikkinchi xato birinchisining ostida yashiringandi:
 * `notifyOrderDelivered` da posilka uchun alohida tarmoq yo'q edi
 * va u oxirida MARKETPLACE xabarini yuborardi — `orderId: ''`
 * bilan. Ya'ni birinchi xato tuzatilganda, ikkinchisi darhol
 * ishga tushardi.
 *
 * ── Nima uchun SINOV, TypeScript emas ─────────────────────────────────
 * Ikkala xato ham TypeScript uchun mutlaqo to'g'ri kod edi:
 * `?? null` va `if/else` — hech qanday tur buzilmagan. Xato faqat
 * bildirishnoma KELMAGANIDA bilinardi va uni hech kim sezmasdi.
 *
 * To'rtinchi manba qo'shilsa (masalan dorixona), bu sinov uni
 * unutib qoldirishga yo'l qo'ymaydi.
 */
const SOURCE = readFileSync('src/modules/courier/courier.service.ts', 'utf8');

/** `findCustomerId` funksiyasining tanasi. */
function customerLookup(): string {
  const start = SOURCE.indexOf('async function findCustomerId');

  expect(start, 'findCustomerId topilmadi').toBeGreaterThan(-1);

  return SOURCE.slice(start, SOURCE.indexOf('\n}', start));
}

/** Topshiriqning barcha turlari — reyestrdan, qo'lda emas. */
const KINDS: DeliveryKind[] = ['FOOD', 'MARKET', 'PARCEL'];

/** Har bir turga tegishli bog'lanish nomi. */
const RELATION: Record<DeliveryKind, string> = {
  FOOD: 'foodOrder',
  MARKET: 'marketOrder',
  PARCEL: 'parcel',
};

describe('yetkazish bildirishnomalari', () => {
  for (const kind of KINDS) {
    it(`${kind} — egasi topiladi`, () => {
      const body = customerLookup();

      expect(body, `${RELATION[kind]} so'ralmayapti`).toContain(`${RELATION[kind]}:`);
    });
  }

  it('posilka ALOHIDA tarmoqqa ega — boshqa modul xabarini olmaydi', () => {
    /*
      `notifyOrderDelivered` ichida posilka uchun alohida shart
      bo'lishi SHART. Aks holda u oxirida marketplace xabarini
      yuborardi.
    */
    const start = SOURCE.indexOf('async function notifyOrderDelivered');

    expect(start).toBeGreaterThan(-1);

    const body = SOURCE.slice(start, SOURCE.indexOf('\n}', start));

    expect(body).toContain("'PARCEL'");
    expect(body).toContain('parcel.delivered');
  });

  it("posilkaning O'Z matnlari ishlatiladi", () => {
    /*
      Umumiy `delivery.*` xabarlari "buyurtmangizni yetkazadi" deb
      yozadi. Posilka jo'natgan odam esa hech narsa buyurtma
      qilmagan — u o'zi yuborgan.
    */
    const start = SOURCE.indexOf('async function notifyCustomer');
    const body = SOURCE.slice(start, SOURCE.indexOf('\n}', start));

    expect(body).toContain('parcel.courier_assigned');
    expect(body).toContain('parcel.picked_up');
  });
});
