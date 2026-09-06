import { ROUTE_FACTOR, distanceKm, type Point } from '@/config/delivery-eta';
import {
  TAXI_DRIVER_SHARE_PERCENT,
  TAXI_MAX_DISTANCE_KM,
  TAXI_MIN_DISTANCE_KM,
  TAXI_MIN_FARE_SOM,
  TAXI_TARIFFS,
  type TaxiTariffName,
} from '@/config/taxi';

/**
 * Safar narxini hisoblaydi.
 *
 * ── Nima uchun ALOHIDA va SOF funksiya ────────────────────────────────
 * `parcel.pricing.ts` dagi bilan bir xil sabab: bu modulning eng
 * nozik joyi. Bu yerdagi xato HAR safarda takrorlanadi va uni faqat
 * mijoz shikoyat qilganda bilib qolamiz.
 *
 * Bazaga ham, tarmoqqa ham tegmaydi — shuning uchun har bir chegara
 * holatini test bilan qamrab olish mumkin.
 *
 * ── Nima uchun ko'chalar bo'ylab MARSHRUT hisoblanmaydi ───────────────
 * Haqiqiy marshrut uzunligini bilish uchun yo'nalish xizmati kerak
 * (OSRM, Google Directions). Ular yo pullik, yo o'z serverimizni
 * talab qiladi — ya'ni bugun ishlamaydi.
 *
 * Shuning uchun to'g'ri chiziqdagi masofa `ROUTE_FACTOR` (1.3) ga
 * ko'paytiriladi. Bu — yetkazish modulida allaqachon ishlatilayotgan
 * va shahar sharoitida yaxshi ishlaydigan taxmin: ko'chalar to'g'ri
 * chiziqdan o'rtacha shuncha uzun bo'ladi.
 *
 * MUHIM: bu TAXMINIY narx. Yo'nalish xizmati ulanganda faqat SHU
 * fayldagi masofa manbai o'zgaradi, qolgan hamma narsa joyida qoladi.
 */

export interface TaxiFare {
  /** Yo'l uzunligi — KILOMETRDA, ikki xonagacha yaxlitlangan. */
  distanceKm: number;
  /** Mijoz to'laydigan summa — TIYINDA. */
  priceTiyin: number;
  /** Haydovchiga tegadigan qism — TIYINDA. */
  driverFeeTiyin: number;
  /** Hisob-kitobning tushuntirishi — ekranda ko'rsatiladi. */
  breakdown: {
    baseSom: number;
    perKmSom: number;
    distanceSom: number;
    /** Pastki chegara ishlaganmi. */
    minFareApplied: boolean;
  };
}

/** Masofa ruxsat etilgan oraliqdami. */
export function isTaxiDistanceAllowed(km: number): boolean {
  return Number.isFinite(km) && km >= TAXI_MIN_DISTANCE_KM && km <= TAXI_MAX_DISTANCE_KM;
}

/**
 * Ikki nuqta orasidagi TAXMINIY yo'l uzunligi.
 *
 * Natija ikki xonagacha yaxlitlanadi: bazadagi ustun ham
 * `Decimal(6, 2)`, ya'ni undan aniqroq saqlab bo'lmaydi. Yaxlitlashni
 * shu yerda qilish narx va bazadagi masofa BIR XIL sondan
 * hisoblanishini kafolatlaydi.
 */
export function routeDistanceKm(from: Point, to: Point): number {
  const straight = distanceKm(from, to);

  return Math.round(straight * ROUTE_FACTOR * 100) / 100;
}

export function calculateTaxiFare(tariff: TaxiTariffName, km: number): TaxiFare {
  const rate = TAXI_TARIFFS[tariff];

  /*
    Masofa haqi aniq masofadan hisoblanadi va so'mga yaxlitlanadi.

    Yuqoriga yaxlitlash mijoz zarariga bo'lardi, pastga — platforma
    zarariga. Eng yaqin butun so'm ikkala tomon uchun ham halol.
  */
  const distanceSom = Math.round(km * rate.perKmSom);

  const rawSom = rate.baseSom + distanceSom;

  /*
    Pastki chegara TARIFDAN KEYIN qo'llaniladi: Komfort tarifining
    bazasi allaqachon chegaradan yuqori, ya'ni unga ta'sir qilmaydi.
  */
  const minFareApplied = rawSom < TAXI_MIN_FARE_SOM;
  const totalSom = minFareApplied ? TAXI_MIN_FARE_SOM : rawSom;

  const priceTiyin = totalSom * 100;

  /*
    Haydovchi ulushi PASTGA yaxlitlanadi — `parcel.pricing.ts` dagi
    bilan bir xil sabab: yuqoriga yaxlitlansa platforma har safarda
    bir tiyindan qarzdor bo'lib borardi.

    Bu ayni paytda bazadagi `driverFeeTiyin <= priceTiyin` cheklovini
    ham kafolatlaydi.
  */
  const driverFeeTiyin = Math.floor((priceTiyin * TAXI_DRIVER_SHARE_PERCENT) / 100);

  return {
    distanceKm: km,
    priceTiyin,
    driverFeeTiyin,
    breakdown: {
      baseSom: rate.baseSom,
      perKmSom: rate.perKmSom,
      distanceSom,
      minFareApplied,
    },
  };
}
