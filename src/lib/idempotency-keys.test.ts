import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * MIJOZ KALITI hech qachon "yalang'och" saqlanmasin.
 *
 * ── Nima uchun bu sinov bor (auditda topilgan xato) ───────────────────
 * `wallet_transactions.idempotencyKey` ustuni butun baza bo'ylab
 * yagona. Ilgari mijoz yuborgan kalit o'sha holicha shu ustunga
 * yozilardi. Natijada:
 *
 * · bir xil kalit yuborgan ikki foydalanuvchidan ikkinchisi
 *   BIRINCHISINING yozuvini javobda ko'rardi — summasi va balansi
 *   bilan, o'zining puli esa qo'shilmasdan;
 * · server kalitlari ("market-refund-{buyurtmaId}") ham shu ustunda
 *   turgani uchun, buyurtma ID'sini biladigan odam o'sha kalitni
 *   oldindan BAND qilib qo'yishi va xaridorning pul qaytarishini
 *   buzishi mumkin edi.
 *
 * Yechim: `clientIdempotencyKey(userId, kalit)`.
 *
 * ── Nima uchun matn bo'yicha tekshiriladi ─────────────────────────────
 * Bu xato "noto'g'ri yozish" emas, UNUTISH: yangi pul moduli yozilganda
 * `input.idempotencyKey` ni to'g'ridan-to'g'ri uzatish eng tabiiy
 * harakat va u ishlaydi ham — teshik faqat ikkinchi foydalanuvchi
 * paydo bo'lganda ochiladi. Shuning uchun qo'riqchi kodni o'qiydi.
 */

/** Pul bilan ishlaydigan modullar — kalit aynan shu yerda yasaladi. */
const MONEY_SERVICES = [
  'src/modules/wallet/wallet.service.ts',
  'src/modules/payment/payment.service.ts',
  'src/modules/food/food.service.ts',
  'src/modules/market/market.service.ts',
  'src/modules/hotel/hotel.service.ts',
  'src/modules/travel/travel.service.ts',
  'src/modules/parcel/parcel.service.ts',
] as const;

/**
 * Taqiqlangan naqsh: mijoz kaliti o'zgartirilmasdan uzatilmoqda.
 *
 * Aynan shu ko'rinish auditgacha yettita modulda turgan edi.
 */
const RAW_KEY_PATTERN = /idempotencyKey:\s*(input\.idempotencyKey|rawKey)\b/;

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('mijoz idempotentlik kaliti', () => {
  it.each(MONEY_SERVICES)('%s — kalitni yalang\'och uzatmaydi', (path) => {
    const source = read(path);
    const match = RAW_KEY_PATTERN.exec(source);

    expect(
      match?.[0] ?? null,
      `${path}: kalitni "clientIdempotencyKey(userId, ...)" orqali uzating`,
    ).toBeNull();
  });

  it.each(MONEY_SERVICES)('%s — kalitni egasiga bog\'laydi', (path) => {
    const source = read(path);

    /*
      Modul mijozdan kalit olsa, uni albatta egasiga bog'lashi kerak.
      Faqat server kalitlari ishlatiladigan modul (masalan kuryer haqi)
      bu talabga tushmaydi — u `input.idempotencyKey` ga umuman
      tegmaydi.
    */
    if (!source.includes('input.idempotencyKey')) return;

    expect(source, `${path}: "clientIdempotencyKey" ishlatilmagan`).toContain('clientIdempotencyKey');
  });

  it("server kalitlari obyektga bog'langan — mijozdan olinmaydi", () => {
    /*
      Pul QAYTARISH kaliti hech qachon mijozdan kelmasligi kerak:
      u qaytarilayotgan obyekt ID'sidan yasaladi, shunda bitta
      obyektga bitta qaytarish bo'ladi.
    */
    const refundKeys = [
      { path: 'src/modules/market/market.service.ts', key: '`market-refund-${order.id}`' },
      { path: 'src/modules/market/return.service.ts', key: '`market-return-${request.id}`' },
      { path: 'src/modules/food/food.service.ts', key: '`food-refund-${order.id}`' },
      { path: 'src/modules/hotel/hotel.service.ts', key: '`booking-refund-${booking.id}`' },
      { path: 'src/modules/travel/travel.service.ts', key: '`ticket-refund-${ticket.id}`' },
      { path: 'src/modules/parcel/parcel.service.ts', key: '`parcel-refund-${parcel.id}`' },
    ];

    for (const { path, key } of refundKeys) {
      expect(read(path), `${path}: ${key} kaliti topilmadi`).toContain(key);
    }
  });
});
