import { describe, expect, it } from 'vitest';

import {
  COURIER_SPEED_KMH,
  LOCATION_FRESH_MINUTES,
  distanceKm,
  estimateArrival,
  formatDistance,
  MAX_LOCATION_ACCURACY_M,
  formatMinutes,
  isAccurateEnough,
  isLocationFresh,
  travelMinutes,
} from '@/config/delivery-eta';

/**
 * Yetkazish vaqti — testlar.
 *
 * Bu hisob odamga VA'DA beradi, shuning uchun chegaralar alohida
 * tekshiriladi.
 */

/** Toshkent markazi. */
const CENTER = { latitude: 41.311081, longitude: 69.240562 };

describe('masofa', () => {
  it('bir xil nuqta orasida NOL', () => {
    expect(distanceKm(CENTER, CENTER)).toBeCloseTo(0, 5);
  });

  it('ma\'lum masofani to\'g\'ri hisoblaydi', () => {
    /**
     * Toshkent markazidan ~0.01 kenglik shimolga — taxminan
     * 1.11 km. Bu Yer radiusidan kelib chiqadigan barqaror son.
     */
    const north = { latitude: CENTER.latitude + 0.01, longitude: CENTER.longitude };

    expect(distanceKm(CENTER, north)).toBeCloseTo(1.11, 1);
  });

  it('yo\'nalish AHAMIYATSIZ', () => {
    const other = { latitude: 41.35, longitude: 69.29 };

    expect(distanceKm(CENTER, other)).toBeCloseTo(distanceKm(other, CENTER), 6);
  });

  it('uzoq masofada ham ishlaydi', () => {
    // Toshkent — Samarqand, taxminan 270 km.
    const samarkand = { latitude: 39.627, longitude: 66.975 };

    expect(distanceKm(CENTER, samarkand)).toBeGreaterThan(250);
    expect(distanceKm(CENTER, samarkand)).toBeLessThan(290);
  });
});

describe('masofa matni', () => {
  it('bir kilometrdan yaqin masofa METRDA', () => {
    /**
     * "0.3 km" dan "300 m" ancha tushunarli.
     */
    expect(formatDistance(0.3)).toBe('300 m');
  });

  it('metr YUZTALAB emas, ELLIKTALAB yaxlitlanadi', () => {
    // "287 m" yolg'on aniqlik berardi — hisobning o'zi taxminiy.
    expect(formatDistance(0.287)).toBe('300 m');
    expect(formatDistance(0.32)).toBe('300 m');
  });

  it('juda yaqin masofada ham NOL emas', () => {
    expect(formatDistance(0.01)).toBe('50 m');
  });

  it('kilometrda bitta kasr', () => {
    expect(formatDistance(2.34)).toBe('2.3 km');
  });

  it('yaroqsiz qiymat bo\'sh matn beradi', () => {
    expect(formatDistance(Number.NaN)).toBe('');
    expect(formatDistance(-5)).toBe('');
  });
});

describe('yurish vaqti', () => {
  it('tezlik va yo\'l koeffitsienti hisobga olinadi', () => {
    /**
     * 3 km to'g'ri chiziq -> 3.9 km haqiqiy yo'l -> 18 km/soatda
     * taxminan 13 daqiqa.
     */
    expect(travelMinutes(3)).toBe(13);
  });

  it('juda qisqa masofada ham kamida BIR daqiqa', () => {
    // "0 daqiqa" degan javob ma'nosiz.
    expect(travelMinutes(0.01)).toBe(1);
    expect(travelMinutes(0)).toBe(1);
  });

  it('tezlik oshsa vaqt KAMAYADI', () => {
    // Sozlama o'zgarsa hisob ham o'zgarishini tekshiramiz.
    expect(COURIER_SPEED_KMH).toBeGreaterThan(0);
    expect(travelMinutes(10)).toBeGreaterThan(travelMinutes(5));
  });
});

describe('vaqt matni', () => {
  it('bir soatdan kam vaqt daqiqada', () => {
    expect(formatMinutes(15)).toBe('15 daqiqa');
  });

  it('roppa-rosa soat', () => {
    expect(formatMinutes(120)).toBe('2 soat');
  });

  it('soat va daqiqa birga', () => {
    expect(formatMinutes(70)).toBe('1 soat 10 daqiqa');
  });

  it('nol ham BIR daqiqaga aylanadi', () => {
    expect(formatMinutes(0)).toBe('1 daqiqa');
  });
});

describe('joylashuv yangimi', () => {
  const now = new Date('2026-08-25T12:00:00Z');

  it('yaqinda yuborilgan joylashuv ISHONCHLI', () => {
    expect(isLocationFresh('2026-08-25T11:58:00Z', now)).toBe(true);
  });

  it('ESKI joylashuv ishonchsiz', () => {
    /**
     * Kuryerning telefoni o'chgan bo'lishi mumkin. Eski nuqtani
     * "kuryer shu yerda" deb ko'rsatish odamni sovuqda eshik
     * oldida kutishga majbur qilardi.
     */
    const stale = new Date(now.getTime() - (LOCATION_FRESH_MINUTES + 1) * 60_000).toISOString();

    expect(isLocationFresh(stale, now)).toBe(false);
  });

  it('joylashuv YO\'Q bo\'lsa ishonchsiz', () => {
    expect(isLocationFresh(null, now)).toBe(false);
  });

  it('KELAJAKDAGI vaqt ham ishonchsiz', () => {
    // Kuryer telefonining vaqti noto'g'ri qo'yilgan bo'lishi mumkin.
    expect(isLocationFresh('2026-08-25T12:30:00Z', now)).toBe(false);
  });

  it('kichik farq kechiriladi', () => {
    // Server va telefon vaqti bir necha soniyaga farq qilishi tabiiy.
    expect(isLocationFresh('2026-08-25T12:00:30Z', now)).toBe(true);
  });

  it('yaroqsiz sana ishonchsiz', () => {
    expect(isLocationFresh('salom', now)).toBe(false);
  });
});

