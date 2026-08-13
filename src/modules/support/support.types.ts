import type { SupportTicketCategory, SupportTicketStatus } from '@/generated/prisma/client';

/**
 * Yordam xizmatining umumiy tushunchalari.
 *
 * Bu fayl BRAUZERDA ham ishlatiladi (sahifalar holat nomini shu
 * yerdan oladi), shuning uchun unda bazaga murojaat yo'q — faqat
 * turlar va nomlar.
 */

export type SupportStatusName = `${SupportTicketStatus}`;
export type SupportCategoryName = `${SupportTicketCategory}`;

export const SUPPORT_CATEGORIES: readonly { value: SupportCategoryName; label: string; hint: string }[] = [
  { value: 'ORDER', label: 'Buyurtma', hint: 'Yetkazilmadi, kech keldi, boshqa tovar keldi' },
  { value: 'PAYMENT', label: "To'lov", hint: "Pul yechildi, qaytmadi, hamyon to'lmadi" },
  { value: 'ACCOUNT', label: 'Hisob', hint: 'Kira olmayapman, kod kelmadi, hisob bloklandi' },
  { value: 'BUG', label: 'Xatolik', hint: 'Ilova ishlamayapti, tugma bosilmayapti' },
  { value: 'OTHER', label: 'Boshqa', hint: "Yuqoridagilarga to'g'ri kelmasa" },
] as const;

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategoryName, string> = {
  ORDER: 'Buyurtma',
  PAYMENT: "To'lov",
  ACCOUNT: 'Hisob',
  BUG: 'Xatolik',
  OTHER: 'Boshqa',
};

/**
 * Holat nomlari FOYDALANUVCHI tomonidan yozilgan.
 *
 * `ANSWERED` — bu xodim javob berganini bildiradi. Foydalanuvchi
 * uchun "Javob berildi" degan matn "Javob kutilmoqda" dan ancha
 * tinchlantiruvchi va aniqroq.
 */
export const SUPPORT_STATUS_LABELS: Record<SupportStatusName, string> = {
  OPEN: "Ko'rib chiqilmoqda",
  ANSWERED: 'Javob berildi',
  RESOLVED: 'Hal qilindi',
  CLOSED: 'Yopildi',
};

export const SUPPORT_STATUS_VARIANTS: Record<
  SupportStatusName,
  'default' | 'success' | 'warning' | 'destructive' | 'secondary'
> = {
  OPEN: 'warning',
  ANSWERED: 'default',
  RESOLVED: 'success',
  CLOSED: 'secondary',
};

/** Murojaat yopilganmi — yopilganiga yozib bo'lmaydi. */
export function isTicketClosed(status: SupportStatusName): boolean {
  return status === 'RESOLVED' || status === 'CLOSED';
}

/**
 * Bitta odamda bir vaqtda nechta OCHIQ murojaat bo'lishi mumkin.
 *
 * ── Nima uchun chegara kerak ──────────────────────────────────────────
 * Chegarasiz bitta odam yuzta murojaat ochib, xodimlar navbatini
 * to'ldirib qo'yishi mumkin — va haqiqiy murojaatlar ular orasida
 * yo'qolib ketardi.
 *
 * Uchta — yetarli: bir odamda bir vaqtda uchtadan ko'p turli muammo
 * bo'lishi kam uchraydi. Hal qilingan murojaatlar bu songa
 * kirmaydi, ya'ni chegara hech qachon butunlay to'sib qo'ymaydi.
 */
export const MAX_OPEN_TICKETS = 3;

export interface SupportMessageView {
  id: string;
  body: string;
  isStaff: boolean;
  authorName: string | null;
  createdAt: string;
}

export interface SupportTicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: SupportCategoryName;
  status: SupportStatusName;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
}

export interface SupportTicketView extends SupportTicketListItem {
  messages: SupportMessageView[];
  /** Xodim uchun: murojaat egasi kim. */
  customer?: { id: string; name: string; phone: string } | null;
  assigneeName?: string | null;
}
