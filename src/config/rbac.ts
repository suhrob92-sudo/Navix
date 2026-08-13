/**
 * RBAC — Role Based Access Control (rollarga asoslangan ruxsat tizimi).
 *
 * Oddiy tilda: kim nima qila olishini shu yerda belgilaymiz.
 *  - Permission (ruxsat) — bitta aniq amal, masalan "taxi:ride:create";
 *  - Role (rol) — ruxsatlar to'plami, masalan "DRIVER";
 *  - Foydalanuvchida bir nechta rol bo'lishi mumkin (mijoz ham, sotuvchi ham).
 *
 * Ruxsat nomi formati: `<modul>:<resurs>:<amal>`
 */

export const Permission = {
  // Platforma
  PLATFORM_ADMIN_ACCESS: 'platform:admin:access',
  PLATFORM_USER_READ: 'platform:user:read',
  PLATFORM_USER_UPDATE: 'platform:user:update',
  PLATFORM_USER_SUSPEND: 'platform:user:suspend',
  PLATFORM_AUDIT_READ: 'platform:audit:read',
  /**
   * Foydalanuvchilar shikoyatlarini ko'rish va yopish.
   *
   * Ataylab `PLATFORM_USER_READ` dan AJRATILGAN: shikoyat matnida
   * odamlarning shaxsiy nizosi yoziladi va uni har bir xodim
   * o'qishi shart emas.
   */
  PLATFORM_REPORT_MANAGE: 'platform:report:manage',
  /** Xizmat provayderlarini qo'shish va tahrirlash. */
  PLATFORM_PROVIDER_MANAGE: 'platform:provider:manage',
  /** Barcha foydalanuvchilarning tranzaksiyalarini ko'rish. */
  PLATFORM_TRANSACTION_READ: 'platform:transaction:read',
  /**
   * Foydalanuvchiga rol berish va olib tashlash.
   *
   * Ataylab FAQAT `SUPER_ADMIN` da: bu ruxsatga ega odam o'ziga
   * istalgan huquqni bera oladi, ya'ni u butun tizimning kaliti.
   */
  PLATFORM_ROLE_MANAGE: 'platform:role:manage',
  /**
   * Bo'limni vaqtincha yopish va qayta ochish.
   *
   * `SUPPORT` da ATAYLAB yo'q: bo'limni yopish butun mamlakat bo'ylab
   * buyurtmalarni to'xtatadi va daromadni nolga tushiradi. Bu
   * murojaatga javob berish darajasidagi qaror emas.
   */
  PLATFORM_MODULE_MANAGE: 'platform:module:manage',
  /**
   * Do'kon, restoran va mehmonxonani vaqtincha yopish.
   *
   * Bu ham `SUPPORT` da yo'q: bitta biznesning daromadini to'xtatish
   * tekshiruv va qaror talab qiladi.
   */
  PLATFORM_BUSINESS_MANAGE: 'platform:business:manage',
  /**
   * Alohida mahsulot, taom, post yoki vakansiyani yashirish.
   *
   * Biznesni yopishdan YENGILROQ chora: do'konda mingta mahsulot
   * bo'lib, ulardan bittasi qoidaga zid bo'lsa, butun do'konni
   * yopish qolgan 999 tasini ham to'xtatardi.
   */
  PLATFORM_CONTENT_MANAGE: 'platform:content:manage',
  /**
   * Ishga tushishdan oldingi navbat ro'yxatini ko'rish.
   *
   * Ro'yxatda telefon raqamlari bor — ular hali ro'yxatdan
   * o'tmagan odamlarniki. Shuning uchun bu alohida ruxsat.
   */
  PLATFORM_WAITLIST_READ: 'platform:waitlist:read',

  // Profil (har bir foydalanuvchi o'zi uchun)
  PROFILE_READ: 'profile:self:read',
  PROFILE_UPDATE: 'profile:self:update',

  // Hamyon va to'lovlar
  WALLET_READ: 'wallet:self:read',
  WALLET_TRANSFER: 'wallet:self:transfer',
  PAYMENT_CREATE: 'payment:transaction:create',
  PAYMENT_REFUND: 'payment:transaction:refund',

  // Taksi
  TAXI_RIDE_CREATE: 'taxi:ride:create',
  TAXI_RIDE_ACCEPT: 'taxi:ride:accept',
  TAXI_RIDE_CANCEL: 'taxi:ride:cancel',

  // Yetkazib berish
  DELIVERY_ORDER_CREATE: 'delivery:order:create',
  DELIVERY_ORDER_ACCEPT: 'delivery:order:accept',
  /**
   * Kuryer kabineti.
   *
   * `DELIVERY_ORDER_ACCEPT` dan alohida: qabul qilish — bitta AMAL,
   * kabinet esa butun bo'lim (topshiriqlar, daromad, tarix). Ertaga
   * dispetcher roli qo'shilsa, u kabinetni ko'radi-yu topshiriqni
   * o'ziga ola olmaydi.
   */
  COURIER_DASHBOARD_ACCESS: 'delivery:dashboard:access',

  // Savdo
  CATALOG_PRODUCT_READ: 'commerce:product:read',
  CATALOG_PRODUCT_MANAGE: 'commerce:product:manage',
  ORDER_CREATE: 'commerce:order:create',
  ORDER_MANAGE: 'commerce:order:manage',

  // Biznes
  MERCHANT_DASHBOARD_ACCESS: 'business:dashboard:access',
  MERCHANT_STAFF_MANAGE: 'business:staff:manage',
  /**
   * Sotuvchi kabineti — Marketplace do'koni.
   *
   * Restoran kabinetidan ALOHIDA ruxsat: ikkalasi ham `MERCHANT` roliga
   * beriladi, lekin kabinetlar boshqa modullar bilan ishlaydi va
   * kelajakda faqat bittasi berilishi mumkin (masalan do'kon egasi
   * restoran buyurtmalarini ko'rmasligi kerak).
   *
   * Haqiqiy chegara baribir EGALIKDA: kabinet faqat `shop.ownerId`
   * mos kelgan do'konlarni ko'rsatadi.
   */
  SELLER_DASHBOARD_ACCESS: 'business:shop:access',

  /**
   * Ish beruvchi kabineti.
   *
   * Sotuvchi kabinetidan ALOHIDA va bu ataylab: mahsulot sotadigan
   * do'kon bilan odam yollaydigan kompaniya — ikki xil biznes.
   * Bittasiga ruxsat berish ikkinchisini ochib yubormasligi kerak,
   * aks holda har bir do'kon egasi begona kompaniyaning nomzodlari
   * ro'yxatini ko'radigan bo'lardi.
   *
   * Haqiqiy chegara baribir EGALIKDA: kabinet faqat
   * `company.ownerId` mos kelgan kompaniyalarni ko'rsatadi.
   */
  EMPLOYER_DASHBOARD_ACCESS: 'business:employer:access',
  /** Vakansiya joylash va tahrirlash. */
  EMPLOYER_VACANCY_MANAGE: 'business:vacancy:manage',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

export const Role = {
  /** Oddiy foydalanuvchi — xizmatlardan foydalanadi. */
  CUSTOMER: 'CUSTOMER',
  /** Taksi haydovchisi. */
  DRIVER: 'DRIVER',
  /** Kuryer. */
  COURIER: 'COURIER',
  /** Sotuvchi / do'kon egasi. */
  MERCHANT: 'MERCHANT',
  /** Ish beruvchi — kompaniya nomidan vakansiya joylaydi. */
  EMPLOYER: 'EMPLOYER',
  /** Qo'llab-quvvatlash xodimi. */
  SUPPORT: 'SUPPORT',
  /** Platforma administratori. */
  ADMIN: 'ADMIN',
  /** Barcha ruxsatlarga ega bosh administrator. */
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];

const CUSTOMER_PERMISSIONS: PermissionValue[] = [
  Permission.PROFILE_READ,
  Permission.PROFILE_UPDATE,
  Permission.WALLET_READ,
  Permission.WALLET_TRANSFER,
  Permission.PAYMENT_CREATE,
  Permission.TAXI_RIDE_CREATE,
  Permission.TAXI_RIDE_CANCEL,
  Permission.DELIVERY_ORDER_CREATE,
  Permission.CATALOG_PRODUCT_READ,
  Permission.ORDER_CREATE,
];

/** Har bir rolga tegishli ruxsatlar jadvali. */
export const ROLE_PERMISSIONS: Readonly<Record<RoleValue, readonly PermissionValue[]>> = {
  [Role.CUSTOMER]: CUSTOMER_PERMISSIONS,

  [Role.DRIVER]: [...CUSTOMER_PERMISSIONS, Permission.TAXI_RIDE_ACCEPT],

  [Role.COURIER]: [...CUSTOMER_PERMISSIONS, Permission.DELIVERY_ORDER_ACCEPT, Permission.COURIER_DASHBOARD_ACCESS],

  [Role.MERCHANT]: [
    ...CUSTOMER_PERMISSIONS,
    Permission.CATALOG_PRODUCT_MANAGE,
    Permission.ORDER_MANAGE,
    Permission.MERCHANT_DASHBOARD_ACCESS,
    Permission.MERCHANT_STAFF_MANAGE,
    Permission.SELLER_DASHBOARD_ACCESS,
  ],

  /**
   * Ish beruvchida SAVDO ruxsatlari yo'q.
   *
   * U mahsulot ham sotmaydi, buyurtma ham boshqarmaydi — faqat
   * vakansiya joylaydi va arizalarni ko'rib chiqadi.
   */
  [Role.EMPLOYER]: [
    ...CUSTOMER_PERMISSIONS,
    Permission.EMPLOYER_DASHBOARD_ACCESS,
    Permission.EMPLOYER_VACANCY_MANAGE,
  ],

  /**
   * Qo'llab-quvvatlash xodimi admin panelga kiradi, lekin faqat
   * KO'RISH uchun: provayder tahrirlash va bloklash unda yo'q.
   */
  [Role.SUPPORT]: [
    ...CUSTOMER_PERMISSIONS,
    Permission.PLATFORM_ADMIN_ACCESS,
    Permission.PLATFORM_USER_READ,
    Permission.PLATFORM_TRANSACTION_READ,
    Permission.PAYMENT_REFUND,
    Permission.ORDER_MANAGE,
  ],

  [Role.ADMIN]: [
    ...CUSTOMER_PERMISSIONS,
    Permission.PLATFORM_ADMIN_ACCESS,
    Permission.PLATFORM_USER_READ,
    Permission.PLATFORM_USER_UPDATE,
    Permission.PLATFORM_USER_SUSPEND,
    Permission.PLATFORM_AUDIT_READ,
    Permission.PLATFORM_REPORT_MANAGE,
    Permission.PLATFORM_PROVIDER_MANAGE,
    Permission.PLATFORM_MODULE_MANAGE,
    Permission.PLATFORM_BUSINESS_MANAGE,
    Permission.PLATFORM_CONTENT_MANAGE,
    Permission.PLATFORM_WAITLIST_READ,
    Permission.PLATFORM_TRANSACTION_READ,
    Permission.PAYMENT_REFUND,
    Permission.CATALOG_PRODUCT_MANAGE,
    Permission.ORDER_MANAGE,
    Permission.MERCHANT_DASHBOARD_ACCESS,
    Permission.SELLER_DASHBOARD_ACCESS,
    Permission.EMPLOYER_DASHBOARD_ACCESS,
    Permission.EMPLOYER_VACANCY_MANAGE,
  ],

  [Role.SUPER_ADMIN]: Object.values(Permission),
} as const;

/** Foydalanuvchining barcha rollaridan yig'ilgan ruxsatlar to'plami. */
export function resolvePermissions(roles: readonly RoleValue[]): Set<PermissionValue> {
  const permissions = new Set<PermissionValue>();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(permission);
    }
  }

  return permissions;
}

/** Berilgan rollar bilan aynan shu ruxsat bormi? */
export function hasPermission(roles: readonly RoleValue[], permission: PermissionValue): boolean {
  return resolvePermissions(roles).has(permission);
}

/** Berilgan rollarda sanab o'tilgan ruxsatlardan kamida bittasi bormi? */
export function hasAnyPermission(roles: readonly RoleValue[], permissions: readonly PermissionValue[]): boolean {
  const granted = resolvePermissions(roles);
  return permissions.some((permission) => granted.has(permission));
}
