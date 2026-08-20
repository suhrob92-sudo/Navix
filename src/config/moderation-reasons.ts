/**
 * Kontent olib tashlanish SABABLARI — yagona manba.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Moderator postni yashirganda sabab MATN sifatida yozilardi va u
 * faqat audit jurnaliga tushardi. Muallif esa hech narsa ko'rmasdi:
 * posti shunchaki yo'qolardi.
 *
 * Bu eng ko'p norozilik keltiradigan holat. Odam nima qilib
 * qo'yganini bilmasa, tuzata ham olmaydi — va ertaga xuddi shuni
 * qaytaradi. Moderator esa o'sha ishni yana qiladi.
 *
 * ── Nima uchun RO'YXAT, erkin matn emas ───────────────────────────────
 * Erkin matnda har moderator o'zicha yozadi: biri "reklama", ikkinchisi
 * "spam", uchinchisi "qoidabuzarlik". Muallif uchun bu uchtasi uch xil
 * ayb bo'lib ko'rinadi — holbuki bittasi.
 *
 * Ro'yxat esa: bir xil holat har doim bir xil nom oladi, tarjima
 * bir joyda turadi va statistikani sanash mumkin bo'ladi ("eng ko'p
 * qaysi sabab?" — bu mahsulot uchun ham foydali savol).
 *
 * ── Nima uchun MODERATOR yozuvi bilan MUALLIF yozuvi boshqa ───────────
 * Moderator qisqa yorliqni tez tanlashi kerak ("Spam").
 *
 * Muallifga esa buning o'zi yetarli emas: "Spam" degan bir so'z
 * ayblovga o'xshaydi va nima qilish kerakligini aytmaydi. Shuning
 * uchun har bir sababning MUALLIF UCHUN to'liq jumlasi bor —
 * u qoidani tushuntiradi va yo'l ko'rsatadi.
 */

/**
 * Moderatsiya qilinadigan kontent turlari.
 *
 * ── Nima uchun bu ro'yxat SOZLAMADA, admin modulida emas ──────────────
 * Ilgari u `admin/content.service.ts` ichida turardi va faqat xodim
 * ekraniga kerak edi. Endi esa u MUALLIF ekraniga ham, bildirishnoma
 * matniga ham kerak — ikkalasi ham admin modulini import qila
 * olmaydi (u serverga bog'liq).
 *
 * Ro'yxat ikki joyda takrorlansa, beshinchi tur qo'shilganda
 * bittasida unutilardi va muallif "Noma'lum yozuv olib tashlandi"
 * degan bildirishnoma olardi.
 */
export const MODERATED_CONTENT_KINDS = ['PRODUCT', 'DISH', 'POST', 'VACANCY'] as const;

export type ModeratedContentKindName = (typeof MODERATED_CONTENT_KINDS)[number];

export const MODERATED_CONTENT_LABELS: Record<ModeratedContentKindName, string> = {
  PRODUCT: 'Mahsulot',
  DISH: 'Taom',
  POST: 'Post',
  VACANCY: 'Vakansiya',
};

export const CONTENT_REMOVAL_REASONS = [
  'SPAM',
  'ADULT',
  'VIOLENCE',
  'HATE',
  'FRAUD',
  'COPYRIGHT',
  'MISLEADING',
  'PRIVACY',
  'OTHER',
] as const;

export type ContentRemovalReasonName = (typeof CONTENT_REMOVAL_REASONS)[number];

export interface ContentRemovalReasonConfig {
  /** Moderator ro'yxatda ko'radigan qisqa yorliq. */
  label: string;
  /**
   * Muallifga ko'rsatiladigan to'liq izoh.
   *
   * Uch narsani aytadi: NIMA bo'ldi, NEGA bo'ldi, ENDI nima qilish
   * mumkin. Ayblov ohangida emas — odam yozuvni o'qib, tuzatib
   * qayta joylashi kerak.
   */
  notice: string;
  /**
   * Moderator qo'shimcha izoh YOZISHI shartmi.
   *
   * Faqat "Boshqa sabab" da shart: uning o'zi hech narsa
   * tushuntirmaydi.
   */
  needsNote: boolean;
}

export const CONTENT_REMOVAL_REASON_CONFIG: Record<
  ContentRemovalReasonName,
  ContentRemovalReasonConfig
