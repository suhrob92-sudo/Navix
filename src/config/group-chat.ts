/**
 * Guruh suhbatlari — yagona qoidalar manbai.
 *
 * ── Nima uchun ALOHIDA config ─────────────────────────────────────────
 * Guruh qoidalari uch joyda kerak bo'ladi: serverda (haqiqiy
 * tekshiruv), so'rov validatsiyasida va brauzerda (tugmani ko'rsatish
 * yoki yashirish). Uchalasi bir xil raqamlarni takrorlasa, ertaga
 * chegara o'zgarganda bittasi eskirib qoladi va ekranda "qo'shish"
 * tugmasi turadi-yu, server rad etadi.
 *
 * Shuning uchun chegaralar ham, huquqlar jadvali ham FAQAT shu
 * faylda yoziladi.
 */

/** Guruh nomi eng qisqa uzunligi. */
export const GROUP_TITLE_MIN = 2;

/**
 * Guruh nomi eng uzun uzunligi.
 *
 * 60 belgi — suhbatlar ro'yxatida bir qatorga sig'adigan chegara.
 * Undan uzun nom baribir kesilib ko'rsatilardi, ya'ni foydalanuvchi
 * yozgan narsasini hech qachon to'liq ko'rmasdi.
 */
export const GROUP_TITLE_MAX = 60;

/**
 * Guruhdagi eng ko'p a'zo.
 *
 * ── Nima uchun 200 ────────────────────────────────────────────────────
 * Har bir yangi xabar guruhdagi HAR BIR a'zoga push yuborishni
 * anglatadi. 200 a'zoda bu bitta xabarga 199 ta tashqi murojaat —
 * bu hali boshqarish mumkin bo'lgan yuk.
 *
 * Mingta a'zoli kanal boshqa mahsulot: u yerda push emas, obuna va
 * ovoz berish kerak bo'ladi. Uni guruh sifatida yasashga urinish
 * ikkalasini ham yomon qilardi.
 */
export const GROUP_MAX_MEMBERS = 200;

/**
 * Guruh yaratish uchun eng kam a'zo (yaratuvchi bilan birga).
 *
 * Bitta odamli "guruh" — bu shunchaki qaydlar daftari. Uni chat
 * sifatida yasash chalkashlik keltiradi: ro'yxatda ochilmaydigan,
 * javob kelmaydigan suhbat turardi.
 */
export const GROUP_MIN_MEMBERS = 2;

/** Bir so'rovda qo'shish mumkin bo'lgan eng ko'p a'zo. */
export const GROUP_ADD_BATCH_MAX = 50;

/** Guruh a'zolari ro'yxatida bir sahifadagi yozuvlar soni. */
export const GROUP_MEMBER_PAGE_SIZE = 50;

/**
 * A'zoning guruhdagi darajasi.
 *
 * ── Nima uchun UCH daraja ─────────────────────────────────────────────
 * Ikkitasi ("admin" va "oddiy") yetarli emas edi: o'shanda har qanday
 * admin boshqa adminni chiqarib yuborishi mumkin bo'lardi va guruh
 * bir bosishda egasiz qolardi.
 *
 * EGA — guruhni yaratgan (yoki unga topshirilgan) bitta odam. Faqat
 * u administrator tayinlay va yecha oladi.
 */
export type GroupRoleName = 'OWNER' | 'ADMIN' | 'MEMBER';

/** Guruhda bajarilishi mumkin bo'lgan amallar. */
export type GroupAction =
  /** Nom va rasmni o'zgartirish. */
  | 'EDIT_INFO'
  /** Yangi a'zo qo'shish. */
  | 'ADD_MEMBER'
  /** A'zoni chiqarish. */
  | 'REMOVE_MEMBER'
  /** Administrator tayinlash va yechish. */
  | 'MANAGE_ADMIN';

const PERMISSIONS: Record<GroupRoleName, readonly GroupAction[]> = {
  OWNER: ['EDIT_INFO', 'ADD_MEMBER', 'REMOVE_MEMBER', 'MANAGE_ADMIN'],
  ADMIN: ['EDIT_INFO', 'ADD_MEMBER', 'REMOVE_MEMBER'],
  MEMBER: [],
};

