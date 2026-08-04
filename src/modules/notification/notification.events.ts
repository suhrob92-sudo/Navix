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
  'payment.refunded': { amountTiyin: number; providerName: string; paymentId: string };
  'food.order_created': {
    orderId: string;
    orderNumber: string;
    restaurantName: string;
    amountTiyin: number;
    deliveryMinutes: number;
  };
  'food.order_cancelled': {
    orderId: string;
    orderNumber: string;
    restaurantName: string;
    amountTiyin: number;
  };
  'food.order_status_changed': {
    orderId: string;
    orderNumber: string;
    restaurantName: string;
    status: 'CONFIRMED' | 'PREPARING' | 'DELIVERING' | 'DELIVERED';
  };
  'food.order_rejected': {
    orderId: string;
    orderNumber: string;
    restaurantName: string;
    amountTiyin: number;
    reason: string;
  };
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

/** Buyurtma bosqichlari uchun sarlavhalar. */
const FOOD_STATUS_TITLES = {
  CONFIRMED: 'Buyurtma qabul qilindi',
  PREPARING: 'Ovqat tayyorlanmoqda',
  DELIVERING: "Kuryer yo'lda",
  DELIVERED: 'Buyurtma yetkazildi',
} as const;

const FOOD_STATUS_BODIES = {
  CONFIRMED: 'buyurtmangizni qabul qildi.',
  PREPARING: 'oshxona buyurtmangizni tayyorlashni boshladi.',
  DELIVERING: 'kuryer buyurtmangiz bilan yo\'lga chiqdi.',
  DELIVERED: 'buyurtmangiz yetkazib berildi. Yoqimli ishtaha!',
} as const;

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

  /**
   * Pul qaytarilganda foydalanuvchi buni DARHOL bilishi kerak: aks holda
   * u qayta to'laydi yoki qo'llab-quvvatlashga ikkinchi marta yozadi.
   */
  'payment.refunded': ({ amountTiyin, providerName, paymentId }) => ({
    title: 'Pul qaytarildi',
    body: `${providerName} to'lovi bekor qilindi. ${formatTiyin(amountTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/payments/receipt/${paymentId}`,
    sourceModule: 'payments',
  }),

  'food.order_created': ({ orderId, restaurantName, amountTiyin, deliveryMinutes }) => ({
    title: 'Buyurtma qabul qilindi',
    body: `${restaurantName} buyurtmangizni qabul qildi. ${formatTiyin(amountTiyin)} to'landi, taxminan ${deliveryMinutes} daqiqada yetkaziladi.`,
    actionUrl: `/orders/${orderId}`,
    sourceModule: 'food',
  }),

  'food.order_cancelled': ({ orderId, restaurantName, amountTiyin }) => ({
    title: 'Buyurtma bekor qilindi',
    body: `${restaurantName} buyurtmasi bekor qilindi. ${formatTiyin(amountTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/orders/${orderId}`,
    sourceModule: 'food',
  }),

  /**
   * Har bosqichda xabar yuboriladi: mijoz ovqat qayerdaligini bilmasa,
   * u restoranga qo'ng'iroq qiladi yoki ilovani qayta-qayta ochadi.
   */
  'food.order_status_changed': ({ orderId, restaurantName, status }) => ({
    title: FOOD_STATUS_TITLES[status],
    body: `${restaurantName}: ${FOOD_STATUS_BODIES[status]}`,
    actionUrl: `/orders/${orderId}`,
    sourceModule: 'food',
  }),

  'food.order_rejected': ({ orderId, restaurantName, amountTiyin, reason }) => ({
    title: 'Restoran buyurtmani rad etdi',
    body: `${restaurantName} buyurtmangizni qabul qila olmadi (${reason}). ${formatTiyin(amountTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/orders/${orderId}`,
    sourceModule: 'food',
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
