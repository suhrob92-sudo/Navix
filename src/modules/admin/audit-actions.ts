/**
 * Audit amallarining O'ZBEKCHA nomlari.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * `src/lib/audit.ts` serverda ishlaydi va Prisma'ga bog'liq. Bu ro'yxat
 * esa BRAUZERDA kerak — jurnal sahifasida `user.login.success` o'rniga
 * "Tizimga kirdi" ko'rsatiladi. Shuning uchun toza, bog'liqliksiz fayl.
 *
 * ── Nima uchun `Record` emas, funksiya ────────────────────────────────
 * Jurnal ESKI yozuvlarni ham ko'rsatadi. Kelajakda amal o'chirilsa yoki
 * nomi o'zgarsa, eski yozuv baribir bazada qoladi. Shuning uchun
 * noma'lum kalit uchun ham mazmunli matn qaytariladi — sahifa hech
 * qachon bo'sh katak ko'rsatmaydi.
 */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.registered': "Ro'yxatdan o'tdi",
  'user.phone_verified': 'Telefonni tasdiqladi',
  'user.login.success': 'Tizimga kirdi',
  'user.login.failed': 'Kirish urinishi muvaffaqiyatsiz',
  'user.logout': 'Tizimdan chiqdi',
  /** Endi yozilmaydi, lekin ESKI yozuvlar bazada qolgan. */
  'user.token.refreshed': 'Tokenni yangiladi',
  'user.password.reset_requested': "Parolni tiklashni so'radi",
  'user.password.reset_completed': 'Parolni tikladi',
  'user.password.set_by_cli': "Parol serverdan o'rnatildi",
  'user.account.deleted': 'Hisobini yopdi',
  'session.revoked': 'Sessiyani bekor qildi',

  'wallet.top_up': "Hamyonni to'ldirdi",
  'wallet.transfer': "Pul o'tkazdi",
  'payment.service': "Xizmat uchun to'ladi",
  'payment.service.refunded': 'Pulni qaytardi',
  'food.order.created': 'Ovqat buyurtma qildi',
  'food.order.cancelled': 'Buyurtmani bekor qildi',
  'market.order.created': 'Marketplace buyurtmasi berdi',
  'market.order.cancelled': 'Marketplace buyurtmasini bekor qildi',
  'merchant.order.status_changed': "Buyurtma holatini o'zgartirdi",
  'merchant.order.rejected': 'Buyurtmani rad etdi',
  'merchant.restaurant.assigned': 'Restoran biriktirildi',
  'merchant.restaurant.unassigned': 'Restoran olib tashlandi',

  'seller.order.status_changed': "Do'kon buyurtma holatini o'zgartirdi",
  'seller.order.rejected': "Do'kon buyurtmani rad etdi",
  'seller.product.created': "Yangi mahsulot qo'shdi",
  'seller.product.updated': 'Mahsulotni tahrirladi',
  'seller.shop.updated': "Do'kon sozlamasini o'zgartirdi",
  'seller.shop.assigned': "Do'kon biriktirildi",
  'seller.shop.unassigned': "Do'kon olib tashlandi",

  'courier.delivery.accepted': 'Kuryer topshiriqni oldi',
  'courier.delivery.picked_up': 'Kuryer buyurtmani olib chiqdi',
  'courier.delivery.completed': 'Kuryer yetkazib berdi',
  'courier.delivery.released': 'Kuryer topshiriqdan voz kechdi',
  'job.application.sent': 'Ish uchun ariza yubordi',
  'job.application.withdrawn': 'Arizani qaytarib oldi',
  'parcel.created': "Posilka jo'natdi",
  'parcel.cancelled': 'Posilkani bekor qildi',
  'hotel.booking.created': 'Mehmonxona band qildi',
  'hotel.booking.cancelled': 'Bandlovni bekor qildi',
  'travel.ticket.created': 'Sayohat chiptasini oldi',
  'travel.ticket.cancelled': 'Chiptani bekor qildi',
  'job.vacancy.created': 'Vakansiya joyladi',
  'job.vacancy.updated': "Vakansiyani o'zgartirdi",
  'job.application.reviewed': "Arizani ko'rib chiqdi",
  'employer.assigned': 'Ish beruvchi roli berildi',
  'employer.unassigned': 'Ish beruvchi roli olib tashlandi',

  'courier.assigned': 'Kuryer roli berildi',
  'courier.unassigned': 'Kuryer roli olib tashlandi',

  'admin.provider.created': "Yangi xizmat qo'shdi",
  'admin.provider.updated': 'Xizmatni tahrirladi',
  'admin.user.status_changed': "Foydalanuvchi holatini o'zgartirdi",
  'admin.role.granted': 'Rol berdi',
  'admin.role.revoked': 'Rolni olib tashladi',
  'admin.report.resolved': 'Shikoyatni yopdi',
  'admin.module.disabled': "Bo'limni vaqtincha yopdi",
  'admin.module.enabled': "Bo'limni qayta ochdi",
  'admin.business.disabled': 'Biznesni vaqtincha yopdi',
  'admin.business.enabled': 'Biznesni qayta ochdi',
};