/** Shu darajadagi odam shu amalni bajara oladimi. */
export function canDo(role: GroupRoleName, action: GroupAction): boolean {
  return PERMISSIONS[role].includes(action);
}

/**
 * Kim kimni chiqara oladi.
 *
 * ── Qoida ─────────────────────────────────────────────────────────────
 * EGA — hammani; ADMIN — faqat oddiy a'zoni; oddiy a'zo — hech kimni.
 *
 * ── Nima uchun admin adminni chiqara olmaydi ──────────────────────────
 * Aks holda ikki administrator bir-birini chiqarishga urinadigan
 * poyga paydo bo'lardi va g'olib tezroq bosgani bo'lardi. Bunday
 * nizoni faqat guruh egasi hal qila oladi.
 *
 * EGANI hech kim chiqara olmaydi — u faqat o'zi chiqib ketishi
 * mumkin, o'shanda egalik boshqasiga o'tadi.
 */
export function canRemoveMember(actorRole: GroupRoleName, targetRole: GroupRoleName): boolean {
  if (targetRole === 'OWNER') return false;
  if (actorRole === 'OWNER') return true;
  if (actorRole === 'ADMIN') return targetRole === 'MEMBER';

  return false;
}

/**
 * Guruhda sodir bo'lgan hodisa turi.
 *
 * Bular oddiy xabar emas: ular hech kim yozmagan, lekin suhbat
 * tarixida ko'rinishi kerak bo'lgan voqealar.
 */
export type SystemMessageKindName =
  | 'GROUP_CREATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'MEMBER_LEFT'
  | 'TITLE_CHANGED'
  | 'IMAGE_CHANGED'
  | 'ADMIN_GRANTED'
  | 'ADMIN_REVOKED'
  | 'OWNER_CHANGED';

/**
 * Hodisa matnini yozadi.
 *
 * ── Nima uchun matn SAQLANADI, har safar qayta yasalmaydi ─────────────
 * Matnni ko'rsatish paytida yasash mumkin edi, lekin unda ismini
 * o'zgartirgan odamning eski hodisalari ham o'zgarib ketardi:
 * "Ali Valini chiqardi" degan yozuv bir kundan keyin boshqa ism
 * bilan ko'rinardi.
 *
 * Hodisa — bu TARIX. Tarix o'sha paytdagi holatni saqlashi kerak,
 * xuddi kvitansiyadagi ism keyin o'zgarmagani kabi.
 */
export function systemMessageText(kind: SystemMessageKindName, actor: string, target?: string): string {
  switch (kind) {
    case 'GROUP_CREATED':
      return `${actor} guruhni yaratdi`;
    case 'MEMBER_ADDED':
      return `${actor} ${target}ni qo'shdi`;
    case 'MEMBER_REMOVED':
      return `${actor} ${target}ni chiqardi`;
    case 'MEMBER_LEFT':
      return `${actor} guruhdan chiqdi`;
    case 'TITLE_CHANGED':
      return `${actor} guruh nomini «${target}» ga o'zgartirdi`;
    case 'IMAGE_CHANGED':
      return `${actor} guruh rasmini o'zgartirdi`;
    case 'ADMIN_GRANTED':
      return `${actor} ${target}ni administrator qildi`;
    case 'ADMIN_REVOKED':
      return `${actor} ${target}dan administratorlikni oldi`;
    case 'OWNER_CHANGED':
      return `${target} guruhning yangi egasi`;
  }
}

/** Darajaning o'zbekcha nomi — ekranda ko'rsatish uchun. */
export function groupRoleLabel(role: GroupRoleName): string {
  switch (role) {
    case 'OWNER':
      return 'Ega';
    case 'ADMIN':
      return 'Administrator';
    case 'MEMBER':
      return "A'zo";
  }
}

/**
 * A'zolar sonini o'zbekcha yozadi.
 *
 * O'zbek tilida ko'plik qo'shimchasi shart emas: "5 a'zo" to'g'ri,
 * "5 a'zolar" xato. Shuning uchun ingliz tilidagi kabi ikki xil
 * shakl kerak emas.
 */
export function memberCountText(count: number): string {
  return `${count} a'zo`;
}
