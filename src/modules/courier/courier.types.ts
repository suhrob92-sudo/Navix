import type { ServiceColor } from '@/config/modules';

/**
 * Kuryer moduli — brauzer tomonidagi turlar va qoidalar.
 *
 * `courier.service.ts` dan import qilinmaydi (Prisma bog'liqligi).
 */

export type DeliveryStatusName = 'OFFERED' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

/** Topshiriq qaysi moduldan kelgan. */
export type DeliveryKind = 'FOOD' | 'MARKET' | 'PARCEL';

export interface DeliveryLine {
  name: string;
  quantity: number;
}

export interface DeliveryView {
  id: string;
  status: DeliveryStatusName;
  kind: DeliveryKind;
  orderNumber: string;
  /** Kuryer topadigan haq — TIYINDA. */
  fee: number;
  /** Qayerdan olinadi: restoran, do'kon yoki jo'natuvchining manzili. */
  pickup: { name: string; color: ServiceColor };
  /**
   * Olib ketish manzili — FAQAT posilkada to'ladi.
   *
   * Restoran va do'konning manzili kuryerga allaqachon tanish
   * (ular ro'yxatda va bir joyda turadi). Posilka esa har safar
   * yangi manzildan olinadi, shuning uchun uni ko'rsatish SHART.
   */
  pickupAddress: string | null;
  /** Qayerga eltiladi. */
  dropoffAddress: string;
  dropoffNote: string | null;
  customer: { name: string | null; phone: string };
  /** Nima olib ketiladi — kuryer qopni to'ldirishdan oldin ko'radi. */
  items: DeliveryLine[];
  /** Buyurtma summasi — TIYINDA, faqat ko'rsatish uchun. */
  orderTotal: number;
  createdAt: string;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  /** Mijozning buyurtma sahifasi — bildirishnomalarda ishlatiladi. */
  orderUrl: string;
}

export interface CourierStats {
  /** Bugungi ko'rsatkichlar (Toshkent vaqti bo'yicha). */
  todayDeliveries: number;
  /** Summalar TIYINDA. */
  todayEarnings: number;
  weekDeliveries: number;
  weekEarnings: number;
  /** Hozir qo'lida turgan topshiriqlar. */
  activeDeliveries: number;
  /** Umumiy ro'yxatda nechta topshiriq bor. */
  availableDeliveries: number;
}

export interface CourierOverviewResponse {
  stats: CourierStats;
  active: DeliveryView[];
}

export interface DeliveriesResponse {
  deliveries: DeliveryView[];
}

export interface DeliveryResponse {
  delivery: DeliveryView;
}

// ── Holatlar avtomati ─────────────────────────────────────────────────

/**
 * Kuryer topshirig'ining bosqichlari.
 *
 * `OFFERED` da EGASI YO'Q — u umumiy ro'yxatda turadi. Qolgan
 * bosqichlarning hammasida aniq bitta kuryer bor.
 */
export const DELIVERY_FLOW: readonly DeliveryStatusName[] = ['OFFERED', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'] as const;

/**
 * Ruxsat etilgan o'tishlar.
 *
 * `ACCEPTED → OFFERED` ataylab bor va bu boshqa jadvallardan farq
 * qiladi: kuryer topshiriqni olgach mototsikli buzilishi yoki
 * kechikishi mumkin. Unda topshiriq umumiy ro'yxatga QAYTARILADI —
 * mijoz kutib qolgandan ko'ra boshqa kuryer olgani yaxshiroq.
 *
 * Buyurtma olib chiqilgandan keyin esa qaytarish yo'q: mahsulot
 * kuryerning qo'lida va uni javonga qaytarib bo'lmaydi.
 */
export const DELIVERY_TRANSITIONS: Record<DeliveryStatusName, readonly DeliveryStatusName[]> = {
  OFFERED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'OFFERED', 'CANCELLED'],
  PICKED_UP: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: DeliveryStatusName, to: DeliveryStatusName): boolean {
  return DELIVERY_TRANSITIONS[from].includes(to);
}

/** Kuryer uchun KEYINGI mantiqiy qadam. */
export function nextStatus(current: DeliveryStatusName): DeliveryStatusName | null {
  const index = DELIVERY_FLOW.indexOf(current);
  if (index === -1 || index === DELIVERY_FLOW.length - 1) return null;

  const candidate = DELIVERY_FLOW[index + 1];

  return canTransition(current, candidate) ? candidate : null;
}

/** Topshiriqni umumiy ro'yxatga qaytarish mumkinmi. */
export function canRelease(status: DeliveryStatusName): boolean {
  return canTransition(status, 'OFFERED');
}

/** Kuryer hali ish qilishi kerakmi. */
export function isActive(status: DeliveryStatusName): boolean {
  return status === 'ACCEPTED' || status === 'PICKED_UP';
}

// ── Ko'rinadigan nomlar ───────────────────────────────────────────────

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatusName, string> = {
  OFFERED: 'Kuryer kutilmoqda',
  ACCEPTED: 'Kuryer tayinlandi',
  PICKED_UP: "Yo'lda",
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

export const DELIVERY_STATUS_VARIANTS: Record<
  DeliveryStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  OFFERED: 'warning',
  ACCEPTED: 'default',
  PICKED_UP: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
};

/**
 * Har bir holatda KEYINGI qadam tugmasining yozuvi.
 *
 * `OFFERED` uchun yozuv yo'q: umumiy ro'yxatdagi topshiriqni "olish"
 * boshqa amal (`accept`) va u alohida tugma bilan bajariladi.
 */
export const DELIVERY_ACTION_LABELS: Record<DeliveryStatusName, string> = {
  OFFERED: '',
  ACCEPTED: 'Buyurtmani oldim',
  PICKED_UP: 'Mijozga topshirdim',
  DELIVERED: '',
  CANCELLED: '',
};

/** Topshiriq qaysi moduldan kelganini ko'rsatuvchi nom. */
export const DELIVERY_KIND_LABELS: Record<DeliveryKind, string> = {
  FOOD: 'Ovqat',
  MARKET: 'Mahsulot',
  PARCEL: 'Posilka',
};

/**
 * Bitta kuryer bir vaqtda nechta topshiriq ola oladi.
 *
 * Chegara kerak: chegarasiz bo'lsa bitta kuryer butun ro'yxatni
 * "band qilib" qo'yishi va hech birini o'z vaqtida yetkaza olmasligi
 * mumkin. 3 ta — bitta yo'nalishdagi real yuk.
 */
export const MAX_ACTIVE_DELIVERIES = 3;
