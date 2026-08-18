import type { AttachmentKindName } from '@/config/attachments';
import type { PostCtaKindName } from '@/config/post-cta';

/**
 * Lenta — brauzer va server uchun umumiy turlar.
 */

/** Post muallifi — lentada ko'rinadigan eng kam ma'lumot. */
export interface PostAuthorView {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

export interface PostView {
  id: string;
  /** O'chirilgan postda BO'SH bo'ladi. Rasm bo'lsa matnsiz ham bo'lishi mumkin. */
  body: string;
  /** Biriktirilgan rasm. O'chirilgan postda `null`. */
  imageUrl: string | null;
  /** Biriktirilgan video. O'chirilgan postda `null`. */
  videoUrl: string | null;
  /** Video muqovasi — yuklanguncha ko'rsatiladi. */
  videoPosterUrl: string | null;
  /** Video davomiyligi (soniya) — kesilganidan keyingi uzunlik. */
  videoSeconds: number | null;
  /**
   * Kesish nuqtalari — pleyer shu oraliqda o'ynatadi.
   *
   * Ikkalasi `null` bo'lsa, video butunlay o'ynaydi. Kesish
   * qo'shilishidan oldingi postlarda aynan shunday.
   */
  videoStartSeconds: number | null;
  videoEndSeconds: number | null;
  /**
   * Videoga biriktirilgan mahsulotlar.
   *
   * Tomoshabin "qayerdan olsa bo'ladi?" deb izohlarda so'ramasligi
   * uchun: tugma video ustida turadi va to'g'ri mahsulotga olib
   * boradi.
   *
   * Ro'yxat: bitta videoda ko'pincha bir nechta narsa ko'rsatiladi
   * (kiyim + poyabzal + sumka).
   */
  attachments: PostAttachmentView[];
  /**
   * Videoning chaqiruvi — "endi nima qilay?".
   *
   * `null` — muallif chaqiruv qo'ymagan. Biriktirmalardan farqli
   * o'laroq bittasi: ikkita chaqiruv javob bermaslik bilan barobar.
   */
  cta: PostCtaView | null;
  /** Videoni necha marta ko'rishgan. */
  viewCount: number;
  /** Qaysi bo'limga tegishli. `null` — muallif tanlamagan. */
  category: PostCategoryName | null;
  /** Biriktirilgan joylashuv. `null` — muallif qo'shmagan. */
  place: PostPlaceView | null;
  /**
   * Matndan ajratilgan mavzular (`#` siz, kichik harflarda).
   *
   * Matnning o'zida ular ko'k rangda ko'rinadi. Bu ro'yxat esa
   * qidiruv va "shu mavzudagi postlar" uchun.
   */
  hashtags: string[];
  author: PostAuthorView;
  createdAt: string;
  /**
   * Tahrirlangan payt — `null` bo'lsa post o'zgartirilmagan.
   *
   * Belgi KERAK: o'quvchi izoh yozgandan keyin matn o'zgarsa, uning
   * izohi ma'nosiz ko'rinib qolardi. "Tahrirlangan" yozuvi buni
   * ochiq qiladi.
   */
  editedAt: string | null;

  likeCount: number;
  commentCount: number;
  /** Post necha marta ulashilgan. */
  shareCount: number;

