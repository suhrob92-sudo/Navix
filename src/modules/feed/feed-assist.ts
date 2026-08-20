import { toSearchText } from '@/lib/search';
import { extractHashtags } from '@/modules/feed/feed.text';
import { POST_CATEGORY_LABELS, type PostCategoryName } from '@/modules/feed/feed.types';

/**
 * Post yozishga YORDAM — bo'lim, mavzu va maslahatlar.
 *
 * ── Nima uchun til modeli (LLM) EMAS ──────────────────────────────────
 * Yordamchining qolgan qismi ham (`intent.ts`) aniq qoidalar ustiga
 * qurilgan va sabab shu yerda ham amal qiladi:
 *
 *   1. LLM PULLIK va har chaqiruv puldan ketadi. Kompozitorda esa u
 *      har bir post uchun ishlaydi — bu eng ko'p chaqiriladigan joy.
 *
 *   2. LLM SEKIN: 1-3 soniya. Odam yozib bo'lib, "Joylash" ni bosishga
 *      shay turganda uni kuttirish — taklifni butunlay foydasiz
 *      qiladi.
 *
 *   3. LLM ba'zan "o'ylab topadi". Noto'g'ri bo'lim taklif qilinsa,
 *      post butunlay boshqa filtrga tushib qolardi va muallif buni
 *      sezmasdi ham.
 *
 * Qoidalar esa bepul, bir lahzada ishlaydi va natijasi HAR DOIM bir
 * xil — ya'ni ularni sinov bilan to'liq qoplash mumkin.
 *
 * ── Nima uchun bu fayl SOF ────────────────────────────────────────────
 * Bazaga ham, tarmoqqa ham murojaat qilmaydi. Shu tufayli uni
 * brauzerda ham, serverda ham ishlatish mumkin va har bir qoidani
 * alohida tekshirib bo'ladi.
 */

/**
 * Bo'limlarni tanish uchun kalit so'zlar.
 *
 * ── Nima uchun O'ZBEKCHA va ruscha aralash ────────────────────────────
 * Odamlar postni ikkala tilda ham yozadi va ko'pincha aralashtiradi:
 * "yangi kvartira sotiladi, ремонт qilingan".
 *
 * ── Nima uchun so'zlar QISQA ILDIZ shaklida ───────────────────────────
 * O'zbek tilida qo'shimchalar ko'p: "kvartira", "kvartirani",
 * "kvartiradan". To'liq shakl yozilsa, ularning aksariyati
 * topilmasdi. Ildiz esa hammasiga mos keladi.
 */
const CATEGORY_KEYWORDS: Record<PostCategoryName, readonly string[]> = {
  DISCOUNTS: ['chegirma', 'aksiya', 'skidka', 'arzon', 'sotuv', 'sale', 'tekin', 'sovga'],
  RESTAURANTS: [
    'restoran',
    'kafe',
    'osh',
    'lagmon',
    'somsa',
    'burger',
    'pitsa',
    'taom',
    'ovqat',
    'shirinlik',
    'nonushta',
    'retsept',
    'pishir',
  ],
  MARKETPLACE: ['mahsulot', 'dokon', 'sotib', 'buyurtma', 'tovar', 'magazin', 'narx', 'sotiladi'],
  JOBS: ['ish', 'vakansiya', 'rezyume', 'maosh', 'xodim', 'kasb', 'karyera', 'stajirovka'],
  DELIVERY: ['yetkaz', 'kuryer', 'dostavka', 'pochta', 'jonatma', 'posilka'],
  LISTINGS: ['elon', 'ijara', 'kvartira', 'uy', 'avtomobil', 'mashina', 'sotaman', 'arenda'],
  TRAVEL: ['sayohat', 'sayohatchi', 'safar', 'mehmonxona', 'bilet', 'samarqand', 'buxoro', 'xiva', 'dengiz', 'togʻ', 'tog'],
  EDUCATION: ['dars', 'kurs', 'oqituvchi', 'talaba', 'universitet', 'maktab', 'ingliz', 'darslik', 'oquv'],
  CREATORS: ['bloger', 'kontent', 'video', 'obunachi', 'kanal', 'montaj', 'kamera', 'vlog'],
};

