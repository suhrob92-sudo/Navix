import { describe, expect, it } from 'vitest';

import {
  MAX_COMPARE_ROOMS,
  buildComparison,
  canAddToCompare,
  cheapestIndex,
  toggleCompare,
} from '@/config/room-compare';
import type { HotelRoomView } from '@/modules/hotel/hotel.types';

/**
 * Xona taqqoslash — testlar.
 */

const room = (over: Partial<HotelRoomView> = {}): HotelRoomView => ({
  id: 'a',
  name: 'Standart',
  description: 'Ikki kishilik karavot',
  capacity: 2,
  pricePerNight: 45_000_000,
  availableRooms: 3,
  image: null,
  ...over,
});

const format = { price: (tiyin: number) => `${Math.trunc(tiyin / 100)}` };

describe('jadval', () => {
  it("bo'sh ro'yxatda qator yo'q", () => {
    expect(buildComparison([], 2, format)).toEqual([]);
  });

  it('asosiy qatorlar bor', () => {
    const rows = buildComparison([room(), room({ id: 'b' })], 2, format);

    expect(rows.map((r) => r.label)).toEqual([
      'Bir kecha',
      '2 kecha uchun',
      "Sig'imi",
      "Bo'sh xona",
      'Tavsifi',
    ]);
  });

  it('kecha tanlanmagan bo\'lsa JAMI qatori yo\'q', () => {
    // Nol kechani ko'paytirish "0 so'm" berardi — bu yolg'on.
    const rows = buildComparison([room()], 0, format);

    expect(rows.some((r) => r.label.includes('kecha uchun'))).toBe(false);
  });

  it('qiymatlar xonalar TARTIBIDA', () => {
    const rows = buildComparison(
      [room({ capacity: 2 }), room({ id: 'b', capacity: 4 })],
      1,
      format,
    );

    expect(rows.find((r) => r.label === "Sig'imi")?.values).toEqual(['2 kishi', '4 kishi']);
  });
});

describe('farqni ajratish', () => {
  it('turli qiymat — FARQ qiladi', () => {
    const rows = buildComparison(
      [room({ pricePerNight: 45_000_000 }), room({ id: 'b', pricePerNight: 68_000_000 })],
      1,
      format,
    );

    expect(rows.find((r) => r.label === 'Bir kecha')?.differs).toBe(true);
  });

  it('bir xil qiymat — farq YO\'Q', () => {
    /**
     * Bir xil qatorlar qaror qabul qilishga yordam bermaydi va
     * ekranda so'nib turadi.
     */
    const rows = buildComparison([room({ capacity: 2 }), room({ id: 'b', capacity: 2 })], 1, format);

    expect(rows.find((r) => r.label === "Sig'imi")?.differs).toBe(false);
  });

  it('bitta xonada hech narsa farq qilmaydi', () => {
    const rows = buildComparison([room()], 1, format);

    expect(rows.every((r) => r.differs === false)).toBe(true);
  });
});

describe("bo'sh xona qatori", () => {
  it('sana tanlanmagan — SABAB aytiladi', () => {
    // Nol deb ko'rsatish yolg'on bo'lardi: hisob umuman qilinmagan.
    const rows = buildComparison([room({ availableRooms: null })], 1, format);

    expect(rows.find((r) => r.label === "Bo'sh xona")?.values).toEqual(['Sana tanlang']);
  });

  it("nol — band", () => {
    const rows = buildComparison([room({ availableRooms: 0 })], 1, format);

    expect(rows.find((r) => r.label === "Bo'sh xona")?.values).toEqual(["Yo'q"]);
  });

  it("soni ko'rsatiladi", () => {
    const rows = buildComparison([room({ availableRooms: 5 })], 1, format);

    expect(rows.find((r) => r.label === "Bo'sh xona")?.values).toEqual(['5 ta']);
  });

  it('tavsifsiz xonada chiziqcha', () => {
    const rows = buildComparison([room({ description: null })], 1, format);

    expect(rows.find((r) => r.label === 'Tavsifi')?.values).toEqual(['—']);
  });
});

describe('tanlash', () => {
  it("bo'sh tanlovga qo'shiladi", () => {
    expect(toggleCompare([], 'a')).toEqual(['a']);
  });

  it('takroriy bosish OLIB TASHLAYDI', () => {
    expect(toggleCompare(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('chegaradan OSHMAYDI', () => {
    const full = Array.from({ length: MAX_COMPARE_ROOMS }, (_, index) => `x${index}`);

    expect(toggleCompare(full, 'yangi')).toEqual(full);
  });

  it("chegarada yangi qo'shib bo'lmaydi", () => {
    expect(canAddToCompare(MAX_COMPARE_ROOMS)).toBe(false);
    expect(canAddToCompare(MAX_COMPARE_ROOMS - 1)).toBe(true);
  });

  it('chegarada ham OLIB TASHLASH ishlaydi', () => {
    /**
     * Aks holda odam tanlovni o'zgartira olmasdi: uchtasi tanlangan,
     * bittasini almashtirmoqchi — lekin hech narsa bosilmaydi.
     */
    const full = Array.from({ length: MAX_COMPARE_ROOMS }, (_, index) => `x${index}`);

    expect(toggleCompare(full, 'x0')).toHaveLength(MAX_COMPARE_ROOMS - 1);
  });
});

describe('eng arzon xona', () => {
  it('topiladi', () => {
    const index = cheapestIndex([
      room({ pricePerNight: 68_000_000 }),
      room({ id: 'b', pricePerNight: 45_000_000 }),
    ]);

    expect(index).toBe(1);
  });

  it('bitta xonada belgilanmaydi', () => {
    // "Eng arzon" degan belgi taqqoslashsiz ma'nosiz.
    expect(cheapestIndex([room()])).toBeNull();
  });

  it('narxlar TENG bo\'lsa belgilanmaydi', () => {
    const index = cheapestIndex([
      room({ pricePerNight: 45_000_000 }),
      room({ id: 'b', pricePerNight: 45_000_000 }),
    ]);

    expect(index).toBeNull();
  });

  it("uchtadan eng arzoni", () => {
    const index = cheapestIndex([
      room({ pricePerNight: 68_000_000 }),
      room({ id: 'b', pricePerNight: 90_000_000 }),
      room({ id: 'c', pricePerNight: 45_000_000 }),
    ]);

    expect(index).toBe(2);
  });
});
