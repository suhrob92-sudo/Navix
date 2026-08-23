import type { ServiceColor } from '@/config/modules';
import type { CatalogThumb } from '@/modules/catalog/catalog-image.types';

/**
 * Biznes profili — brauzer va server uchun umumiy turlar.
 */

/** Biznes turi — restoranmi yoki do'konmi. */
export type BusinessKind = 'RESTAURANT' | 'SHOP';

export interface BusinessCatalogItem {
  id: string;
  /**
   * Element sahifasining manzili.
   *
   * `null` — taomlarda: ular alohida sahifaga ega emas, havola
   * restoran menyusiga olib boradi.
   */
  slug: string | null;
  name: string;
  description: string | null;
  /** Narx — TIYINDA. */
  priceTiyin: number;
  categoryName: string | null;
  /** Element rasmi. */
  image: CatalogThumb | null;
}

export interface BusinessProfileView {
  id: string;
  kind: BusinessKind;
  slug: string;
  name: string;
  description: string;
  about: string | null;
  color: ServiceColor;

  city: string;
  address: string;
  phone: string | null;
  opensAt: string;
  closesAt: string;

  rating: number;
  ratingCount: number;
  isVerified: boolean;
  /** Biznes hozir buyurtma qabul qilyaptimi (egasi belgilaydi). */
  isOpen: boolean;

  followerCount: number;
  /** Katalogdagi mahsulot/taom soni. */
  itemCount: number;

  isFollowing: boolean;
  /** Bu biznes so'rov yuborgan odamniki (egasi). */
  isOwner: boolean;

  /** Buyurtma sahifasiga havola — modulga qarab boshqacha. */
  orderUrl: string;

  items: BusinessCatalogItem[];

  /** Biznes rasmi (do'kon yoki restoran). */
  image: CatalogThumb | null;
}

export interface BusinessProfileResponse {
  business: BusinessProfileView;
}

export interface BusinessFollowResponse {
  isFollowing: boolean;
  followerCount: number;
}

// ── Ko'rinadigan matnlar ──────────────────────────────────────────────

export const BUSINESS_KIND_LABELS: Record<BusinessKind, string> = {
  RESTAURANT: 'Restoran',
  SHOP: "Do'kon",
};

/** Katalog bo'limining nomi — restoranda "Menyu", do'konda "Mahsulotlar". */
export function catalogLabel(kind: BusinessKind): string {
  return kind === 'RESTAURANT' ? 'Menyu' : 'Mahsulotlar';
}

/** Ish vaqti: "10:00 — 23:00". */
export function formatWorkingHours(opensAt: string, closesAt: string): string {
  return `${opensAt} — ${closesAt}`;
}

/**
 * Biznes SHU PAYTDA ochiqmi.
 *
 * ── Nima uchun ikki xil "ochiq" bor ───────────────────────────────────
 * `isOpen` — egasi qo'lda o'chirib qo'yishi mumkin ("bugun yopiqmiz").
 * Ish vaqti esa jadval. Ikkalasi ham bajarilgandagina buyurtma qabul
 * qilinadi.
 *
 * ── Nima uchun kechasi orqali o'tish hisobga olinadi ──────────────────
 * "22:00 — 02:00" kabi ish vaqti bor: yopilish soati ochilishdan
 * KICHIK bo'lsa, u ertangi kunga tegishli.
 *
 * @param nowTime Hozirgi vaqt Toshkent bo'yicha, "HH:MM".
 */
export function isOpenNow(opensAt: string, closesAt: string, nowTime: string): boolean {
  if (opensAt === closesAt) return true;

  return opensAt < closesAt ? nowTime >= opensAt && nowTime < closesAt : nowTime >= opensAt || nowTime < closesAt;
}

/**
 * Xaritada ochish havolasi.
 *
 * ── Nima uchun Google Maps ────────────────────────────────────────────
 * Ilovada xarita moduli hali yo'q va u API kaliti talab qiladi. Oddiy
 * havola esa bepul: telefon uni o'zining xarita ilovasida ochadi.
 */
export function mapsUrl(city: string, address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(`${address}, ${city}`)}`;
}