describe('yetib kelish vaqti', () => {
  const now = new Date('2026-08-25T12:00:00Z');

  const base = {
    deliveryMinutes: 45,
    createdAt: '2026-08-25T11:40:00Z',
    courierPoint: null,
    courierReportedAt: null,
    destination: null,
    now,
  };

  it('yetkazilgan buyurtmada ETA YO\'Q', () => {
    const result = estimateArrival({ ...base, status: 'DELIVERED' });

    expect(result.minutes).toBeNull();
    expect(result.text).toBe('Yetkazildi');
  });

  it('bekor qilingan buyurtmada ham YO\'Q', () => {
    expect(estimateArrival({ ...base, status: 'CANCELLED' }).minutes).toBeNull();
  });

  it('oshxonada — RESTORAN muddatidan hisoblanadi', () => {
    /**
     * Buyurtma hali oshxonada bo'lsa, kuryerning joylashuvi
     * ahamiyatsiz — u hali yo'lga chiqmagan.
     */
    const result = estimateArrival({ ...base, status: 'PREPARING' });

    // 45 daqiqadan 20 daqiqa o'tgan -> 25 qoldi.
    expect(result.minutes).toBe(25);
    expect(result.text).toContain('25 daqiqa');
  });

  it('muddat o\'tib ketsa MANFIY son ko\'rsatilmaydi', () => {
    /**
     * "-10 daqiqada yetib boradi" degan matn ma'nosiz. "Hozir
     * yetib keladi" esa to'g'riroq va odamni tinchlantiradi.
     */
    const late = estimateArrival({
      ...base,
      status: 'PREPARING',
      createdAt: '2026-08-25T10:00:00Z',
    });

    expect(late.minutes).toBe(0);
    expect(late.text).toBe('Hozir yetib keladi');
  });

  it('kuryer YO\'LDA va joylashuvi ma\'lum — MASOFADAN hisoblanadi', () => {
    /**
     * Bu eng aniq hisob: restoranning o'rtacha muddati emas,
     * AYNAN shu kuryerning masofasi.
     */
    const result = estimateArrival({
      ...base,
      status: 'DELIVERING',
      courierPoint: { latitude: 41.32, longitude: 69.24 },
      courierReportedAt: '2026-08-25T11:59:00Z',
      destination: CENTER,
    });

    expect(result.distanceText).not.toBeNull();
    expect(result.minutes).toBeGreaterThan(0);
    expect(result.minutes).toBeLessThan(15);
  });

  it('joylashuv ESKI bo\'lsa masofa ishlatilmaydi', () => {
    /**
     * Eski nuqtaga qarab hisoblangan ETA yolg'on bo'lardi.
     * O'shanda restoranning muddati ishlatiladi.
     */
    const result = estimateArrival({
      ...base,
      status: 'DELIVERING',
      courierPoint: { latitude: 41.32, longitude: 69.24 },
      courierReportedAt: '2026-08-25T11:00:00Z',
      destination: CENTER,
    });

    expect(result.distanceText).toBeNull();
    expect(result.minutes).toBe(25);
  });

  it('manzil noma\'lum bo\'lsa masofa ishlatilmaydi', () => {
    const result = estimateArrival({
      ...base,
      status: 'DELIVERING',
      courierPoint: { latitude: 41.32, longitude: 69.24 },
      courierReportedAt: '2026-08-25T11:59:00Z',
      destination: null,
    });

    expect(result.distanceText).toBeNull();
  });

  it('yaroqsiz sana hisobni BUZMAYDI', () => {
    const result = estimateArrival({ ...base, status: 'PREPARING', createdAt: 'salom' });

    expect(result.text).toContain('45 daqiqa');
  });
});

describe('joylashuv aniqligi', () => {
  it('aniq joylashuv qabul qilinadi', () => {
    expect(isAccurateEnough(30)).toBe(true);
  });

  it('QO\'POL joylashuv rad etiladi', () => {
    /**
     * Wi-Fi bo'yicha topilgan nuqtaning xatosi kilometrlab bo'lishi
     * mumkin — uni xaritada ko'rsatish yolg'on bo'lardi.
     */
    expect(isAccurateEnough(MAX_LOCATION_ACCURACY_M + 1)).toBe(false);
  });

  it('chegaraning O\'ZI qabul qilinadi', () => {
    expect(isAccurateEnough(MAX_LOCATION_ACCURACY_M)).toBe(true);
  });

  it('aniqlik NOMA\'LUM bo\'lsa qabul qilinadi', () => {
    // Eski brauzerlar aniqlikni umuman bermaydi.
    expect(isAccurateEnough(null)).toBe(true);
    expect(isAccurateEnough(undefined)).toBe(true);
  });

  it('yaroqsiz qiymat rad etiladi', () => {
    expect(isAccurateEnough(Number.NaN)).toBe(false);
    expect(isAccurateEnough(-1)).toBe(false);
  });
});