> = {
  SPAM: {
    label: 'Spam',
    notice:
      'Yozuv bir xil takrorlangan yoki keraksiz reklama sifatida baholandi. Bir xil matnni ko\'p marta joylamang va reklamani post mazmuniga bog\'lang.',
    needsNote: false,
  },
  ADULT: {
    label: 'Kattalar uchun mazmun',
    notice:
      'Yozuvda kattalar uchun mo\'ljallangan mazmun bor. Navix hamma yosh uchun ochiq, shuning uchun bunday materiallar joylanmaydi.',
    needsNote: false,
  },
  VIOLENCE: {
    label: 'Zo\'ravonlik',
    notice:
      'Yozuvda zo\'ravonlik yoki qo\'rqinchli sahnalar bor. Bunday kadrlar boshqa foydalanuvchilarga zarar yetkazishi mumkin.',
    needsNote: false,
  },
  HATE: {
    label: 'Haqorat va nafrat',
    notice:
      'Yozuvda haqorat yoki biror guruhga nisbatan nafrat bor. Fikringizni bildirish mumkin, lekin odamlarni kamsitmasdan.',
    needsNote: false,
  },
  FRAUD: {
    label: 'Firibgarlik',
    notice:
      'Yozuv firibgarlik belgilarini ko\'rsatdi: mavjud bo\'lmagan xizmat, oldindan to\'lov so\'rash yoki begona havolaga chorlash. Bunday yozuvlar darhol olib tashlanadi.',
    needsNote: false,
  },
  COPYRIGHT: {
    label: 'Mualliflik huquqi',
    notice:
      'Yozuvda boshqa odamning materiali egasining ruxsatisiz ishlatilgan. O\'z materialingizni joylang yoki ruxsat olganingizni ko\'rsating.',
    needsNote: false,
  },
  MISLEADING: {
    label: 'Chalg\'ituvchi ma\'lumot',
    notice:
      'Yozuvdagi ma\'lumot haqiqatga mos kelmaydi yoki odamni chalg\'itadi. Narx, shart va va\'dalarni aniq yozing.',
    needsNote: false,
  },
  PRIVACY: {
    label: 'Shaxsiy ma\'lumot',
    notice:
      'Yozuvda boshqa odamning shaxsiy ma\'lumoti (telefon raqami, manzili, hujjati) uning roziligisiz ko\'rsatilgan.',
    needsNote: false,
  },
  OTHER: {
    label: 'Boshqa sabab',
    notice: 'Yozuv Navix qoidalariga mos kelmadi. Batafsil izoh quyida.',
    needsNote: true,
  },
};

/**
 * Moderator izohining chegarasi.
 *
 * Uzun izoh yozishga o'rin yo'q: bu yozuv MUALLIFGA ko'rinadi va
 * uzun matn o'qilmasdan qoladi. Qisqa aniq jumla kerak.
 */
export const REMOVAL_NOTE_MAX_LENGTH = 200;

/** Izoh yozilganda — juda kalta bo'lmasin ("ok", "-" hech narsa demaydi). */
export const REMOVAL_NOTE_MIN_LENGTH = 5;

/**
 * E'tiroz yo'li.
 *
 * ── Nima uchun YANGI navbat emas, YORDAM xizmati ──────────────────────
 * E'tiroz uchun alohida navbat, holat va moderator ekrani yasash
 * mumkin edi. Lekin Navixda yordam xizmati (`/support`) allaqachon
 * bor: unda murojaat raqami, javob yozish, holat va bildirishnoma —
 * hammasi ishlaydi.
 *
 * Ikkinchi, deyarli bir xil tizim qurish ikkita navbatni ham
 * yarim tashlab qo'yish demak edi. Shuning uchun "E'tiroz bildirish"
 * tugmasi tayyor murojaat ochadi.
 */
export const APPEAL_SUBJECT_PREFIX = 'E\'tiroz';

/** Muallif ko'radigan yo'l-yo'riq. */
export const APPEAL_HINT =
  'Qaror noto\'g\'ri deb hisoblasangiz, e\'tiroz bildiring — murojaatingizni odam ko\'rib chiqadi.';

export function isContentRemovalReason(value: string): value is ContentRemovalReasonName {
  return (CONTENT_REMOVAL_REASONS as readonly string[]).includes(value);
}

/**
 * Muallifga ko'rsatiladigan to'liq matn.
 *
 * Izoh bo'lsa, u qoida izohidan KEYIN qo'shiladi: avval umumiy
 * qoida, keyin aynan shu holatga tegishli gap.
 */
export function removalNoticeText(
  reason: ContentRemovalReasonName,
  note: string | null,
): string {
  const base = CONTENT_REMOVAL_REASON_CONFIG[reason].notice;

  return note ? `${base} ${note}` : base;
}
