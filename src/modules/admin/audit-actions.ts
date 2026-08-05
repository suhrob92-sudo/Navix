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

  'admin.provider.created': "Yangi xizmat qo'shdi",
  'admin.provider.updated': 'Xizmatni tahrirladi',
  'admin.user.status_changed': "Foydalanuvchi holatini o'zgartirdi",
  'admin.role.granted': 'Rol berdi',
  'admin.role.revoked': 'Rolni olib tashladi',
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
  ],
  ADMIN: [
    'admin.provider.created',
    'admin.provider.updated',
    'admin.user.status_changed',
    'admin.role.granted',
    'admin.role.revoked',
    'merchant.order.status_changed',
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
