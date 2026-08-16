import type { LucideIcon } from 'lucide-react';
import { Briefcase, BedDouble, ShoppingBag, Store, UtensilsCrossed } from 'lucide-react';

/**
 * Videoga biriktiriladigan narsalar — YAGONA manba.
 *
 * ── Nima uchun bitta fayl ─────────────────────────────────────────────
 * Har bir tur oltita joyda kerak: tanlash oynasi, lentadagi tugma,
 * to'liq ekranli pleyer, statistika, qidiruv va server tekshiruvi.
 *
 * Ta'riflar sochilib ketsa, yangi bo'lim qo'shilganda oltita faylni
 * tahrirlash kerak bo'lardi va bittasi albatta unutilardi — natijada
 * tugma "topilmadi" sahifasiga olib borardi.
 *
 * ── Nima uchun bu fayl BRAUZERGA ham ketadi ───────────────────────────
 * Ichida faqat matn, belgi va havola qolipi bor — hech qanday
 * server siri yo'q. Shuning uchun uni ikkiga bo'lishning ma'nosi
 * yo'q edi.
 */

export const ATTACHMENT_KINDS = ['PRODUCT', 'MENU_ITEM', 'RESTAURANT', 'VACANCY', 'HOTEL'] as const;

export type AttachmentKindName = (typeof ATTACHMENT_KINDS)[number];

export interface AttachmentKindConfig {
  /** Tanlash oynasidagi nomi. */
  label: string;
  /** Qidiruv maydonidagi yordamchi yozuv. */
  placeholder: string;
  icon: LucideIcon;
  /**
   * Tugmadagi harakat — TURGA MOS fe'l.
   *
   * ── Nima uchun hammasi "Ko'rish" emas ───────────────────────────────
   * Tomoshabin tugmani bosishdan oldin nima bo'lishini bilishi kerak.
   * "Ko'rish" hech narsa va'da qilmaydi; "Buyurtma berish" esa aniq.
   * Aniq fe'l bosilishni sezilarli oshiradi va — muhimrog'i —
   * kutilmagan sahifaga tushishning oldini oladi.
   */
  action: string;
  /**
   * Nishonning sahifasi.
   *
   * `slug` bo'yicha quriladi: ID li havola ekranda ham, ulashilganda
   * ham o'qib bo'lmaydigan bo'lardi.
   */
  href: (slug: string) => string;
}

export const ATTACHMENT_KIND_CONFIG: Record<AttachmentKindName, AttachmentKindConfig> = {
  PRODUCT: {
    label: 'Mahsulot',
    placeholder: 'Mahsulot nomi',
    icon: ShoppingBag,
    action: 'Sotib olish',
    href: (slug) => `/marketplace/p/${slug}`,
  },
  MENU_ITEM: {
    label: 'Taom',
    placeholder: 'Taom nomi',
    icon: UtensilsCrossed,
    action: 'Buyurtma berish',
    /*
      Taomning O'Z sahifasi yo'q — u restoran menyusida turadi.

      Shuning uchun havola restoranga olib boradi. Belgi (`#`) bilan
      aynan o'sha taomga suriladi: uzun menyuda odam qidirib
      o'tirmasligi kerak.
    */
    href: (slug) => `/food/${slug}`,
  },
  RESTAURANT: {
    label: 'Restoran',
    placeholder: 'Restoran nomi',
    icon: Store,
    action: 'Menyuni ochish',
    href: (slug) => `/food/${slug}`,
  },
  VACANCY: {
    label: 'Ish',
    placeholder: 'Lavozim nomi',
    icon: Briefcase,
    action: 'Ariza yuborish',
    href: (slug) => `/jobs/v/${slug}`,
  },
  HOTEL: {
    label: 'Mehmonxona',
    placeholder: 'Mehmonxona nomi',
    icon: BedDouble,
    action: 'Band qilish',
    href: (slug) => `/hotel/${slug}`,
  },
};

/**
 * Bitta videoga biriktirilishi mumkin bo'lgan eng ko'p narsa.
 *
 * Chegarasiz video ostiga o'nlab tugma qo'yish mumkin bo'lardi va u
 * videoni emas, reklama ro'yxatini ko'rsatardi.
 */
export const MAX_ATTACHMENTS = 5;

export function isAttachmentKind(value: string): value is AttachmentKindName {
  return (ATTACHMENT_KINDS as readonly string[]).includes(value);
}
