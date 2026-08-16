import type { LucideIcon } from 'lucide-react';
import { Bell, Globe, LifeBuoy, RotateCcw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';

/** Feed sozlamalari sahifasidagi bitta qator. */
export interface FeedSettingsItem {
  /** Ochiladigan manzil. `null` — sahifa emas, joyida bajariladigan amal. */
  href: string | null;
  id: 'CONTENT' | 'PRIVACY' | 'NOTIFY' | 'LANGUAGE' | 'CACHE' | 'SUPPORT' | 'RESET';
  label: string;
  description: string;
  icon: LucideIcon;
  /** Ogohlantiruvchi rangda chizilsinmi. */
  isDanger?: boolean;
}

/**
 * Feed sozlamalarining ro'yxati — YAGONA manba.
 *
 * ── Nima uchun ba'zilari MANZILSIZ ────────────────────────────────────
 * "Keshni tozalash" va "Feedni tiklash" — sahifa emas, amal. Ular
 * uchun alohida sahifa ochish odamni ortiqcha bosishga majbur
 * qilardi: u yerda ko'radigan narsa faqat bitta tugma bo'lardi.
 *
 * ── Nima uchun "Til va hudud" ILOVA sozlamasiga olib boradi ───────────
 * Til butun ilova uchun bitta. Feed'ga alohida til qo'ysak, ikki joyda
 * ikki xil sozlama bo'lib, qaysi biri ishlayotgani tushunarsiz
 * bo'lardi.
 */
export const FEED_SETTINGS_ITEMS: readonly FeedSettingsItem[] = [
  {
    href: '/feed/settings/content',
    id: 'CONTENT',
    label: 'Kontent sozlamalari',
    description: "Qiziqishlar, qizig'i emas va hassos kontent",
    icon: Sparkles,
  },
  {
    href: '/feed/settings/privacy',
    id: 'PRIVACY',
    label: 'Maxfiylik',
    description: "Kim ko'radi, kim izoh yozadi, kim obuna bo'ladi",
    icon: ShieldCheck,
  },
  {
    href: '/feed/settings/notifications',
    id: 'NOTIFY',
    label: 'Bildirishnomalar',
    description: 'Yoqtirish, izoh, obunachi va eslatmalar',
    icon: Bell,
  },
  {
    href: '/profile/settings',
    id: 'LANGUAGE',
    label: 'Til va hudud',
    description: "Ilova sozlamalarida — hammasi uchun bitta",
    icon: Globe,
  },
  {
    href: null,
    id: 'CACHE',
    label: 'Keshni tozalash',
    description: "Saqlangan rasm va ma'lumotlarni o'chiradi",
    icon: Trash2,
  },
  {
    href: '/support',
    id: 'SUPPORT',
    label: "Yordam va qo'llab-quvvatlash",
    description: "Savol yoki muammo bo'lsa — yozing",
    icon: LifeBuoy,
  },
  {
    href: null,
    id: 'RESET',
    label: 'Feedni tiklash',
    description: 'Tavsiyalarni noldan boshlaydi',
    icon: RotateCcw,
    isDanger: true,
  },
] as const;
