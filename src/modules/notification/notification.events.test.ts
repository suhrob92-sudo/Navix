import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_TEMPLATES,
  buildNotification,
  type NotificationEventName,
} from '@/modules/notification/notification.events';

/**
 * Bu matnlar foydalanuvchi KO'RADIGAN yagona narsa. Shuning uchun
 * ularning to'liqligi va aniqligi tekshiriladi.
 */

/** Har bir hodisa uchun namunaviy ma'lumot. */
const SAMPLES = {
  'wallet.topped_up': { amountTiyin: 5_000_000, balanceTiyin: 12_000_000 },
  'wallet.transfer_sent': { amountTiyin: 3_000_000, recipientName: 'Bobur Karimov' },
  'wallet.transfer_received': { amountTiyin: 3_000_000, senderName: 'Alisher Valiyev' },
  'payment.completed': {
    amountTiyin: 8_500_000,
    providerName: 'Uzonline',
    paymentId: '3a9e5aad-e0ca-4098-b59f-9bb9ce83a625',
  },
  'payment.refunded': {
    amountTiyin: 8_500_000,
    providerName: 'Uzonline',
    paymentId: '3a9e5aad-e0ca-4098-b59f-9bb9ce83a625',
  },
  'food.order_created': {
    orderId: '7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    restaurantName: 'Milliy Taomlar',
    amountTiyin: 9_500_000,
    deliveryMinutes: 45,
  },
  'food.order_cancelled': {
    orderId: '7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    restaurantName: 'Milliy Taomlar',
    amountTiyin: 9_500_000,
  },
  'food.order_status_changed': {
    orderId: '7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    restaurantName: 'Milliy Taomlar',
    status: 'PREPARING',
  },
  'food.order_rejected': {
    orderId: '7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    restaurantName: 'Milliy Taomlar',
    amountTiyin: 9_500_000,
    reason: 'mahsulot tugadi',
  },
  'market.order_created': {
    orderId: '9d4a2c71-6b8e-4f2a-8d1c-3e7b5a9f2c40',
    orderNumber: 'NVX-M-20260805-X9Y8Z7',
    shopName: 'Texnomart',
    amountTiyin: 429_000_000,
    deliveryDays: 2,
  },
  'market.order_cancelled': {
    orderId: '9d4a2c71-6b8e-4f2a-8d1c-3e7b5a9f2c40',
    orderNumber: 'NVX-M-20260805-X9Y8Z7',
    shopName: 'Texnomart',
    amountTiyin: 429_000_000,
  },
  'market.order_status_changed': {
    orderId: '9d4a2c71-6b8e-4f2a-8d1c-3e7b5a9f2c40',
    orderNumber: 'NVX-M-20260805-X9Y8Z7',
    shopName: 'Texnomart',
    status: 'PACKING',
  },
  'market.order_rejected': {
    orderId: '9d4a2c71-6b8e-4f2a-8d1c-3e7b5a9f2c40',
    orderNumber: 'NVX-M-20260805-X9Y8Z7',
    shopName: 'Texnomart',
    amountTiyin: 429_000_000,
    reason: 'omborda topilmadi',
  },
  'market.cart_reminder': {
    subject: 'Redmi Note 14 va yana 2 ta mahsulot',
    itemCount: 3,
  },
  'delivery.courier_assigned': {
    orderUrl: '/orders/7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    courierName: 'Jasur Toshmatov',
    courierPhone: '+998 90 123 45 67',
  },
  'delivery.picked_up': {
    orderUrl: '/orders/7c2f1b90-4f5e-4d1a-9c3e-2b8a6d5e4f10',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    courierName: 'Jasur Toshmatov',
  },
  'courier.delivery_paid': {
    deliveryId: '5a1b3c7d-9e2f-4a6b-8c1d-7e3f5a9b2c48',
    orderNumber: 'NVX-F-20260803-A1B2C3',
    amountTiyin: 1_000_000,
  },
  'job.application_sent': {
    applicationId: '2b8c4f61-7a3d-4e5b-9c2f-1d6e8a4b7c93',
    vacancyTitle: 'Frontend dasturchi (React)',
    companyName: 'Navix Tech',
  },
  'job.application_invited': {
    applicationId: '2b8c4f61-7a3d-4e5b-9c2f-1d6e8a4b7c93',
    vacancyTitle: 'Frontend dasturchi (React)',
    companyName: 'Navix Tech',
    note: 'Ertaga soat 10:00 da ofisimizga keling.',
  },
  'job.application_rejected': {
    applicationId: '2b8c4f61-7a3d-4e5b-9c2f-1d6e8a4b7c93',
    vacancyTitle: 'Frontend dasturchi (React)',
    companyName: 'Navix Tech',
    note: null,
  },
  'parcel.created': {
    parcelId: '7c1f9a52-3e4b-4d8a-9f2c-6b5e1a3d7c94',
    parcelNumber: 'NVX-P-20260806-A1B2C3',
    toRegion: 'Samarqand',
    amountTiyin: 3_500_000,
  },
  'parcel.cancelled': {
    parcelId: '7c1f9a52-3e4b-4d8a-9f2c-6b5e1a3d7c94',
    parcelNumber: 'NVX-P-20260806-A1B2C3',
    refundTiyin: 3_500_000,
  },
  'hotel.booking_created': {
    bookingId: '4e8b1c37-9a2d-4f65-8b3e-7c1a5d9f2e48',
    bookingNumber: 'NVX-H-20260806-A1B2C3',
    hotelName: 'Navruz Plaza',
    checkIn: '2026-08-10',
    nights: 2,
    amountTiyin: 90_000_000,
  },
  'hotel.booking_cancelled': {
    bookingId: '4e8b1c37-9a2d-4f65-8b3e-7c1a5d9f2e48',
    bookingNumber: 'NVX-H-20260806-A1B2C3',
    hotelName: 'Navruz Plaza',
    refundTiyin: 90_000_000,
  },
  'travel.ticket_created': {
    ticketId: '9d3c7e15-2f8a-4b6d-8e1c-5a7f3b9d2c64',
    ticketNumber: 'NVX-T-20260810-A1B2C3',
    fromCity: 'Toshkent',
    toCity: 'Samarqand',
    departDate: '2026-08-10',
    departTime: '08:00',
    seats: 2,
    amountTiyin: 42_000_000,
  },
  'travel.ticket_cancelled': {
    ticketId: '9d3c7e15-2f8a-4b6d-8e1c-5a7f3b9d2c64',
    ticketNumber: 'NVX-T-20260810-A1B2C3',
    fromCity: 'Toshkent',
    toCity: 'Samarqand',
    refundTiyin: 21_000_000,
    paidTiyin: 42_000_000,
  },
  'social.new_follower': {
    followerId: '6a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
    followerName: 'Bobur Karimov',
    followerUsername: 'bobur_k',
  },
  'feed.post_liked': {
    postId: '2b6f8d41-9c3e-4a5b-8d7f-1e0c9a4b6d23',
    actorName: 'Bobur Karimov',
  },
  'feed.post_commented': {
    postId: '2b6f8d41-9c3e-4a5b-8d7f-1e0c9a4b6d23',
    actorName: 'Bobur Karimov',
    preview: "Juda to'g'ri aytdingiz",
  },
  'feed.comment_replied': {
    postId: '2b6f8d41-9c3e-4a5b-8d7f-1e0c9a4b6d23',
    actorName: 'Bobur Karimov',
    preview: 'Men ham shunday deb hisoblayman',
  },
  'feed.comment_liked': {
    postId: '2b6f8d41-9c3e-4a5b-8d7f-1e0c9a4b6d23',
    actorName: 'Bobur Karimov',
  },
  'feed.mentioned': {
    postId: '2b6f8d41-9c3e-4a5b-8d7f-1e0c9a4b6d23',
    actorName: 'Bobur Karimov',
  },
  'feed.product_clicked': {
    postId: '2b6f8d41-9c3e-4a5b-8d7f-1e0c9a4b6d23',
    productName: 'Sport sumkasi 40L',
    clickCount: 10,
  },
  'security.password_changed': { revokedSessions: 3 },
  'support.replied': {
    ticketId: '4a2f8c1e-5b7d-4e3a-9f6c-1d8e2b5a7c93',
    ticketNumber: 'NVX-S-20260813-A1B2C3',
    subject: "Buyurtma yetkazilmadi",
  },
  'support.resolved': {
    ticketId: '4a2f8c1e-5b7d-4e3a-9f6c-1d8e2b5a7c93',
    ticketNumber: 'NVX-S-20260813-A1B2C3',
    subject: "Buyurtma yetkazilmadi",
  },
  'call.missed': {
    conversationId: '7f3a1c2e-8b4d-4e6a-9c1f-2d5e8a7b3c94',
    callerName: 'Bobur Karimov',
    wasDeclined: false,
    isVideo: false,
  },
  'collab.offer_received': {
    offerId: '2c9d4e1f-6a3b-4c8d-9e2f-1a5b7c3d9e4f',
    subject: 'Restoran haqida video',
    actorName: 'Milliy Taomlar',
  },
  'collab.offer_answered': {
    offerId: '2c9d4e1f-6a3b-4c8d-9e2f-1a5b7c3d9e4f',
    subject: 'Restoran haqida video',
    actorName: 'Bobur Karimov',
    isAccepted: true,
  },
  'live.started': {
    streamId: '7b1c9d3e-5f2a-4b8c-9d1e-3a6f8c2b5d4e',
    title: 'Retsept: osh',
    hostName: 'Milliy Taomlar',
  },
  'content.removed': {
    kind: 'POST',
    title: 'Yangi mahsulot haqida',
    reason: 'SPAM',
  },
  'content.restored': {
    kind: 'POST',
    title: 'Yangi mahsulot haqida',
  },
} as const;

