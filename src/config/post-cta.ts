import type { LucideIcon } from 'lucide-react';
import { Camera, Clapperboard, MessageCircle, Phone, Send, UserPlus } from 'lucide-react';

/**
 * Videoning CHAQIRUVI (CTA) — yagona manba.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * 9-bosqichda videoga mahsulot, taom, ish va mehmonxona biriktirish
 * qo'shildi. Lekin ko'p video HECH NARSA sotmaydi: bloger kulgili
 * video joylaydi, usta ish jarayonini ko'rsatadi, o'qituvchi qoidani
 * tushuntiradi.
 *
 * Ular ham bir narsaga chorlaydi — faqat sotuvga emas: "obuna bo'l",
 * "menga yozing", "qo'ng'iroq qiling". Chaqiruvsiz video tomosha
 * bilan tugaydi va hech qayerga olib bormaydi.
 *
 * ── Nima uchun BITTA chaqiruv, ro'yxat emas ───────────────────────────
 * Biriktirmalar beshtagacha bo'lishi mumkin — ular turli narsalar.
 * Chaqiruv esa bitta: "endi nima qilay?" degan savolga IKKITA javob
 * berish javob bermaslik bilan barobar.
 *
 * ── Nima uchun tashqi havola FAQAT foydalanuvchi nomi bilan ───────────
 * Ixtiyoriy manzil (`https://...`) yozishga ruxsat bersak, video ustida
 * istalgan saytga olib boradigan tugma paydo bo'lardi — bu firibgarlik
 * uchun tayyor vosita.
 *
 * Shuning uchun muallif faqat NOMINI yozadi ("navix_uz"), manzilni esa
 * ilova o'zi yasaydi. Boshqa domenga olib borishning imkoni yo'q.
 */

export const POST_CTA_KINDS = [
  'FOLLOW',
  'MESSAGE',
  'TELEGRAM',
  'INSTAGRAM',
  'YOUTUBE',
  'PHONE',
] as const;

export type PostCtaKindName = (typeof POST_CTA_KINDS)[number];

export interface PostCtaConfig {
  /** Tanlash oynasidagi nomi. */
  label: string;
  /** Tugmadagi matn — tomoshabin ko'radigan yozuv. */
  action: string;
  icon: LucideIcon;
  /**
   * Qo'shimcha qiymat kerakmi (nom yoki raqam).
   *
   * `FOLLOW` va `MESSAGE` da kerak emas: ular muallifning O'ZIGA
   * ishora qiladi va ilova uni allaqachon biladi.
   */
  needsValue: boolean;
  /** Kiritish maydonidagi yordamchi yozuv. */
  placeholder?: string;
  /**
   * Ilovadan CHIQIB ketadimi.
   *
   * Chiqadigan havola boshqa oynada ochiladi va ekranda ogohlantirish
   * ko'rsatiladi: odam qayerga borayotganini bilishi kerak.
   */
  isExternal: boolean;
}

export const POST_CTA_CONFIG: Record<PostCtaKindName, PostCtaConfig> = {
  FOLLOW: {
    label: 'Obuna bo\'lish',
    action: 'Obuna bo\'lish',
    icon: UserPlus,
    needsValue: false,
    isExternal: false,
  },
  MESSAGE: {
    label: 'Xabar yozish',
    action: 'Xabar yozish',
    icon: MessageCircle,
    needsValue: false,
    isExternal: false,
  },
  TELEGRAM: {
    label: 'Telegram',
    action: 'Telegramda ochish',
    icon: Send,
    needsValue: true,
    placeholder: 'navix_uz',
    isExternal: true,
  },
  INSTAGRAM: {
    label: 'Instagram',
    action: 'Instagramda ochish',
    // Lucide'da tarmoq belgilari yo'q — ma'noga yaqin umumiy belgi.
    icon: Camera,
    needsValue: true,
    placeholder: 'navix.uz',
    isExternal: true,
  },
  YOUTUBE: {
    label: 'YouTube',
    action: 'YouTube kanali',
    icon: Clapperboard,
    needsValue: true,
    placeholder: 'navixuz',
    isExternal: true,
  },
  PHONE: {
    label: 'Telefon',
    action: 'Qo\'ng\'iroq qilish',
    icon: Phone,
    needsValue: true,
    placeholder: '+998 90 123 45 67',
    isExternal: false,
  },
};

/**
 * Ijtimoiy tarmoq nomining qoidasi.
 *
 * ── Nima uchun bitta naqsh uchalasi uchun ─────────────────────────────
 * Telegram, Instagram va YouTube nomlari deyarli bir xil: harflar,
 * raqamlar, pastki chiziq va nuqta. Har biriga alohida naqsh yozish
 * mumkin edi, lekin farqlar shunchalik kichikki, ular faqat noto'g'ri
 * rad etishlarga olib kelardi.
 *
 * Chegara HAM muhim: uzun nom tugmadan chiqib ketardi.
 */
export const CTA_HANDLE_PATTERN = /^[a-zA-Z0-9._-]{2,32}$/;

/** Boshidagi `@` va manzil qoldiqlari tozalanadi. */
export function cleanHandle(input: string): string {
  return input
    .trim()
    /*
      Odam ko'pincha to'liq manzilni nusxalab qo'yadi
      ("https://t.me/navix_uz"). Uni rad etish o'rniga tozalash
      qulayroq: natija baribir bir xil.
    */
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me|instagram\.com|youtube\.com)\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .split(/[?#]/)[0];
}

/**
 * Chaqiruvning manzili.
 *
 * ── Nima uchun manzil SHU YERDA yasaladi ──────────────────────────────
 * Bazada faqat nom saqlanadi. Manzil har safar shu funksiyada
 * quriladi — ya'ni boshqa domenga olib boradigan yozuv bazaga
 * tushishining ILOJI yo'q.
 *
 * `FOLLOW` va `MESSAGE` uchun `null` qaytadi: ular oddiy havola
 * emas, ilova ichidagi amal (obuna qo'yish, suhbat ochish).
 */
export function ctaHref(kind: PostCtaKindName, value: string | null): string | null {
  if (kind === 'TELEGRAM' && value) return `https://t.me/${value}`;
  if (kind === 'INSTAGRAM' && value) return `https://instagram.com/${value}`;
  if (kind === 'YOUTUBE' && value) return `https://youtube.com/@${value}`;
  if (kind === 'PHONE' && value) return `tel:${value}`;

  return null;
}

export function isPostCtaKind(value: string): value is PostCtaKindName {
  return (POST_CTA_KINDS as readonly string[]).includes(value);
}