/**
 * Bo'limlar uchun taklif qilinadigan MAVZULAR.
 *
 * ── Nima uchun tayyor ro'yxat ─────────────────────────────────────────
 * Mavzuni matndan o'ylab topish ham mumkin edi, lekin natija har xil
 * chiqardi: "burger" so'zidan "#burger", "#burgerlar", "#burgeruz"
 * kabi o'nlab variant hosil bo'lardi.
 *
 * Tayyor ro'yxat esa mavzularni BIRLASHTIRADI: hamma bir xil
 * xeshtegni ishlatadi va mavzu sahifasi to'ladi. Tarqoq xeshteglar
 * esa hech qachon to'planmaydi.
 */
const CATEGORY_HASHTAGS: Record<PostCategoryName, readonly string[]> = {
  DISCOUNTS: ['chegirma', 'aksiya', 'arzon'],
  RESTAURANTS: ['taom', 'restoran', 'retsept'],
  MARKETPLACE: ['xarid', 'mahsulot', 'dokon'],
  JOBS: ['ish', 'vakansiya', 'karyera'],
  DELIVERY: ['yetkazish', 'kuryer'],
  LISTINGS: ['elon', 'kochmasmulk'],
  TRAVEL: ['sayohat', 'ozbekiston', 'safar'],
  EDUCATION: ['talim', 'kurs', 'dars'],
  CREATORS: ['bloger', 'kontent', 'vlog'],
};

/** Umumiy mavzular — bo'lim aniqlanmaganda ham foydali. */
const GENERAL_HASHTAGS: readonly string[] = ['navix', 'ozbekiston', 'toshkent'];

/** Nechta mavzu taklif qilinadi. */
export const MAX_SUGGESTED_HASHTAGS = 5;

/** Post matnining maslahat beriladigan eng kam uzunligi. */
export const SHORT_BODY_LENGTH = 25;

/** Ko'p xeshteg belgisi — undan ortig'i spam ko'rinadi. */
export const TOO_MANY_HASHTAGS = 8;

export interface AssistTip {
  /** Maslahat turi — sinov va ekran uchun. */
  code: string;
  text: string;
}

export interface FeedAssistResult {
  /** Taklif qilinadigan bo'lim. `null` — aniqlanmadi. */
  category: PostCategoryName | null;
  /** Bo'lim nomi — ekranda ko'rsatish uchun. */
  categoryLabel: string | null;
  /** Taklif qilinadigan mavzular (`#` siz). */
  hashtags: string[];
  /** Matnni yaxshilash maslahatlari. */
  tips: AssistTip[];
}

/**
 * Matndan BO'LIMNI taxmin qiladi.
 *
 * ── Nima uchun eng KO'P moslik yutadi ─────────────────────────────────
 * Bitta so'z bo'yicha qaror qilinsa, "restoranda ish bor" degan post
 * "Restoranlar" ga tushib qolardi — holbuki u ish e'loni.
 *
 * Sanoq esa butun matnni hisobga oladi: qaysi bo'limning so'zlari
 * ko'proq bo'lsa, o'sha yutadi.
 *
 * ── Nima uchun TENG bo'lganda `null` ─────────────────────────────────
 * Ikkita bo'lim teng chiqsa, tanlov tasodifiy bo'lardi. Taxmin
 * qilmagan ma'qul: noto'g'ri bo'lim postni butunlay boshqa filtrga
 * tushirib yuboradi va muallif buni sezmaydi ham.
 */
export function suggestCategory(body: string): PostCategoryName | null {
  const text = toSearchText(body);

  if (text.length === 0) return null;

  /* So'z chegarasi bilan qidiriladi — "ish" so'zi "ishlash" da ham bor. */
  const words = new Set(text.split(' ').filter((word) => word.length > 0));

  let best: PostCategoryName | null = null;
  let bestScore = 0;
  let isTie = false;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;

    for (const keyword of keywords) {
      /*
        Ikki xil moslik: to'liq so'z va ILDIZ.

        To'liq so'z ishonchliroq ("osh" — aynan taom). Ildiz esa
        qo'shimchali shakllarni ushlaydi ("chegirmalar").
      */
      if (words.has(keyword)) {
        score += 2;

        continue;
      }

      if (text.includes(keyword)) score += 1;
    }

    if (score > bestScore) {
      best = category as PostCategoryName;
      bestScore = score;
      isTie = false;

      continue;
    }

    if (score === bestScore && score > 0) isTie = true;
  }

  if (bestScore === 0 || isTie) return null;

  return best;
}