const EVENTS = Object.keys(NOTIFICATION_TEMPLATES) as NotificationEventName[];

/** Egri apostroflar — loyihada faqat to'g'risi ishlatiladi. */
const CURLY_LEFT = '‘';
const CURLY_RIGHT = '’';

describe('bildirishnoma matnlari', () => {
  it('barcha hodisalar sinovda qamrab olingan', () => {
    // Yangi hodisa qo'shilsa, unga namuna yozish ham majburiy bo'ladi.
    expect(Object.keys(SAMPLES).sort()).toEqual([...EVENTS].sort());
  });

  it.each(EVENTS)("%s — to'liq va bo'sh emas", (event) => {
    const template = buildNotification(event, SAMPLES[event]);

    expect(template.title.trim().length).toBeGreaterThan(0);
    expect(template.body.trim().length).toBeGreaterThan(0);
    expect(template.sourceModule.trim().length).toBeGreaterThan(0);

    // Bazadagi chegaralar: title 150, body 1000.
    expect(template.title.length).toBeLessThanOrEqual(150);
    expect(template.body.length).toBeLessThanOrEqual(1000);
  });

  it.each(EVENTS)('%s — matnda undefined yoki NaN qolmagan', (event) => {
    const template = buildNotification(event, SAMPLES[event]);
    const combined = `${template.title} ${template.body}`;

    expect(combined).not.toContain('undefined');
    expect(combined).not.toContain('[object');
    expect(combined).not.toContain('NaN');
  });

  it.each(EVENTS)('%s — havola ichki manzil', (event) => {
    const template = buildNotification(event, SAMPLES[event]);

    if (template.actionUrl !== null) {
      // Tashqi manzil bo'lsa foydalanuvchi begona saytga tushib qolardi.
      expect(template.actionUrl.startsWith('/')).toBe(true);
    }
  });

  /**
   * Apostrof loyihada BIR XIL bo'lishi kerak.
   *
   * `formatTiyin` to'g'ri apostrof beradi ("so'm"). Matnda egri apostrof
   * ishlatilsa, bitta jumlada ikki xil belgi paydo bo'ladi va bu
   * tartibsiz ko'rinadi. Aynan shu xato birinchi yozilishida bo'lgan.
   */
  it.each(EVENTS)('%s — apostrof bir xil', (event) => {
    const template = buildNotification(event, SAMPLES[event]);
    const combined = `${template.title} ${template.body}`;

    expect(combined).not.toContain(CURLY_LEFT);
    expect(combined).not.toContain(CURLY_RIGHT);
  });

  it("summani o'qishga qulay ko'rinishda yozadi", () => {
    const template = buildNotification('wallet.topped_up', SAMPLES['wallet.topped_up']);

    // 5 000 000 tiyin = 50 000 so'm
    expect(template.body).toContain('50');
    expect(template.body).toContain("so'm");
  });

  it("o'tkazmada qabul qiluvchi ismi ko'rinadi", () => {
    const template = buildNotification('wallet.transfer_sent', SAMPLES['wallet.transfer_sent']);
    expect(template.body).toContain('Bobur Karimov');
  });

  it("chek havolasi to'lov ID sini o'z ichiga oladi", () => {
    const template = buildNotification('payment.completed', SAMPLES['payment.completed']);
    expect(template.actionUrl).toBe('/payments/receipt/3a9e5aad-e0ca-4098-b59f-9bb9ce83a625');
  });

  it("parol xabari qurilmalar soniga qarab o'zgaradi", () => {
    const withDevices = buildNotification('security.password_changed', { revokedSessions: 3 });
    const withoutDevices = buildNotification('security.password_changed', { revokedSessions: 0 });

    expect(withDevices.body).toContain('3');
    expect(withoutDevices.body).not.toContain('0 ta');
  });
});

