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
  'hotel.booking_created': {
    bookingId: string;
    bookingNumber: string;
    hotelName: string;
    checkIn: string;
    nights: number;
    amountTiyin: number;
  };
  'hotel.booking_cancelled': {
    bookingId: string;
    bookingNumber: string;
    hotelName: string;
    refundTiyin: number;
  };
  'travel.ticket_created': {
    ticketId: string;
    ticketNumber: string;
    fromCity: string;
    toCity: string;
    departDate: string;
    /** Jo'nash soati: "08:20". */
    departTime: string;
    seats: number;
    amountTiyin: number;
  };
  'travel.ticket_cancelled': {
    ticketId: string;
    ticketNumber: string;
    fromCity: string;
    toCity: string;
    /** Haqiqatda qaytarilgan summa. */
    refundTiyin: number;
    /** To'langan summa — jarima ushlanganini ko'rsatish uchun. */
    paidTiyin: number;
  };
  'social.new_follower': {
    followerId: string;
    followerName: string;
    followerUsername: string;
  };
  'feed.post_liked': {
    postId: string;
    actorName: string;
  };
  'feed.post_commented': {
    postId: string;
    actorName: string;
    /** Izohning boshi — ochmasdan turib nima yozilganini bilish uchun. */
    preview: string;
  };
  'feed.comment_replied': {
    postId: string;
    actorName: string;
    preview: string;
  };
  'feed.comment_liked': {
    postId: string;
    actorName: string;
  };
  'feed.mentioned': {
    postId: string;
    actorName: string;
  };
  'feed.product_clicked': {
    postId: string;
    productName: string;
    /** Nechinchi bosish — bosqich soni. */
    clickCount: number;
  };
  /**
   * Hamkorlik taklifi keldi — IJODKOR uchun.
   *
   * Bu oddiy xabar emas: unga javob berish kerak va javobsiz
   * qolgan taklif ikkala tomonni ham kutib qoldiradi.
   */
  'collab.offer_received': {
    offerId: string;
    subject: string;
    actorName: string;
  };
  /**
   * Jonli efir BOSHLANDI.
   *
   * ── Nima uchun faqat "eslatib qo'y" bosganlarga ─────────────────────
   * Har efirda barcha obunachiga xabar yuborilsa, odamlar xabarlarni
   * butunlay o'chirib qo'yardi — va keyin haqiqatan muhim xabar ham
   * yetib bormasdi.
   *
   * Bu xabarni odam O'ZI so'ragan: u "eslatib qo'y" tugmasini
   * bosgan.
   */
  'live.started': {
    streamId: string;
    title: string;
    hostName: string;
  };
  /** Taklifga javob berildi — YUBORUVCHI uchun. */
  'collab.offer_answered': {
    offerId: string;
    subject: string;
    actorName: string;
    isAccepted: boolean;
  };
  'security.password_changed': { revokedSessions: number };
  'support.replied': {
    ticketId: string;
    ticketNumber: string;
    subject: string;
  };
  'support.resolved': {
    ticketId: string;
    ticketNumber: string;
    subject: string;
  };
  'call.missed': {
    conversationId: string;
    callerName: string;
    /** Qabul qiluvchi o'zi rad etganmi. */
    wasDeclined: boolean;
    isVideo: boolean;
  };
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
  DELIVERING: "kuryer buyurtmangiz bilan yo'lga chiqdi.",
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
  PACKING: "buyurtmangizni omborda yig'moqda.",
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
    title: "Ariza bo'yicha javob keldi",
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
    title: 'Posilka qabul qilindi',
    body: `${parcelNumber} — ${toRegion} yo'nalishi. ${formatTiyin(amountTiyin)} yechildi. Kuryer tez orada olib ketadi.`,
    actionUrl: `/delivery/${parcelId}`,
    sourceModule: 'delivery',
  }),

  'parcel.cancelled': ({ parcelId, parcelNumber, refundTiyin }) => ({
    title: "Jo'natma bekor qilindi",
    body: `${parcelNumber} bekor qilindi. ${formatTiyin(refundTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/delivery/${parcelId}`,
    sourceModule: 'delivery',
  }),

  /**
   * Bandlov tasdiqlandi.
   *
   * Kirish SANASI matnga yoziladi: mehmon uni eslab qolishi kerak
   * va bildirishnomani ochmasdan ko'radi.
   */
  'hotel.booking_created': ({ bookingId, bookingNumber, hotelName, checkIn, nights, amountTiyin }) => ({
    title: 'Xona band qilindi',
    body: `${hotelName} — ${checkIn} dan ${nights} kecha. ${formatTiyin(amountTiyin)} to'landi. Raqam: ${bookingNumber}`,
    actionUrl: `/hotel/bookings/${bookingId}`,
    sourceModule: 'hotel',
  }),

  'hotel.booking_cancelled': ({ bookingId, bookingNumber, hotelName, refundTiyin }) => ({
    title: 'Bandlov bekor qilindi',
    body: `${hotelName} bandlovi (${bookingNumber}) bekor qilindi. ${formatTiyin(refundTiyin)} hamyoningizga qaytarildi.`,
    actionUrl: `/hotel/bookings/${bookingId}`,
    sourceModule: 'hotel',
  }),

  /**
   * Chipta olindi.
   *
   * Jo'nash SANASI va SOATI matnga yoziladi: yo'lovchi ularni eslab
   * qolishi kerak va bildirishnomani ochmasdan ko'radi.
   */
  'travel.ticket_created': ({
    ticketId,
    ticketNumber,
    fromCity,
    toCity,
    departDate,
    departTime,
    seats,
    amountTiyin,
  }) => ({
    title: 'Chipta olindi',
    body: `${fromCity} → ${toCity}, ${departDate} ${departTime}. ${seats} o'rin, ${formatTiyin(amountTiyin)}. Raqam: ${ticketNumber}`,
    actionUrl: `/travel/tickets/${ticketId}`,
    sourceModule: 'travel',
  }),

  /**
   * Chipta bekor qilindi.
   *
   * Jarima ushlangan bo'lsa, matn buni ATAYLAB ochiq aytadi: "qancha
   * to'lagan edim, qancha qaytdi" degan savol javobsiz qolmasligi
   * kerak.
   */
  'travel.ticket_cancelled': ({ ticketId, ticketNumber, fromCity, toCity, refundTiyin, paidTiyin }) => ({
    title: 'Chipta bekor qilindi',
    body:
      refundTiyin >= paidTiyin
        ? `${fromCity} → ${toCity} chiptasi (${ticketNumber}) bekor qilindi. ${formatTiyin(refundTiyin)} hamyoningizga qaytarildi.`
        : `${fromCity} → ${toCity} chiptasi (${ticketNumber}) bekor qilindi. To'langan ${formatTiyin(paidTiyin)} dan ${formatTiyin(refundTiyin)} qaytarildi — kech bekor qilinganda jarima ushlanadi.`,
    actionUrl: `/travel/tickets/${ticketId}`,
    sourceModule: 'travel',
  }),

  /**
   * Yangi obunachi.
   *
   * Havola profilga olib boradi: odam "kim ekan?" deb darhol
   * ko'ra oladi.
   */
  'social.new_follower': ({ followerName, followerUsername }) => ({
    title: 'Yangi obunachi',
    body: `${followerName} sizga obuna bo'ldi.`,
    actionUrl: followerUsername ? `/u/${followerUsername}` : '/profile',
    sourceModule: 'profile',
  }),

  'feed.post_liked': ({ postId, actorName }) => ({
    title: 'Postingiz yoqdi',
    body: `${actorName} postingizni yoqtirdi.`,
    actionUrl: `/feed/${postId}`,
    sourceModule: 'feed',
  }),

  'feed.post_commented': ({ postId, actorName, preview }) => ({
    title: 'Yangi izoh',
    body: `${actorName}: ${preview}`,
    actionUrl: `/feed/${postId}`,
    sourceModule: 'feed',
  }),

  'feed.comment_replied': ({ postId, actorName, preview }) => ({
    title: 'Izohingizga javob',
    body: `${actorName}: ${preview}`,
    actionUrl: `/feed/${postId}`,
    sourceModule: 'feed',
  }),

  'feed.comment_liked': ({ postId, actorName }) => ({
    title: 'Izohingiz yoqdi',
    body: `${actorName} izohingizni yoqtirdi.`,
    actionUrl: `/feed/${postId}`,
    sourceModule: 'feed',
  }),

  'feed.mentioned': ({ postId, actorName }) => ({
    title: 'Sizni esladilar',
    body: `${actorName} sizni postda esladi.`,
    actionUrl: `/feed/${postId}`,
    sourceModule: 'feed',
  }),

  /**
   * Mahsulot tugmasi bosilishi — SOTUVCHI uchun asosiy yangilik.
   *
   * Matn ataylab sonni oldinga chiqaradi: sotuvchi bir qarashda
   * videosi ishlayaptimi yoki yo'qmi — bilib oladi.
   */
  'feed.product_clicked': ({ postId, productName, clickCount }) => ({
    title: 'Videongiz sotuvga ishlayapti',
    body:
      clickCount === 1
        ? `Kimdir videongizdagi "${productName}" mahsulotini ochdi.`
        : `Videongizdagi "${productName}" ${clickCount} marta ochildi.`,
    actionUrl: `/feed/${postId}`,
    sourceModule: 'feed',
  }),

  'collab.offer_received': ({ subject, actorName }) => ({
    title: 'Hamkorlik taklifi',
    body: `${actorName}: "${subject}"`,
    actionUrl: '/feed/collab',
    sourceModule: 'collab',
  }),

  'live.started': ({ title, hostName }) => ({
    title: 'Efir boshlandi',
    body: `${hostName}: "${title}"`,
    actionUrl: '/feed/live',
    sourceModule: 'live',
  }),

  /**
   * Javob matni HOLATNI oldinga chiqaradi.
   *
   * "Javob keldi" degan yozuv odamni ilovaga kirishga majbur
   * qilardi. Qabul qilinganmi yoki yo'qmi — bir qarashda
   * ko'rinishi kerak.
   */
  'collab.offer_answered': ({ subject, actorName, isAccepted }) => ({
    title: isAccepted ? 'Taklifingiz qabul qilindi' : 'Taklifingiz rad etildi',
    body: isAccepted
      ? `${actorName} "${subject}" taklifini qabul qildi. Suhbat ochildi.`
      : `${actorName} "${subject}" taklifini rad etdi.`,
    actionUrl: '/feed/collab',
    sourceModule: 'collab',
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

  /**
   * Yordam xizmati javob berdi.
   *
   * ── Nima uchun bu MAJBURIY ──────────────────────────────────────────
   * Odam murojaat yozib, javobni kutadi. Xabar bo'lmasa, u ilovani
   * qayta-qayta ochib tekshirardi — yoki umuman unutib yuborardi va
   * javob o'qilmay qolardi.
   */
  'support.replied': ({ ticketId, ticketNumber, subject }) => ({
    title: 'Murojaatingizga javob berildi',
    body: `${ticketNumber} — ${subject}`,
    actionUrl: `/support/${ticketId}`,
    sourceModule: 'support',
  }),

  'support.resolved': ({ ticketId, ticketNumber, subject }) => ({
    title: 'Murojaatingiz hal qilindi',
    body: `${ticketNumber} — ${subject}`,
    actionUrl: `/support/${ticketId}`,
    sourceModule: 'support',
  }),

  /**
   * Javobsiz qo'ng'iroq.
   *
   * ── Nima uchun aynan BU hodisa yoziladi ─────────────────────────────
   * Har bir xabar uchun bildirishnoma yozilmaydi — ular suhbatlar
   * ro'yxatida o'z joyida turadi. Javobsiz qo'ng'iroq esa boshqacha:
   * u bir marta sodir bo'ladi va o'tib ketadi. Yozib qo'yilmasa, odam
   * kim qo'ng'iroq qilganini umuman bilmay qolardi.
   */
  'call.missed': ({ conversationId, callerName, wasDeclined, isVideo }) => ({
    title: wasDeclined ? "Qo'ng'iroq rad etildi" : "Javobsiz qo'ng'iroq",
    body: wasDeclined
      ? `${callerName} ning ${isVideo ? 'video ' : ''}qo'ng'irog'ini rad etdingiz.`
      : `${callerName} sizga ${isVideo ? 'video ' : ''}qo'ng'iroq qildi.`,
    actionUrl: `/messages/${conversationId}`,
    sourceModule: 'call',
  }),
};

/** Hodisa nomidan tayyor matn yasaydi. */
export function buildNotification<Event extends NotificationEventName>(
  event: Event,
  data: NotificationEventData[Event],
): NotificationTemplate {
  return NOTIFICATION_TEMPLATES[event](data);
}
