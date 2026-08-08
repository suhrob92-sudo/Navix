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
  'market.order_created': {
    orderId: string;
    orderNumber: string;
    shopName: string;
    amountTiyin: number;
    deliveryDays: number;
  };
  'market.order_cancelled': {
    orderId: string;
    orderNumber: string;
    shopName: string;
    amountTiyin: number;
  };
  'market.order_status_changed': {
    orderId: string;
    orderNumber: string;
    shopName: string;
    status: 'CONFIRMED' | 'PACKING' | 'SHIPPED' | 'DELIVERED';
  };
  'market.order_rejected': {
    orderId: string;
    orderNumber: string;
    shopName: string;
    amountTiyin: number;
    reason: string;
  };
  'delivery.courier_assigned': {
    orderUrl: string;
    orderNumber: string;
    courierName: string;
    courierPhone: string;
  };
  'delivery.picked_up': {
    orderUrl: string;
    orderNumber: string;
    courierName: string;
  };
  'courier.delivery_paid': {
    deliveryId: string;
    orderNumber: string;
    amountTiyin: number;
  };
  'job.application_sent': {
    applicationId: string;
    vacancyTitle: string;
    companyName: string;
  };
  'job.application_invited': {
    applicationId: string;
    vacancyTitle: string;
    companyName: string;
    /** Ish beruvchining izohi — bo'lmasligi mumkin. */
    note: string | null;
  };
  'job.application_rejected': {
    applicationId: string;
    vacancyTitle: string;
    companyName: string;
    note: string | null;
  };
  'parcel.created': {
    parcelId: string;
    parcelNumber: string;
    toRegion: string;
    amountTiyin: number;
  };
  'parcel.cancelled': {
    parcelId: string;
    parcelNumber: string;
    refundTiyin: number;
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

/** Marketplace bosqichlari uchun sarlavhalar. */
const MARKET_STATUS_TITLES = {
  CONFIRMED: 'Buyurtma qabul qilindi',
  PACKING: "Buyurtma yig'ilmoqda",
  SHIPPED: "Buyurtma yo'lga chiqdi",
  DELIVERED: 'Buyurtma yetkazildi',
} as const;

const MARKET_STATUS_BODIES = {
  CONFIRMED: 'buyurtmangizni qabul qildi.',
  PACKING: 'buyurtmangizni omborda yig\'moqda.',
  SHIPPED: "buyurtmangiz yo'lga chiqarildi.",
  DELIVERED: 'buyurtmangiz yetkazib berildi. Xaridingiz muborak!',
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

  /** Yuborildi — restoran tasdig'i ALOHIDA xabar bilan keladi. */
  'food.order_created': ({ orderId, restaurantName, amountTiyin, deliveryMinutes }) => ({
    title: 'Buyurtma yuborildi',
    body: `${restaurantName} buyurtmangizni ko'rib chiqmoqda. ${formatTiyin(amountTiyin)} to'landi, taxminan ${deliveryMinutes} daqiqada yetkaziladi.`,
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

  /**
   * Buyurtma YUBORILDI — hali qabul qilinmadi.
   *
   * 16-bosqichgacha bu yerda "qabul qilindi" deb yozilardi, chunki
   * buyurtmani hech kim ko'rmasdi. Endi do'kon uni o'zi tasdiqlaydi va
   * xaridor tasdiqni ALOHIDA xabar bilan biladi — aks holda ikkita
   * xabar bir xil narsani aytardi.
   */
  'market.order_created': ({ orderId, shopName, amountTiyin, deliveryDays }) => ({
    title: 'Buyurtma yuborildi',
    body: `${shopName} buyurtmangizni ko'rib chiqmoqda. ${formatTiyin(amountTiyin)} to'landi, taxminan ${deliveryDays} kunda yetkaziladi.`,
    actionUrl: `/marketplace/orders/${orderId}`,
    sourceModule: 'market',
  }),

  'market.order_cancelled': ({ orderId, shopName, amountTiyin }) => ({
    title: 'Buyurtma bekor qilindi',
    body: `${shopName} buyurtmasi bekor qilindi. ${formatTiyin(amountTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/marketplace/orders/${orderId}`,
    sourceModule: 'market',
  }),

  /**
   * Marketplace bosqichlari.
   *
   * Ovqatdan farqi vaqtda: ovqat 40 daqiqada keladi, mahsulot esa
   * kunlab yo'lda bo'ladi. Shuning uchun har bosqich haqida xabar
   * berish bu yerda YANADA muhim — xaridor "buyurtmam unutildimi"
   * degan shubhaga tushmasligi kerak.
   */
  'market.order_status_changed': ({ orderId, shopName, status }) => ({
    title: MARKET_STATUS_TITLES[status],
    body: `${shopName}: ${MARKET_STATUS_BODIES[status]}`,
    actionUrl: `/marketplace/orders/${orderId}`,
    sourceModule: 'market',
  }),

  'market.order_rejected': ({ orderId, shopName, amountTiyin, reason }) => ({
    title: "Do'kon buyurtmani rad etdi",
    body: `${shopName} buyurtmangizni bajara olmadi (${reason}). ${formatTiyin(amountTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/marketplace/orders/${orderId}`,
    sourceModule: 'market',
  }),

  /**
   * Kuryer topildi.
   *
   * Matnda TELEFON RAQAMI bor va bu ataylab: mijoz ko'pincha
   * "domofon ishlamayapti" deb qo'ng'iroq qilishi kerak bo'ladi va
   * o'sha paytda ilovani ochib qidirishga vaqt bo'lmaydi.
   */
  'delivery.courier_assigned': ({ orderUrl, courierName, courierPhone }) => ({
    title: 'Kuryer topildi',
    body: `${courierName} buyurtmangizni yetkazadi. Aloqa: ${courierPhone}`,
    actionUrl: orderUrl,
    sourceModule: 'delivery',
  }),

  'delivery.picked_up': ({ orderUrl, courierName }) => ({
    title: "Kuryer yo'lda",
    body: `${courierName} buyurtmangizni olib chiqdi va yo'lga chiqdi.`,
    actionUrl: orderUrl,
    sourceModule: 'delivery',
  }),

  /** Kuryerning O'ZIGA — topshirilgach haq yozildi. */
  'courier.delivery_paid': ({ orderNumber, amountTiyin }) => ({
    title: 'Yetkazish haqi yozildi',
    body: `${orderNumber} buyurtmasi uchun ${formatTiyin(amountTiyin)} hamyoningizga qo'shildi.`,
    actionUrl: '/wallet',
    sourceModule: 'delivery',
  }),

  /**
   * Ariza yuborilgani tasdiqlanadi.
   *
   * Nima uchun kerak: ariza yuborilgandan keyin javob KUNLAB kelmasligi
   * mumkin. Tasdiq bo'lmasa, nomzod "yuborildimi?" deb ikkilanadi va
   * ko'pincha qayta yuborishga urinadi.
   */
  'job.application_sent': ({ vacancyTitle, companyName }) => ({
    title: 'Ariza yuborildi',
    body: `${companyName} — "${vacancyTitle}" lavozimiga arizangiz yuborildi. Javobni shu yerda kuting.`,
    actionUrl: '/jobs/applications',
    sourceModule: 'jobs',
  }),

  /**
   * Suhbatga taklif — moduldagi eng kutilgan xabar.
   *
   * Ish beruvchining izohi bo'lsa, u MATNGA qo'shiladi: odatda
   * aynan shu yerda "ertaga soat 10 da keling" deb yoziladi va uni
   * yashirish xabarni foydasiz qilardi.
   */
  'job.application_invited': ({ vacancyTitle, companyName, note }) => ({
    title: 'Sizni suhbatga taklif qilishdi',
    body: note
      ? `${companyName} — "${vacancyTitle}". ${note}`
      : `${companyName} — "${vacancyTitle}" lavozimi bo'yicha siz bilan bog'lanishadi.`,
    actionUrl: '/jobs/applications',
    sourceModule: 'jobs',
  }),

  /**
   * Rad javobi ham YUBORILADI.
   *
   * Jimlik eng yomon javob: nomzod haftalab kutadi va boshqa ish
   * qidirmaydi. Aniq javob esa uni oldinga qo'yib yuboradi.
   */
  'job.application_rejected': ({ vacancyTitle, companyName, note }) => ({
    title: 'Ariza bo\'yicha javob keldi',
    body: note
      ? `${companyName} — "${vacancyTitle}". ${note}`
      : `${companyName} — "${vacancyTitle}" lavozimiga bu safar boshqa nomzod tanlandi. Boshqa e'lonlarni ko'rib chiqing.`,
    actionUrl: '/jobs/applications',
    sourceModule: 'jobs',
  }),

  /**
   * Jo'natma qabul qilindi.
   *
   * Kuzatuv raqami MATNGA yoziladi: foydalanuvchi uni qabul
   * qiluvchiga yuboradi va u posilkani shu raqam bo'yicha so'raydi.
   */
  'parcel.created': ({ parcelId, parcelNumber, toRegion, amountTiyin }) => ({
    title: "Posilka qabul qilindi",
    body: `${parcelNumber} — ${toRegion} yo'nalishi. ${formatTiyin(amountTiyin)} yechildi. Kuryer tez orada olib ketadi.`,
    actionUrl: `/delivery/${parcelId}`,
    sourceModule: 'delivery',
  }),

  'parcel.cancelled': ({ parcelId, parcelNumber, refundTiyin }) => ({
    title: 'Jo\'natma bekor qilindi',
    body: `${parcelNumber} bekor qilindi. ${formatTiyin(refundTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/delivery/${parcelId}`,
    sourceModule: 'delivery',
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