  /** So'rov yuborgan odam bu postni yoqtirganmi. */
  isLiked: boolean;
  /**
   * So'rov yuborgan odam bu postni SAQLAGANMI.
   *
   * Saqlash shaxsiy: uni faqat saqlagan odam ko'radi, muallif emas.
   */
  isSaved: boolean;
  /**
   * Post qaysi TO'PLAMDA.
   *
   * ── Nima uchun faqat "Saqlanganlar" sahifasida to'ldiriladi ─────────
   * Lentada bu ma'lumot ko'rsatilmaydi va har bir post uchun
   * qo'shimcha ustun o'qish bekorga sarflangan mehnat bo'lardi.
   *
   * `undefined` — "noma'lum" (lenta), `null` — "guruhlanmagan".
   * Ikkalasini bir qiymat bilan ko'rsatib bo'lmasdi: unda lentadagi
   * post ham "guruhlanmagan" deb ko'rinardi.
   */
  collectionId?: string | null;
  /**
   * Profilda YUQORIGA mahkamlanganmi.
   *
   * Lentada ham yuboriladi, lekin u yerda ishlatilmaydi: mahkamlash
   * PROFIL ko'rinishi haqidagi qaror. Alohida javob shakli yasash
   * esa `toPostView` ni ikkiga bo'lishni talab qilardi.
   */
  isPinned: boolean;
  /** Post so'rov yuborgan odamning O'ZINIKIMI (o'chirish tugmasi uchun). */
  isMine: boolean;
  isDeleted: boolean;
}

/**
 * Postning bo'limi.
 *
 * ── Nima uchun ro'yxat SHU YERDA ────────────────────────────────────
 * Server ham, brauzer ham shu turdan foydalanadi. Bazadagi enum
 * bilan mos kelishini sinov tekshiradi — bittasi o'zgarib,
 * ikkinchisi qolib ketmasligi uchun.
 */
export const POST_CATEGORY_VALUES = [
  'DISCOUNTS',
  'RESTAURANTS',
  'MARKETPLACE',
  'JOBS',
  'DELIVERY',
  'LISTINGS',
  'TRAVEL',
  'EDUCATION',
  'CREATORS',
] as const;

export type PostCategoryName = (typeof POST_CATEGORY_VALUES)[number];

/**
 * Video uzunligi turlari.
 *
 * ── Nima uchun ayirish chizig'i 60 soniyada ───────────────────────────
 * Yuklash chegarasi 10 daqiqa (`MAX_VIDEO_SECONDS`), ya'ni lentada
 * ikki xil video bor: barmoq bilan surib ko'riladigan qisqa video va
 * o'tirib tomosha qilinadigan uzun video.
 *
 * Bu ikkisi bir ro'yxatda aralashsa, ikkalasi ham yutqazadi: qisqa
 * video izlagan odam 10 daqiqalikka duch keladi, dars ko'rmoqchi
 * bo'lgan odam esa uni topa olmaydi.
 *
 * 60 soniya — o'sha "surib ketish" va "o'tirib ko'rish" orasidagi
 * tabiiy chegara.
 */
export const VIDEO_DURATIONS = ['SHORT', 'LONG'] as const;

export type VideoDuration = (typeof VIDEO_DURATIONS)[number];

/** Qisqa video chegarasi — shu qiymatgacha (shu son ham kiradi). */
export const SHORT_VIDEO_SECONDS = 60;

/** Bo'lim nomi — ekranda ko'rinadigan matn. */
export const POST_CATEGORY_LABELS: Record<PostCategoryName, string> = {
  DISCOUNTS: 'Chegirmalar',
  RESTAURANTS: 'Restoranlar',
  MARKETPLACE: 'Marketplace',
  JOBS: 'Ishlar',
  DELIVERY: 'Yetkazib berish',
  LISTINGS: "E'lonlar",
  TRAVEL: 'Sayohat',
  EDUCATION: "Ta'lim",
  CREATORS: 'Creatorlar',
};

/** Qiymat haqiqiy bo'lim nomimi (manzildan kelgan qiymat uchun). */
export function isPostCategory(value: string): value is PostCategoryName {
  return (POST_CATEGORY_VALUES as readonly string[]).includes(value);
}

/**
 * Postga biriktirilgan joylashuv.
 *
 * ── Nima uchun koordinata ham BRAUZERGA yuboriladi ────────────────────
 * "Yaqin atrofda" bo'limida masofa ekranda ko'rsatiladi ("3 km").
 * Uni serverda hisoblab, har bir post uchun alohida maydon qo'shish
 * ham mumkin edi — lekin u faqat bitta bo'limda kerak va qolgan
 * joylarda bekorga yuborilardi.
 *
 * Koordinata aniqligi serverda pasaytirilgan (~110 metr), shuning
 * uchun uni yuborish xavfsiz.
 */
export interface PostPlaceView {
  /** Ekranda ko'rinadigan nom: "Toshkent shahri". */
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Joylashuvga qo'shiladigan aniqlashtiruvchi matn ("Chilonzor").
 *
 * Qisqa: u nom yonida bitta qatorda turadi va uzun matn kartani
 * buzardi.
 */
export const MAX_PLACE_DETAIL_LENGTH = 40;

/**
 * Saqlanadigan to'liq nomning chegarasi ("Toshkent shahri · Chilonzor").
 *
 * Bazadagi ustun ham aynan shuncha (`VarChar(120)`) — ikkalasi bir
 * xil bo'lishi kerak, aks holda baza xatosi foydalanuvchiga
 * tushunarsiz javob bo'lib qaytardi.
 */
export const MAX_PLACE_NAME_LENGTH = 120;

/** Nom va aniqlashtiruvchi matndan ko'rinadigan yozuv yasaydi. */
export function buildPlaceName(region: string, detail: string | null): string {
  const clean = detail?.trim() ?? '';

  return clean.length > 0 ? `${region} · ${clean}` : region;
}

/**
 * Videoga biriktirilgan narsa — tugma uchun kerakli minimum.
 *
 * ── Nima uchun HAMMA tur uchun bitta ko'rinish ────────────────────────
 * Mahsulot, taom, ish e'loni va mehmonxona ekranda bir xil ko'rinadi:
 * belgi, nom, ostida bir qator izoh va o'ngda harakat tugmasi.
 *
 * Har turga alohida ko'rinish yasasak, lentaning tugma chizadigan
 * joyi beshta shoxga bo'linardi va yangi tur qo'shilganda oltinchisi
 * qo'shilardi. Farq esa faqat MATNDA — u `src/config/attachments.ts`
 * dan olinadi.
 */
export interface PostAttachmentView {
  /**
   * Biriktirmaning O'Z belgisi — nishonniki emas.
   *
   * Bosish soni aynan shu biriktirmaga yoziladi: bitta mahsulot
   * ikkita videoga biriktirilgan bo'lsa, qaysi video ishlaganini
   * ajratish kerak.
   */
  id: string;
  kind: AttachmentKindName;
  name: string;
  /** Manzil qurish uchun — turga qarab boshqa bo'limga olib boradi. */
  slug: string;
  /**
   * Nom ostidagi bitta qator.
   *
   * Turga qarab boshqacha: mahsulotda narx va do'kon, ishda maosh va
   * shahar, mehmonxonada shahar. Uni SERVER yasaydi — narx tiyinda
   * saqlanadi va uni har ekranda qayta formatlash xatoga olib
   * kelardi.
   */
  subtitle: string | null;
  /** Hozir ochiqmi — yo'q bo'lsa tugma o'chirilgan ko'rinadi. */
  isAvailable: boolean;
  /**
   * Tugma necha marta bosilgan.
   *
   * ── Nima uchun FAQAT muallifga ko'rinadi ────────────────────────────
   * Bu — muallifning ish ko'rsatkichi. Begonaga ko'rsatilsa,
   * raqobatchi kimning qaysi videosi ishlayotganini bemalol
   * kuzatib turardi.
   *
   * Postning egasi bo'lmaganda bu yerda doim `0` turadi.
   */
  clickCount: number;
}

/**
 * Videoning chaqiruvi — ekran uchun kerakli minimum.
 *
 * Manzil BU YERDA yo'q: uni ekran `ctaHref()` orqali yasaydi. Shu
 * tufayli javobga tashqi manzil hech qachon tushmaydi va uni
 * o'zgartirib yuborishning iloji ham qolmaydi.
 */
export interface PostCtaView {
  kind: PostCtaKindName;
  /** Foydalanuvchi nomi yoki telefon. `FOLLOW`/`MESSAGE` da `null`. */
  value: string | null;
  /**
   * Tugma necha marta bosilgan.
   *
   * Biriktirmalardagi bilan bir xil qoida: faqat post EGASIGA
   * ko'rinadi, begonaga doim `0` ketadi.
   */
  clickCount: number;
}

/** Videoga biriktirilgan mahsulot — tugma uchun kerakli minimum. */
export interface TaggedProductView {
  id: string;
  name: string;
  /** Manzil uchun: `/marketplace/p/<slug>`. */
  slug: string;
  /** Narx TIYINDA — formatlash ekranda bajariladi. */
  priceTiyin: number;
  shopName: string;
  /** Hozir sotuvdami — yo'q bo'lsa tugma o'chirilgan ko'rinadi. */
  isAvailable: boolean;
  /**
   * Tugma necha marta bosilgan.
   *
   * ── Nima uchun FAQAT muallifga ko'rinadi ────────────────────────────
   * Bu — sotuvchining ish ko'rsatkichi. Begonaga ko'rsatilsa,
   * raqobatchi kimning qaysi videosi ishlayotganini bemalol
   * kuzatib turardi.
   *
   * Postning egasi bo'lmaganda bu yerda doim `0` turadi.
   */
  clickCount: number;
}

export interface CommentView {
  id: string;
  body: string;
  author: PostAuthorView;
  createdAt: string;
  isMine: boolean;
  /** Qaysi izohga javob. `null` — asosiy izoh. */
  parentId: string | null;
  likeCount: number;
  /** So'rov yuborgan odam bu izohni yoqtirganmi. */
  isLiked: boolean;
  /** Javoblar soni — ro'yxatni ochmasdan turib ko'rinadi. */
  replyCount: number;
}

/**
 * Lentaning bo'limlari.
 *
 * ── Nima uchun IKKITA ─────────────────────────────────────────────────
 * Faqat "Obunalar" bo'lsa, yangi kelgan odam bo'sh ekran ko'rardi va
 * kimga obuna bo'lishni bilmasdi. Faqat "Yangi" bo'lsa esa, obuna
 * bo'lishning ma'nosi qolmasdi.
 */
export type FeedTabName = 'FOLLOWING' | 'LATEST' | 'VIDEO';

export const FEED_TABS = [
  { value: 'FOLLOWING', label: 'Obunalarim' },
  { value: 'LATEST', label: 'Yangi' },
] as const satisfies readonly { value: FeedTabName; label: string }[];

/**
 * Video lentasidagi bitta ekran BALANDLIGI — to'liq ekran.
 *
 * Bir vaqtda faqat bitta video ko'rinishi kerak: yarim ko'ringan
 * ikkinchi video diqqatni bo'ladi va qaysi birini tinglashni
 * noaniq qiladi.
 */
export const REELS_SNAP_CLASS = 'h-[100dvh] snap-start snap-always';

export interface FeedResponse {
  posts: PostView[];
  /**
   * Keyingi sahifa uchun belgi. `null` — oxiriga yetildi.
   *
   * ── Nima uchun sahifa RAQAMI emas ────────────────────────────────────
   * Lentaga doim yangi post qo'shiladi. Sahifa raqami bilan o'qilganda
   * yangi post kelishi bilan hamma narsa bir pog'ona pastga suriladi va
   * ikkinchi sahifada birinchi sahifaning oxirgi posti QAYTA ko'rinardi.
   *
   * Belgi (cursor) esa aniq joyni ko'rsatadi — u surilmaydi.
   */
  nextCursor: string | null;
}

export interface PostResponse {
  post: PostView;
}

export interface CommentsResponse {
  comments: CommentView[];
  nextCursor: string | null;
}

export interface LikeResponse {
  isLiked: boolean;
  likeCount: number;
}

export interface SaveResponse {
  isSaved: boolean;
}

/** "Qiziq emas" javobi. */
export interface HideResponse {
  isHidden: boolean;
}

export interface ShareResponse {
  shareCount: number;
}

/** Bitta videoning natijasi — statistika jadvalidagi qator. */
export interface VideoStatRow {
  postId: string;
  /** Ro'yxatda ko'rinadigan nom — matnning boshi yoki sana. */
  title: string;
  posterUrl: string | null;
  videoSeconds: number | null;
  createdAt: string;
  /** Biriktirilgan narsalar nomi — tur qanday bo'lishidan qat'i nazar. */
  attachmentNames: string[];

