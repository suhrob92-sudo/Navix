import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * ULASHILGAN safarda nozik ma'lumot bo'lmasin.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Ulashish havolasi KIRISHSIZ ochiladi. Ya'ni havolani olgan
 * istalgan odam — va uni qayta uzatgan istalgan odam — nima
 * ko'rsatilsa, hammasini ko'radi.
 *
 * Eng oson xato: `RideView` ni o'sha holicha qaytarish. U ishlardi,
 * ekran chiroyli chiqardi va hech qanday sinov yiqilmasdi. Faqat
 * havolada yo'lovchining telefon raqami, narxi va haydovchining
 * raqami ochiq turardi.
 *
 * Shuning uchun ulashish uchun ALOHIDA, ataylab kambag'al tur
 * yasalgan (`SharedRideView`). Bu sinov uning kambag'al qolishini
 * qo'riqlaydi.
 */

const TYPES_FILE = 'src/modules/taxi/taxi.types.ts';
const SERVICE_FILE = 'src/modules/taxi/taxi.service.ts';

/** `SharedRideView` interfeysining matni. */
function sharedViewSource(): string {
  const source = readFileSync(TYPES_FILE, 'utf8');
  const start = source.indexOf('export interface SharedRideView {');

  expect(start, 'SharedRideView topilmadi').toBeGreaterThan(-1);

  return source.slice(start, source.indexOf('\n}', start));
}

describe('ulashilgan safar', () => {
  /**
   * TAQIQLANGAN maydonlar.
   *
   * Har biri havolani olgan begona odamga tegishli emas:
   *  · telefon — haydovchining shaxsiy raqami;
   *  · narx — yo'lovchining moliyaviy ma'lumoti;
   *  · baho va bekor qilish sababi — safar ichidagi gap.
   */
  it.each(['phone', 'priceTiyin', 'rating', 'cancelReason', 'rider', 'tariff'])(
    "`%s` maydoni ulashilgan ko'rinishda yo'q",
    (field) => {
      expect(sharedViewSource()).not.toContain(field);
    },
  );

  it('kuzatish uchun zarur maydonlar bor', () => {
    const view = sharedViewSource();

    for (const field of ['status', 'from', 'to', 'driver', 'driverLocation']) {
      expect(view, field).toContain(field);
    }
  });

  /**
   * Joylashuv FAQAT safar davomida beriladi.
   *
   * Tugagandan keyin ham bersak, havolani olgan odam haydovchining
   * keyingi harakatini kuzatib turardi — bu uning shaxsiy
   * ma'lumoti va u bunga rozilik bermagan.
   */
  it("tugagan safarda joylashuv berilmaydi", () => {
    const source = readFileSync(SERVICE_FILE, 'utf8');
    const block = source.slice(source.indexOf('export async function getSharedRide'));

    expect(block).toContain('const active = isRideActive(row.status)');
    expect(block).toContain('active && row.driverLat !== null');
  });

  /**
   * Ulashish kaliti TAXMIN QILIB BO'LMAYDIGAN uzunlikda.
   *
   * Qisqa kalit havolani chiroyli qilardi, lekin uni saralab topish
   * mumkin bo'lardi: kimdir ketma-ket urinib, begona odamning
   * safarini ochib ko'rardi.
   */
  it("kalit tasodifiy va uzun", () => {
    const source = readFileSync(SERVICE_FILE, 'utf8');
    const block = source.slice(source.indexOf('export async function createRideShare'));

    expect(block).toMatch(/randomBytes\((\d+)\)/);

    const size = Number(block.match(/randomBytes\((\d+)\)/)?.[1] ?? 0);

    expect(size).toBeGreaterThanOrEqual(16);
  });

  /**
   * Ulashish faqat YO'LOVCHINIKI.
   *
   * Safar uning safari va uni kim kuzatishini u hal qiladi.
   * Haydovchi mijozning yo'lini begona odamga ocha olmasligi kerak.
   */
  it("faqat yo'lovchi ulasha oladi", () => {
    const source = readFileSync(SERVICE_FILE, 'utf8');
    const block = source.slice(source.indexOf('export async function createRideShare'));

    expect(block).toContain('riderId: userId');
  });
});
