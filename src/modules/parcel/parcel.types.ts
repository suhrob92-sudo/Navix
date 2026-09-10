import type { DeliveryStatusName } from '@/modules/courier/courier.types';

/**
 * Posilka moduli — brauzer tomonidagi turlar.
 *
 * ── Nima uchun HOLAT bu yerda qayta e'lon qilinmaydi ──────────────────
 * Posilkaning holati — bu yetkazishning holati. Ikkinchi ro'yxat
 * yaratilsa, ular ertaga bir-biridan ajralib qolardi: kuryer
 * "yo'lda" derdi, posilka sahifasi esa "kuryer kutilmoqda".
 *
 * Shuning uchun `DeliveryStatusName` to'g'ridan-to'g'ri
 * ishlatiladi — yagona manba.
 */

export interface ParcelView {
  id: string;
  parcelNumber: string;
  status: DeliveryStatusName;

  fromRegion: string;
  fromAddress: string;
  fromNote: string | null;

  toRegion: string;
  toAddress: string;
  toNote: string | null;

  recipientName: string;
  recipientPhone: string;

  description: string;
  weightGrams: number;

  /** Mijoz to'lagan summa — TIYINDA. */
  priceTiyin: number;

  createdAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;

  /**
   * Kuryerning telefoni — FAQAT u topshiriqni olgandan keyin.
   *
   * Oldin ko'rsatib bo'lmaydi, chunki hali kuryer yo'q. Yetkazilgandan
   * keyin ham ko'rsatilaveradi: jo'natuvchi kuryerga qayta bog'lanishi
   * kerak bo'lishi mumkin.
   */
  courier: { name: string | null; phone: string } | null;
}

/**
 * Kuzatish havolasi orqali ochilgan posilka.
 *
 * ── Nima uchun ALOHIDA va KAMBAG'AL tur ───────────────────────────────
 * `ParcelView` ni qayta ishlatish mumkin edi va u kamroq kod bo'lardi.
 * Lekin havola ISTALGAN odamning qo'liga tushishi mumkin: uni
 * WhatsApp'da yuborishadi, u guruhga ko'chib o'tadi, keyin ekran
 * suratiga tushadi.
 *
 * Shuning uchun bu yerda ATAYLAB yo'q:
 *  · telefon raqamlari — na jo'natuvchining, na qabul qiluvchining;
 *  · narx — bu ikki odam o'rtasidagi gap;
 *  · posilkaning ichki ID'si — u bilan API'ga murojaat qilib
 *    bo'lmasligi kerak;
 *  · bekor qilish sababi — u shaxsiy izoh bo'lishi mumkin.
 *
 * Qoladigan narsa — savolning javobi: "posilkam qayerda va qachon
 * yetadi?".
 *
 * Bu qoida `parcel-share.test.ts` bilan qulflangan: ro'yxatga yangi
 * maydon qo'shilib qolmasligi uchun.
 */
export interface SharedParcelView {
  parcelNumber: string;
  status: DeliveryStatusName;

  /** Faqat VILOYATLAR — aniq manzil emas. */
  fromRegion: string;
  toRegion: string;

  /** Ichida nima borligi: qabul qiluvchi nimani kutishini biladi. */
  description: string;
  weightGrams: number;

  /**
   * Kuryer — FAQAT ismi.
   *
   * Telefon YO'Q: havolani olgan odam kuryerga to'g'ridan-to'g'ri
   * qo'ng'iroq qilishi kerak emas. Zarur bo'lsa, u jo'natuvchi
   * bilan gaplashadi — posilka ikkalasining kelishuvi.
   */
  courierName: string | null;

  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface SharedParcelResponse {
  parcel: SharedParcelView;
}

export interface ParcelTrackResponse {
  /** To'liq havola — ulashishga tayyor. */
  url: string;
}

export interface ParcelQuote {
  priceTiyin: number;
  breakdown: {
    baseSom: number;
    extraWeightSom: number;
    extraKilograms: number;
    isCrossRegion: boolean;
  };
}

export interface ParcelsResponse {
  parcels: ParcelView[];
  total: number;
}

export interface ParcelResponse {
  parcel: ParcelView;
}

export interface ParcelQuoteResponse {
  quote: ParcelQuote;
}

/**
 * Jo'natmani bekor qilish mumkinmi.
 *
 * Kuryer olib chiqqandan keyin mumkin emas: posilka allaqachon
 * uning qo'lida va yo'lda. Bunday holatda bekor qilish — bu
 * "orqaga qaytarib bering" degani va u alohida amal (hozircha
 * qo'llab-quvvatlashga murojaat).
 */
export function canCancelParcel(status: DeliveryStatusName): boolean {
  return status === 'OFFERED' || status === 'ACCEPTED';
}

/** Jo'natma yakunlanganmi (yetkazildi yoki bekor qilindi). */
export function isParcelFinished(status: DeliveryStatusName): boolean {
  return status === 'DELIVERED' || status === 'CANCELLED';
}

/** Og'irlikni o'qishga qulay ko'rinishda beradi: 1500 → "1.5 kg". */
export function formatWeight(grams: number): string {
  if (grams < 1_000) return `${grams} g`;

  const kilograms = grams / 1_000;

  // Butun bo'lsa kasr qismini ko'rsatmaymiz: "2 kg", "1.5 kg" emas.
  return Number.isInteger(kilograms) ? `${kilograms} kg` : `${kilograms.toFixed(1)} kg`;
}
