import { describe, expect, it } from 'vitest';

import {
  MAP_PADDING,
  MAX_ZOOM,
  MIN_ZOOM,
  TILE_SIZE,
  centerOf,
  fitZoom,
  tileGrid,
  tileUrl,
  toScreen,
  worldPoint,
} from '@/config/map-tiles';

/**
 * Xarita hisobi — testlar.
 *
 * Bu hisob ekranda ko'rinadi: bitta xato belgi noto'g'ri joyda
 * turishiga olib keladi, ya'ni odam kuryerni boshqa ko'chada deb
 * o'ylaydi.
 */

const CENTER = { latitude: 41.311081, longitude: 69.240562 };

describe('dunyo pikseli', () => {
  it('nol darajada butun dunyo BITTA kafel', () => {
    const corner = worldPoint({ latitude: 0, longitude: -180 }, 0);

    expect(corner.x).toBeCloseTo(0, 6);
  });

  it('ekvator va nol meridian — markazda', () => {
    const middle = worldPoint({ latitude: 0, longitude: 0 }, 0);

    expect(middle.x).toBeCloseTo(TILE_SIZE / 2, 6);
    expect(middle.y).toBeCloseTo(TILE_SIZE / 2, 6);
  });

  it('daraja oshsa o\'lcham IKKI barobar', () => {
    const low = worldPoint(CENTER, 5);
    const high = worldPoint(CENTER, 6);

    expect(high.x).toBeCloseTo(low.x * 2, 4);
    expect(high.y).toBeCloseTo(low.y * 2, 4);
  });

  it('shimolga siljish Y ni KAMAYTIRADI', () => {
    // Ekranda shimol tepada — ya'ni Y kichrayadi.
    const north = worldPoint({ ...CENTER, latitude: CENTER.latitude + 0.1 }, 12);
    const here = worldPoint(CENTER, 12);

    expect(north.y).toBeLessThan(here.y);
  });

  it('qutub yaqinida hisob BUZILMAYDI', () => {
    /**
     * Mercator formulasi 90 darajada cheksizlikka ketadi. Kenglik
     * chegaralanmasa, bu yerda `Infinity` chiqardi.
     */
    const pole = worldPoint({ latitude: 90, longitude: 0 }, 4);

    expect(Number.isFinite(pole.y)).toBe(true);
  });
});

describe('daraja tanlash', () => {
  const WIDTH = 400;
  const HEIGHT = 240;

  it('yaqin nuqtalar uchun daraja KATTA', () => {
    const near = { latitude: CENTER.latitude + 0.002, longitude: CENTER.longitude + 0.002 };

    expect(fitZoom([CENTER, near], WIDTH, HEIGHT)).toBeGreaterThan(13);
  });

  it('uzoq nuqtalar uchun daraja KICHIK', () => {
    // Toshkent — Samarqand.
    const samarkand = { latitude: 39.627, longitude: 66.975 };

    expect(fitZoom([CENTER, samarkand], WIDTH, HEIGHT)).toBeLessThan(10);
  });

  it('tanlangan darajada ikkala nuqta ham SIG\'ADI', () => {
    const other = { latitude: 41.35, longitude: 69.32 };
    const zoom = fitZoom([CENTER, other], WIDTH, HEIGHT);

    const center = centerOf([CENTER, other])!;

    for (const point of [CENTER, other]) {
      const screen = toScreen(point, center, zoom, WIDTH, HEIGHT);

      expect(screen.x).toBeGreaterThanOrEqual(MAP_PADDING / 2);
      expect(screen.x).toBeLessThanOrEqual(WIDTH - MAP_PADDING / 2);
      expect(screen.y).toBeGreaterThanOrEqual(MAP_PADDING / 2);
      expect(screen.y).toBeLessThanOrEqual(HEIGHT - MAP_PADDING / 2);
    }
  });

  it('bitta nuqta bo\'lsa ham daraja mantiqiy', () => {
    const zoom = fitZoom([CENTER], WIDTH, HEIGHT);

    expect(zoom).toBeGreaterThan(MIN_ZOOM);
    expect(zoom).toBeLessThanOrEqual(MAX_ZOOM);
  });

  it('nuqta YO\'Q bo\'lsa eng kichik daraja', () => {
    expect(fitZoom([], WIDTH, HEIGHT)).toBe(MIN_ZOOM);
  });

  it('juda kichik ekranda ham daraja topiladi', () => {
    // Ekran to'ldiruvchidan kichik bo'lsa ham hisob buzilmasligi kerak.
    expect(fitZoom([CENTER, { latitude: 41.4, longitude: 69.4 }], 40, 40)).toBeGreaterThanOrEqual(MIN_ZOOM);
  });
});

