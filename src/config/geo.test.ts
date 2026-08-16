import { describe, expect, it } from 'vitest';

import { DELIVERY_REGIONS } from '@/config/delivery';
import {
  COORDINATE_PRECISION,
  NEARBY_RADIUS_KM,
  boundingBox,
  formatDistanceUz,
  UZ_REGIONS,
  UZ_REGION_CENTERS,
  blurCoordinate,
  distanceKm,
  isUzRegion,
  isValidCoordinate,
  nearestRegion,
} from '@/config/geo';

describe('O\'zbekiston hududlari', () => {
  it('o\'n to\'rtta hudud bor va hammasi noyob', () => {
    expect(UZ_REGIONS).toHaveLength(14);
    expect(new Set(UZ_REGIONS).size).toBe(UZ_REGIONS.length);
  });

  it('har bir hududning markazi bor', () => {
    for (const region of UZ_REGIONS) {
      const center = UZ_REGION_CENTERS[region];

      expect(center, `${region} markazi yo'q`).toBeDefined();
      expect(isValidCoordinate(center.latitude, center.longitude)).toBe(true);
    }
  });

  it("markazlar O'zbekiston chegarasida", () => {
    // O'zbekiston taxminan 37-46° shimol, 55-74° sharq oralig'ida.
    for (const region of UZ_REGIONS) {
      const { latitude, longitude } = UZ_REGION_CENTERS[region];

      expect(latitude, `${region} kengligi`).toBeGreaterThan(37);
      expect(latitude, `${region} kengligi`).toBeLessThan(46);
      expect(longitude, `${region} uzunligi`).toBeGreaterThan(55);
      expect(longitude, `${region} uzunligi`).toBeLessThan(74);
    }
  });

  it('yetkazib berish ro\'yxati bilan BIR XIL', () => {
    // Ikki joyda takrorlansa, yangi viloyat qo'shilganda bittasi
    // unutilardi.
    expect(DELIVERY_REGIONS).toEqual(UZ_REGIONS);
  });

  it('isUzRegion notanish nomni rad etadi', () => {
    expect(isUzRegion('Toshkent shahri')).toBe(true);
    expect(isUzRegion('Moskva')).toBe(false);
  });
});

describe('distanceKm', () => {
  it('bir nuqtadan o\'ziga masofa nol', () => {
    const point = UZ_REGION_CENTERS['Toshkent shahri'];

    expect(distanceKm(point, point)).toBe(0);
  });

  it('Toshkent — Samarqand masofasi haqiqatga yaqin', () => {
    const value = distanceKm(UZ_REGION_CENTERS['Toshkent shahri'], UZ_REGION_CENTERS.Samarqand);

    // To'g'ri chiziq bo'yicha ~270 km (yo'l bo'yicha ~300).
    expect(value).toBeGreaterThan(240);
    expect(value).toBeLessThan(300);
  });

  it('Toshkent — Nukus Samarqanddan UZOQROQ', () => {
    const toSamarkand = distanceKm(UZ_REGION_CENTERS['Toshkent shahri'], UZ_REGION_CENTERS.Samarqand);
    const toNukus = distanceKm(UZ_REGION_CENTERS['Toshkent shahri'], UZ_REGION_CENTERS["Qoraqalpog'iston"]);

    expect(toNukus).toBeGreaterThan(toSamarkand);
  });

  it('masofa ikki tomonlama bir xil', () => {
    const a = UZ_REGION_CENTERS.Buxoro;
    const b = UZ_REGION_CENTERS.Namangan;

    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
  });
});

describe('nearestRegion', () => {
  it('har bir markaz O\'Z hududini topadi', () => {
    for (const region of UZ_REGIONS) {
      expect(nearestRegion(UZ_REGION_CENTERS[region]), region).toBe(region);
    }
  });

  it('Toshkent markazidagi nuqta Toshkent shahriga tushadi', () => {
    // Chorsu bozori atrofi.
    expect(nearestRegion({ latitude: 41.326, longitude: 69.234 })).toBe('Toshkent shahri');
  });

  it("chegaradan tashqaridagi nuqta ham eng yaqinini topadi", () => {
    // Qozog'iston tomonda — baribir javob qaytadi, xato tashlanmaydi.
    const result = nearestRegion({ latitude: 43.2, longitude: 68.5 });

    expect(UZ_REGIONS).toContain(result);
  });
});

describe('blurCoordinate — maxfiylik', () => {
  it('aniqlikni uch xonagacha pasaytiradi', () => {
    // Bu eng muhim himoya: aniq koordinata uy manzilini oshkor qiladi.
    expect(blurCoordinate(41.31115678)).toBe(41.311);
    expect(blurCoordinate(69.24019999)).toBe(69.24);
  });

  it('manfiy qiymatda ham ishlaydi', () => {
    expect(blurCoordinate(-33.86788)).toBe(-33.868);
  });

  it('yaxlitlangan qiymat ~110 metrdan aniqroq EMAS', () => {
    const original = { latitude: 41.3111567, longitude: 69.2401999 };
    const blurred = {
      latitude: blurCoordinate(original.latitude),
      longitude: blurCoordinate(original.longitude),
    };

    // Siljish yarim katakdan oshmaydi: ~0.0005° ≈ 55 metr.
    expect(distanceKm(original, blurred)).toBeLessThan(0.09);
  });

  it('aniqlik darajasi hujjatdagidek', () => {
    expect(COORDINATE_PRECISION).toBe(3);
  });
});

