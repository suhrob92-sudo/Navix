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