describe("javobsiz qo'ng'iroq matni", () => {
  it('rad etilgan va javobsiz holat FARQLANADI', () => {
    // Ikkalasi bir xil yozilsa, odam nima bo'lganini bilmay qolardi.
    const missed = buildNotification('call.missed', {
      conversationId: '7f3a1c2e-8b4d-4e6a-9c1f-2d5e8a7b3c94',
      callerName: 'Bobur',
      wasDeclined: false,
      isVideo: false,
    });

    const declined = buildNotification('call.missed', {
      conversationId: '7f3a1c2e-8b4d-4e6a-9c1f-2d5e8a7b3c94',
      callerName: 'Bobur',
      wasDeclined: true,
      isVideo: false,
    });

    expect(missed.title).not.toBe(declined.title);
    expect(missed.body).not.toBe(declined.body);
  });

  it("video qo'ng'iroq alohida aytiladi", () => {
    const video = buildNotification('call.missed', {
      conversationId: '7f3a1c2e-8b4d-4e6a-9c1f-2d5e8a7b3c94',
      callerName: 'Bobur',
      wasDeclined: false,
      isVideo: true,
    });

    expect(video.body).toContain('video');
  });

  it('havola aynan SHU suhbatga olib boradi', () => {
    const template = buildNotification('call.missed', {
      conversationId: '7f3a1c2e-8b4d-4e6a-9c1f-2d5e8a7b3c94',
      callerName: 'Bobur',
      wasDeclined: false,
      isVideo: false,
    });

    expect(template.actionUrl).toBe('/messages/7f3a1c2e-8b4d-4e6a-9c1f-2d5e8a7b3c94');
  });
});