/**
 * Mavzu takliflari.
 *
 * ── Nima uchun matndagilar CHIQARIB tashlanadi ────────────────────────
 * Odam allaqachon yozgan xeshtegni qayta taklif qilish uni
 * chalg'itardi: u taklifni bosib, ikkinchi nusxasini qo'shib
 * qo'yardi.
 */
export function suggestHashtags(body: string, category: PostCategoryName | null): string[] {
  const already = new Set(extractHashtags(body));

  const pool = [...(category ? CATEGORY_HASHTAGS[category] : []), ...GENERAL_HASHTAGS];

  const result: string[] = [];

  for (const tag of pool) {
    if (already.has(tag)) continue;
    if (result.includes(tag)) continue;

    result.push(tag);

    if (result.length >= MAX_SUGGESTED_HASHTAGS) break;
  }

  return result;
}

/**
 * Matn haqida MASLAHATLAR.
 *
 * ── Nima uchun maslahat, avtomatik tuzatish emas ──────────────────────
 * Matnni o'zi tuzatadigan yordamchi muallifning ovozini o'chirardi:
 * hamma post bir xil tilda yozilgandek chiqardi.
 *
 * Maslahat esa qarorni MUALLIFDA qoldiradi — u o'zi biladi.
 */
export function reviewPost(input: {
  body: string;
  hasMedia: boolean;
  hasAttachments: boolean;
  hasCta: boolean;
}): AssistTip[] {
  const tips: AssistTip[] = [];

  const clean = input.body.trim();
  const tags = extractHashtags(input.body);

  if (clean.length > 0 && clean.length < SHORT_BODY_LENGTH) {
    tips.push({
      code: 'SHORT_BODY',
      text: "Matn juda qisqa. Bir-ikki jumla qo'shsangiz, odam nima haqida ekanini tushunadi.",
    });
  }

  if (clean.length === 0 && input.hasMedia) {
    tips.push({
      code: 'NO_BODY',
      text: "Rasm yoki videoga qisqa izoh yozing — u qidiruvda topilishga yordam beradi.",
    });
  }

  if (tags.length === 0 && clean.length > 0) {
    tips.push({
      code: 'NO_HASHTAG',
      text: "Mavzu (#) qo'shing — postingiz mavzu sahifasida ham ko'rinadi.",
    });
  }

  if (tags.length > TOO_MANY_HASHTAGS) {
    tips.push({
      code: 'TOO_MANY_HASHTAGS',
      text: `${tags.length} ta mavzu ko'p — post reklamaga o'xshab qoladi. 3-5 tasi yetarli.`,
    });
  }

  /*
    Katta harf — QICHQIRIQ.

    Faqat uzun matnda tekshiriladi: qisqa sarlavha ("YANGI!") to'liq
    katta harf bo'lishi butunlay normal.
  */
  if (clean.length > 30 && clean === clean.toUpperCase() && /\p{L}/u.test(clean)) {
    tips.push({
      code: 'ALL_CAPS',
      text: "Hammasi katta harfda — bu qichqiriqdek o'qiladi. Oddiy yozuv ishonchliroq.",
    });
  }

  /*
    Biriktirma bor, chaqiruv yo'q.

    Odam mahsulotni ko'radi, qiziqadi — va keyin nima qilishni
    bilmaydi. Chaqiruv aynan shu bo'shliqni to'ldiradi.
  */
  if (input.hasAttachments && !input.hasCta) {
    tips.push({
      code: 'NO_CTA',
      text: "Chaqiruv qo'shing (Telegram, telefon) — qiziqqan odam siz bilan qanday bog'lanishini bilsin.",
    });
  }

  return tips;
}

/** Barcha takliflarni bir joyda hisoblaydi. */
export function assistPost(input: {
  body: string;
  hasMedia: boolean;
  hasAttachments: boolean;
  hasCta: boolean;
}): FeedAssistResult {
  const category = suggestCategory(input.body);

  return {
    category,
    categoryLabel: category ? POST_CATEGORY_LABELS[category] : null,
    hashtags: suggestHashtags(input.body, category),
    tips: reviewPost(input),
  };
}