describe('isValidCoordinate', () => {
  it('haqiqiy chegaralarni qabul qiladi', () => {
    expect(isValidCoordinate(41.311, 69.24)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
  });

  it('chegaradan tashqaridagini rad etadi', () => {
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(0, 181)).toBe(false);
    expect(isValidCoordinate(-91, 0)).toBe(false);
  });
});

describe('boundingBox', () => {
  const center = UZ_REGION_CENTERS['Toshkent shahri'];

  it("markazning o'zi to'rtburchak ichida", () => {
    const box = boundingBox(center, NEARBY_RADIUS_KM);

    expect(center.latitude).toBeGreaterThan(box.minLatitude);
    expect(center.latitude).toBeLessThan(box.maxLatitude);
    expect(center.longitude).toBeGreaterThan(box.minLongitude);
    expect(center.longitude).toBeLessThan(box.maxLongitude);
  });

  it("to'rtburchak ichidagi HAR BIR nuqta oraliqdan uzoq emas", () => {
    // To'rtburchak doiradan kattaroq: burchaklarda ~41% ortiqcha
    // hudud qoladi. Bu ataylab qabul qilingan — sabab `geo.ts` da.
    const box = boundingBox(center, NEARBY_RADIUS_KM);

    const corner = { latitude: box.maxLatitude, longitude: box.maxLongitude };

    expect(distanceKm(center, corner)).toBeLessThan(NEARBY_RADIUS_KM * 1.5);
  });

  it("shimol-janub kengligi oraliqning ikki barobari", () => {
    const box = boundingBox(center, NEARBY_RADIUS_KM);

    const north = { latitude: box.maxLatitude, longitude: center.longitude };

    expect(distanceKm(center, north)).toBeCloseTo(NEARBY_RADIUS_KM, 0);
  });

  it("sharq-g'arb kengligi ham oraliqqa yaqin", () => {
    // Meridianlar qutbga yaqin torayadi — hisobda kosinus bor.
    const box = boundingBox(center, NEARBY_RADIUS_KM);

    const east = { latitude: center.latitude, longitude: box.maxLongitude };

    expect(distanceKm(center, east)).toBeGreaterThan(NEARBY_RADIUS_KM * 0.9);
    expect(distanceKm(center, east)).toBeLessThan(NEARBY_RADIUS_KM * 1.1);
  });

  it("Samarqand Toshkent oralig'iga TUSHMAYDI", () => {
    // ~270 km — "yaqin" emas va bu qoida buzilmasligi kerak.
    const box = boundingBox(center, NEARBY_RADIUS_KM);
    const samarkand = UZ_REGION_CENTERS.Samarqand;

    const inside =
      samarkand.latitude >= box.minLatitude &&
      samarkand.latitude <= box.maxLatitude &&
      samarkand.longitude >= box.minLongitude &&
      samarkand.longitude <= box.maxLongitude;

    expect(inside).toBe(false);
  });

  it("Toshkent viloyati markazi oraliqqa TUSHADI", () => {
    // ~35 km — aynan shunday joylar "yaqin atrofda" da chiqishi kerak.
    const box = boundingBox(center, NEARBY_RADIUS_KM);
    const region = UZ_REGION_CENTERS['Toshkent viloyati'];

    const inside =
      region.latitude >= box.minLatitude &&
      region.latitude <= box.maxLatitude &&
      region.longitude >= box.minLongitude &&
      region.longitude <= box.maxLongitude;

    expect(inside).toBe(true);
  });
});

describe('formatDistanceUz', () => {
  it('bir kilometrdan kamini metrda ko\'rsatadi', () => {
    expect(formatDistanceUz(0.35)).toBe('350 m');
    expect(formatDistanceUz(0.912)).toBe('910 m');
  });

  it("juda yaqin masofada ham nol ko'rsatmaydi", () => {
    // "0 m" degan yozuv buzuq ko'rinadi.
    expect(formatDistanceUz(0.001)).toBe('10 m');
    expect(formatDistanceUz(0)).toBe('10 m');
  });

  it("o'n kilometrgacha bitta kasr", () => {
    expect(formatDistanceUz(1.24)).toBe('1.2 km');
    expect(formatDistanceUz(9.96)).toBe('10 km');
  });

  it("o'n kilometrdan keyin kasr YO'Q", () => {
    // Koordinata ~110 metrga yaxlitlangan — kasr yolg'on aniqlik.
    expect(formatDistanceUz(12.4)).toBe('12 km');
    expect(formatDistanceUz(47.8)).toBe('48 km');
  });

  it("noto'g'ri qiymatda bo'sh matn", () => {
    expect(formatDistanceUz(Number.NaN)).toBe('');
    expect(formatDistanceUz(-5)).toBe('');
  });

  it("oraliq hujjatdagidek", () => {
    expect(NEARBY_RADIUS_KM).toBe(50);
  });
});