/**
 * Jurnalda filtrlash uchun ko'rsatiladigan amallar.
 *
 * Hammasi emas, faqat DIQQAT TALAB QILADIGANLARI: xodim jurnalga
 * kirganda odatda "kim nimani o'zgartirdi" yoki "pul qayerga ketdi"
 * degan savolga javob qidiradi, "kim qachon kirdi" degan emas.
 */
export const AUDIT_FILTER_GROUPS = [
  { value: 'ALL', label: 'Hammasi' },
  { value: 'MONEY', label: 'Pul' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'AUTH', label: 'Kirish' },
] as const;

export type AuditFilterGroup = (typeof AUDIT_FILTER_GROUPS)[number]['value'];

/** Har bir guruhga qaysi amallar kiradi. */
export const AUDIT_GROUP_ACTIONS: Record<Exclude<AuditFilterGroup, 'ALL'>, readonly string[]> = {
  MONEY: [
    'wallet.top_up',
    'wallet.transfer',
    'payment.service',
    'payment.service.refunded',
    'food.order.created',
    'food.order.cancelled',
    'market.order.created',
    'market.order.cancelled',
    'merchant.order.rejected',
    'seller.order.rejected',
    'courier.delivery.completed',
    'parcel.created',
    'parcel.cancelled',
    'hotel.booking.created',
    'hotel.booking.cancelled',
    'travel.ticket.created',
    'travel.ticket.cancelled',
  ],
  ADMIN: [
    'admin.provider.created',
    'admin.provider.updated',
    'admin.user.status_changed',
    'admin.role.granted',
    'admin.role.revoked',
    'admin.report.resolved',
    'admin.module.disabled',
    'admin.module.enabled',
    'admin.business.disabled',
    'admin.business.enabled',
    'merchant.order.status_changed',
    'seller.order.status_changed',
    'seller.product.created',
    'seller.product.updated',
    'seller.shop.updated',
    'courier.delivery.accepted',
    'courier.delivery.picked_up',
    'courier.delivery.released',
  ],
  AUTH: [
    'user.registered',
    'user.phone_verified',
    'user.login.success',
    'user.login.failed',
    'user.logout',
    'user.password.reset_requested',
    'user.password.reset_completed',
    'session.revoked',
  ],
};

/** Amalning o'qiladigan nomi. Noma'lum bo'lsa kalitning o'zi qaytadi. */
export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/**
 * Amal qanchalik jiddiy — ro'yxatda rang tanlash uchun.
 *
 * Pul harakati va admin amallari ajralib turishi kerak: jurnalda
 * yuzlab "kirdi/chiqdi" yozuvi orasida ular yo'qolib ketmasin.
 */
export function auditActionTone(action: string): 'money' | 'admin' | 'danger' | 'neutral' {
  if (action === 'user.login.failed') return 'danger';
  if (AUDIT_GROUP_ACTIONS.MONEY.includes(action)) return 'money';
  if (AUDIT_GROUP_ACTIONS.ADMIN.includes(action)) return 'admin';

  return 'neutral';
}
