import { formatTiyin } from '@/lib/money';

/**
 * Bildirishnoma hodisalari — yagona katalog.
 *
 * ── Nima uchun katalog kerak ──────────────────────────────────────────
 * Har bir modul o'zicha matn yozsa, ilova "ko'p ovozli" bo'lib qoladi:
 * bir joyda "To'lov bajarildi", boshqasida "Tolov amalga oshdi". Bundan
 * tashqari matnni o'zgartirish uchun butun kodni qidirish kerak bo'lardi.
 *
 * Shu yerda hamma matn bir joyda turadi va tarjima qilish ham oson.
 *
 * ── Nima uchun turlar qattiq ──────────────────────────────────────────
 * Har hodisa o'z ma'lumotini talab qiladi (summa, ism, chek raqami).
 * TypeScript noto'g'ri ma'lumot uzatilsa darhol xato beradi — matn
 * ichida `undefined` chiqib qolmaydi.
 */

/** Har bir hodisa uchun kerakli ma'lumot. */
export interface NotificationEventData {
  'wallet.topped_up': { amountTiyin: number; balanceTiyin: number };
  'wallet.transfer_sent': { amountTiyin: number; recipientName: string };
  'wallet.transfer_received': { amountTiyin: number; senderName: string };
  'payment.completed': { amountTiyin: number; providerName: string; paymentId: string };
  'security.password_changed': { revokedSessions: number };
}

export type NotificationEventName = keyof NotificationEventData;

export interface NotificationTemplate {
  title: string;
  body: string;
  /** Bosilganda ochiladigan sahifa. */
  actionUrl: string | null;
  /** Qaysi modul yubordi — ro'yxatda nishon (badge) sifatida ko'rinadi. */
  sourceModule: string;
}

type TemplateBuilders = {
  [Event in NotificationEventName]: (data: NotificationEventData[Event]) => NotificationTemplate;
};

/**
 * Matn qoidalari:
 *  - sarlavha qisqa (ro'yxatda bir qatorga sig'sin);
 *  - matnda ANIQ summa bo'lsin — foydalanuvchi ochmasdan tushunsin;
 *  - havola aynan kerakli sahifaga olib borsin.
 */
export const NOTIFICATION_TEMPLATES: TemplateBuilders = {
  'wallet.topped_up': ({ amountTiyin, balanceTiyin }) => ({
    title: "Hisob to'ldirildi",
    body: `Hamyoningizga ${formatTiyin(amountTiyin)} qo'shildi. Joriy balans: ${formatTiyin(balanceTiyin)}.`,
    actionUrl: '/wallet',
    sourceModule: 'wallet',
  }),

  'wallet.transfer_sent': ({ amountTiyin, recipientName }) => ({
    title: 'Pul yuborildi',
    body: `${recipientName} ga ${formatTiyin(amountTiyin)} o'tkazildi.`,
    actionUrl: '/wallet/history',
    sourceModule: 'wallet',
  }),

  'wallet.transfer_received': ({ amountTiyin, senderName }) => ({
    title: 'Pul keldi',
    body: `${senderName} sizga ${formatTiyin(amountTiyin)} yubordi.`,
    actionUrl: '/wallet',
    sourceModule: 'wallet',
  }),

  'payment.completed': ({ amountTiyin, providerName, paymentId }) => ({
    title: "To'lov bajarildi",
    body: `${providerName} uchun ${formatTiyin(amountTiyin)} to'landi. Chekni ko'rish uchun bosing.`,
    actionUrl: `/payments/receipt/${paymentId}`,
    sourceModule: 'payments',
  }),

  'security.password_changed': ({ revokedSessions }) => ({
    title: "Parol o'zgartirildi",
    body:
      revokedSessions > 0
        ? `Parolingiz o'zgartirildi. Xavfsizlik uchun boshqa ${revokedSessions} ta qurilma tizimdan chiqarildi.`
        : "Parolingiz muvaffaqiyatli o'zgartirildi.",
    actionUrl: '/security',
    sourceModule: 'auth',
  }),
};

/** Hodisa nomidan tayyor matn yasaydi. */
export function buildNotification<Event extends NotificationEventName>(
  event: Event,
  data: NotificationEventData[Event],
): NotificationTemplate {
  return NOTIFICATION_TEMPLATES[event](data);
}