  /** Necha marta ko'rilgan. */
  viewCount: number;
  /** Mahsulot tugmasi necha marta bosilgan. */
  clickCount: number;
  /** Shu videodan kelgan buyurtmalar soni. */
  orderCount: number;
  /** Shu videodan kelgan savdo summasi (tiyin). */
  revenueTiyin: number;

  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
}

export interface VideoStatsResponse {
  videos: VideoStatRow[];
  totals: {
    videoCount: number;
    viewCount: number;
    clickCount: number;
    orderCount: number;
    revenueTiyin: number;
  };
}

/**
 * Bosishlarning ko'rishlarga nisbati (foizda, butun son).
 *
 * ── Nima uchun bu son SONLARDAN muhimroq ─────────────────────────────
 * "1000 ko'rish" yaxshi eshitiladi, lekin undan atigi 3 kishi
 * mahsulotni ochgan bo'lsa — video qiziqarli, reklama esa
 * ishlamayapti.
 *
 * Nisbat esa aynan shuni ko'rsatadi va ikki videoni taqqoslashga
 * imkon beradi.
 */
export function conversionPercent(part: number, whole: number): number {
  if (whole <= 0) return 0;

  return Math.round((part / whole) * 100);
}

/** Mashhur mavzu — ro'yxatda bitta qator. */
export interface HashtagView {
  tag: string;
  postCount: number;
}

export interface HashtagListResponse {
  hashtags: HashtagView[];
}

/** Post matnining eng ko'p uzunligi — server va brauzerda bir xil. */
export const POST_MAX_LENGTH = 1_000;

/** Izohning eng ko'p uzunligi. */
export const COMMENT_MAX_LENGTH = 500;

/**
 * Muallifning ko'rinadigan nomi.
 *
 * Ism kiritilmagan bo'lishi mumkin — unda `@nom` ishlatiladi. Bo'sh
 * joy qoldirish mumkin emas: post kimniki ekani bilinmay qolardi.
 */
export function authorDisplayName(author: PostAuthorView): string {
  if (author.fullName) return author.fullName;

  return author.username ? `@${author.username}` : 'Foydalanuvchi';
}

/**
 * Yoqtirishlar soni.
 *
 * Nol bo'lsa BO'SH satr qaytariladi — tugma yonida "0" turishi
 * "hech kim yoqtirmadi" degan ma'noni ta'kidlab, yozgan odamni
 * xafa qiladi.
 */
export function formatReactionCount(count: number): string {
  if (count <= 0) return '';

  return formatCompactCount(count);
}

/**
 * Qisqartirilgan son — NOL ham ko'rsatiladi.
 *
 * ── Nima uchun `formatReactionCount` dan alohida ──────────────────────
 * Tugmada nol yozuv ortiqcha: "0" turgan yurakcha faqat chalg'itadi.
 * Profil sonlarida esa aksincha — "Obunachilar" yozuvi ostida bo'sh
 * joy turса, odam son yuklanmagan deb o'ylardi.
 */
export function formatCompactCount(count: number): string {
  if (count <= 0) return '0';
  if (count < 1_000) return String(count);

  const thousands = Math.floor((count / 1_000) * 10) / 10;

  return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
}

/**
 * O'chirilgan post o'rnida ko'rsatiladigan matn.
 *
 * ── Nima uchun post RO'YXATDAN olib tashlanmaydi ──────────────────────
 * Postga yozilgan izohlar qoladi. Post butunlay yo'qolsa, izohlar
 * havoda osilib qolardi: odam o'z izohini ko'radi, lekin nimaga
 * javob berganini bilmaydi.
 */
export const DELETED_POST_TEXT = "Bu post o'chirilgan.";

/**
 * Postda ko'rsatiladigan narsa bormi.
 *
 * Matn ham, rasm ham bo'lmasa — post yaratilmasligi kerak. Bu
 * tekshiruv brauzerda tugmani o'chirish uchun ishlatiladi; server
 * va baza ham xuddi shu qoidani mustaqil tekshiradi.
 */
/**
 * Bitta videoga biriktirilishi mumkin bo'lgan eng ko'p mahsulot.
 *
 * ── Nima uchun chegara ───────────────────────────────────────────────
 * Chegarasiz video ostiga o'nlab tugma qo'yish mumkin bo'lardi va u
 * videoni emas, reklama ro'yxatini ko'rsatardi.
 *
 * Beshta — kiyim to'plami uchun ham yetadi (kiyim, shim, poyabzal,
 * sumka, aksessuar) va ekranni bosib ketmaydi.
 */
export const MAX_TAGGED_PRODUCTS = 5;

/**
 * Lentada matn qisqartiriladigan uzunlik.
 *
 * ── Nima uchun kerak ─────────────────────────────────────────────────
 * 1000 belgilik post lentada butun ekranni egallab, undan keyingi
 * postlarga yetib borish uchun uzoq surish kerak bo'lardi.
 *
 * Qisqartirilgan matn ostida "Ko'proq" turadi — bosilsa to'liq
 * ochiladi va sahifa almashmaydi.
 */
export const POST_PREVIEW_LENGTH = 280;

/** Post matni qisqartirishga muhtojmi. */
export function needsTruncation(body: string): boolean {
  return body.length > POST_PREVIEW_LENGTH;
}

/**
 * Ulashish uchun matn — Telegram va tizim oynasida ko'rinadi.
 *
 * Post matni uzun bo'lsa kesiladi: ulashish oynasida butun post
 * emas, uning boshi va havolasi turishi kerak.
 */
export function shareTitle(post: { body: string; author: PostAuthorView }): string {
  const name = authorDisplayName(post.author);
  const text = post.body.trim();

  if (text.length === 0) return `${name} — Navix`;
  if (text.length <= 120) return `${name}: ${text}`;

  return `${name}: ${text.slice(0, 117)}...`;
}

/** Post video postmi. */
export function isVideoPost(post: { videoUrl: string | null; isDeleted: boolean }): boolean {
  return post.videoUrl !== null && !post.isDeleted;
}

export function hasPostContent(body: string, imageUrl: string | null): boolean {
  return body.trim().length > 0 || imageUrl !== null;
}