describe('markaz', () => {
  it('ikki nuqtaning O\'RTASI', () => {
    const other = { latitude: 41.4, longitude: 69.4 };
    const center = centerOf([CENTER, other])!;

    expect(center.latitude).toBeCloseTo((CENTER.latitude + other.latitude) / 2, 6);
    expect(center.longitude).toBeCloseTo((CENTER.longitude + other.longitude) / 2, 6);
  });

  it('nuqta YO\'Q bo\'lsa null', () => {
    expect(centerOf([])).toBeNull();
  });
});

describe('ekran nuqtasi', () => {
  it('markazdagi nuqta ekran O\'RTASIDA', () => {
    const screen = toScreen(CENTER, CENTER, 14, 400, 240);

    expect(screen.x).toBeCloseTo(200, 6);
    expect(screen.y).toBeCloseTo(120, 6);
  });

  it('sharqdagi nuqta O\'NGDA', () => {
    const east = { ...CENTER, longitude: CENTER.longitude + 0.01 };
    const screen = toScreen(east, CENTER, 14, 400, 240);

    expect(screen.x).toBeGreaterThan(200);
  });

  it('janubdagi nuqta PASTDA', () => {
    const south = { ...CENTER, latitude: CENTER.latitude - 0.01 };
    const screen = toScreen(south, CENTER, 14, 400, 240);

    expect(screen.y).toBeGreaterThan(120);
  });
});

describe('kafellar', () => {
  const WIDTH = 400;
  const HEIGHT = 240;

  it('butun maydonni QOPLAYDI', () => {
    const tiles = tileGrid(CENTER, 14, WIDTH, HEIGHT);

    const left = Math.min(...tiles.map((t) => t.left));
    const top = Math.min(...tiles.map((t) => t.top));
    const right = Math.max(...tiles.map((t) => t.left + TILE_SIZE));
    const bottom = Math.max(...tiles.map((t) => t.top + TILE_SIZE));

    expect(left).toBeLessThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(WIDTH);
    expect(bottom).toBeGreaterThanOrEqual(HEIGHT);
  });

  it('kafellar TAKRORLANMAYDI', () => {
    const tiles = tileGrid(CENTER, 14, WIDTH, HEIGHT);
    const keys = new Set(tiles.map((t) => `${t.x}/${t.y}`));

    expect(keys.size).toBe(tiles.length);
  });

  it('chegaradan tashqaridagi kafel SO\'RALMAYDI', () => {
    /**
     * Xaritaning eng tepasida (Shimoliy qutub tomonda) manfiy
     * raqamli kafel yo'q. Uni so'rash 404 bergan va xaritada qora
     * kvadrat qolgan bo'lardi.
     */
    const tiles = tileGrid({ latitude: 85, longitude: 0 }, 2, WIDTH, HEIGHT);

    expect(tiles.every((t) => t.y >= 0 && t.y < 2 ** 2)).toBe(true);
  });

  it('180-meridianda kafel raqami O\'RALADI', () => {
    const tiles = tileGrid({ latitude: 0, longitude: 179.9 }, 2, WIDTH, HEIGHT);

    expect(tiles.every((t) => t.x >= 0 && t.x < 2 ** 2)).toBe(true);
  });

  it('manzil OSM shabloniga mos', () => {
    expect(tileUrl({ x: 3, y: 5, zoom: 14, left: 0, top: 0 })).toBe(
      'https://tile.openstreetmap.org/14/3/5.png',
    );
  });
});
