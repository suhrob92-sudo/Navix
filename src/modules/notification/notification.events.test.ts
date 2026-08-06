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
  'security.password_changed': { revokedSessions: 3 },
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
