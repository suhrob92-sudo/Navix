/**
 * Foydalanuvchi matnini TUSHUNADIGAN qism.
 *
 * ── Nima uchun til modeli (LLM) emas ──────────────────────────────────
 * LLM kuchli, lekin: pullik API kaliti kerak, har javob 1-3 soniya kutadi,
 * internet uzilsa umuman ishlamaydi va eng yomoni — ba'zan "o'ylab topadi"
 * (hallucination). PUL bilan ishlaydigan buyruqda bu qabul qilib bo'lmas.
 *
 * Shuning uchun bu yerda ANIQ qoidalar ishlatiladi: har bir buyruq
 * tekshirilgan, natija har doim bir xil va bepul. Til modeli keyinchalik
 * FAQAT tushunilmagan matnlar uchun qo'shiladi — `assistant.service.ts`
 * dagi oqim o'zgarmaydi.
 *
 * Bu fayl sof (pure): bazaga ham, tarmoqqa ham murojaat qilmaydi.
 * Shuning uchun uni to'liq test bilan qoplash mumkin.
 */

import { toSearchText } from '@/lib/search';

/** Foydalanuvchi nima qilmoqchi. */
export const Intent = {
  /** Balansni bilish. */
  BALANCE: 'BALANCE',
  /** Hisobni to'ldirish. */
  TOPUP: 'TOPUP',
  /** Boshqa odamga pul yuborish. */
  TRANSFER: 'TRANSFER',
  /** Kommunal, internet, mobil va TV to'lovi. */
  PAY_SERVICE: 'PAY_SERVICE',
  /** Amallar tarixi. */
  HISTORY: 'HISTORY',
  /** Ovqat buyurtma qilish. */
  FOOD_ORDER: 'FOOD_ORDER',
  /** "Buyurtmam qayerda?" — yetkazish holati. */
  FOOD_STATUS: 'FOOD_STATUS',
  /** Yordam — nima qila olasan. */
  HELP: 'HELP',
  /** Tushunilmadi. */
  UNKNOWN: 'UNKNOWN',
} as const;

export type IntentName = (typeof Intent)[keyof typeof Intent];

export interface ParsedMessage {
  intent: IntentName;
  /** Matndan topilgan summa, SO'MDA. */
  amountSom: number | null;
  /** E.164 ko'rinishidagi telefon raqami. */
  phone: string | null;
  /** Provayder kodi ("hududgaz", "beeline"). */
  providerCode: string | null;
  /** Xizmat toifasi — aniq provayder aytilmagan bo'lsa. */
  category: 'UTILITY' | 'INTERNET' | 'MOBILE' | 'TV' | null;
  /** Hisob raqami (kommunal shaxsiy hisob, shartnoma raqami). */
  accountNumber: string | null;
  /** Menyudan qidiriladigan matn: "lagmon", "burger", "shirinlik". */
  foodQuery: string | null;
  /** "2 ta lag'mon" — nechta dona. */
  quantity: number | null;
  /** Ro'yxatdan tanlangan raqam: "2. Lag'mon — Milliy Taomlar" → 2. */
  ordinal: number | null;
}

/**
 * Matnni solishtirishga tayyorlaydi.
 *
 * Apostrof butunlay olib tashlanadi: foydalanuvchi "to'la", "toʻla",
 * "toʼla" yoki "tola" deb yozishi mumkin — hammasi bir xil bo'lsin.
 *
 * Bazadagi taom nomlari ham AYNI SHU funksiyadan o'tkazilib saqlanadi
 * (`searchName` ustuni), shuning uchun solishtirish "olma-olma" bo'ladi.
 */
export function normalize(text: string): string {
  return toSearchText(text);
}

// ── Raqamlar ──────────────────────────────────────────────────────────

/** So'z bilan yozilgan sonlar — "ellik ming" kabi iboralar uchun. */
const WORD_NUMBERS: Record<string, number> = {
  bir: 1,
  ikki: 2,
  uch: 3,
  tort: 4,
  besh: 5,
  olti: 6,
  yetti: 7,
  sakkiz: 8,
  toqqiz: 9,
  on: 10,
  yigirma: 20,
  ottiz: 30,
  qirq: 40,
  ellik: 50,
  oltmish: 60,
  yetmish: 70,
  sakson: 80,
  toqson: 90,
  yuz: 100,
};

/** Ko'paytiruvchilar: "ming", "mln". */
const MULTIPLIERS: { pattern: RegExp; factor: number }[] = [
  { pattern: /^(mln|million)/, factor: 1_000_000 },
  { pattern: /^(ming|min)/, factor: 1_000 },
];

/** Matndagi ko'paytiruvchini topadi (bo'lmasa 1). */
function readMultiplier(word: string | undefined): number {
  if (!word) return 1;

  for (const { pattern, factor } of MULTIPLIERS) {
    if (pattern.test(word)) return factor;
  }

  return 1;
}

/**
 * Matndan summani ajratadi.
 *
 * Qo'llab-quvvatlanadi:
 *   "50000", "50 000", "50ming", "50 ming", "2 mln",
 *   "ellik ming", "yarim million"
 *
 * @param text Tozalangan (normalize qilingan) matn
 */
export function extractAmount(text: string): number | null {
  // "yarim million" / "yarim ming"
  const half = text.match(/yarim\s+(million|mln|ming)/);
  if (half) return readMultiplier(half[1]) / 2;

  // Raqam + (ixtiyoriy) ko'paytiruvchi. Raqam ichida probel bo'lishi mumkin.
  const numeric = text.match(/(\d[\d\s]*)\s*(ming|min|mln|million)?/);

  if (numeric) {
    const digits = numeric[1].replace(/\s/g, '');
    const value = Number(digits);

    if (Number.isSafeInteger(value) && value > 0) {
      return value * readMultiplier(numeric[2]);
    }
  }

  // So'z bilan: "ellik ming", "besh ming"
  const words = text.split(' ');

  for (let index = 0; index < words.length; index += 1) {
    const base = WORD_NUMBERS[words[index]];
    if (base === undefined) continue;

    const factor = readMultiplier(words[index + 1]);
    if (factor > 1) return base * factor;
  }

  return null;
}

// ── Telefon raqami ────────────────────────────────────────────────────

/**
 * Matndan O'zbekiston raqamini ajratadi.
 *
 * Qabul qilinadi: "+998901234567", "998901234567", "901234567",
 * "90 123 45 67". Faqat 9 xonali milliy raqam ham bo'ladi.
 */
export function extractPhone(text: string): string | null {
  const digitsOnly = text.replace(/\D/g, '');

  // Xalqaro ko'rinish: 998 + 9 raqam
  const international = digitsOnly.match(/998(\d{9})/);
  if (international) return `+998${international[1]}`;

  // Milliy: operator kodi 9 bilan boshlanadigan 9 raqam.
  // Kommunal hisob raqamlari 10-12 xonali bo'lgani uchun aniq 9 ta bo'lishi shart.
  const national = text.match(/(?<!\d)((?:\d[\s-]?){8}\d)(?!\d)/);

  if (national) {
    const digits = national[1].replace(/\D/g, '');
    if (digits.length === 9 && /^(9|8|7|3|2|1|6|5|4|0)/.test(digits)) {
      return `+998${digits}`;
    }
  }

  return null;
}

// ── Xizmatlar ─────────────────────────────────────────────────────────

/** Provayder kodini aniqlaydigan kalit so'zlar. */
const PROVIDER_KEYWORDS: { code: string; words: string[] }[] = [
  { code: 'hududgaz', words: ['hududgaz', 'gaz', 'gazga', 'gazni'] },
  { code: 'suvoqova', words: ['suvoqova', 'suv', 'suvga', 'suvni'] },
  { code: 'hududiy-elektr', words: ['elektr', 'svet', 'svetga', 'yorugliк', 'toк'] },
  { code: 'issiqlik-manbai', words: ['issiqlik', 'isitish', 'otoplenie'] },
  { code: 'beeline', words: ['beeline', 'bilayn', 'bilain'] },
  { code: 'ucell', words: ['ucell', 'yusel', 'usel'] },
  { code: 'ums', words: ['ums', 'mobiuz mts'] },
  { code: 'mobiuz', words: ['mobiuz', 'mobiyuz'] },
  { code: 'humans', words: ['humans', 'hyumans'] },
  { code: 'uzonline', words: ['uzonline', 'uzonlayn'] },
  { code: 'sarkor', words: ['sarkor'] },
  { code: 'comnet', words: ['comnet', 'komnet'] },
  { code: 'uzdigital', words: ['uzdigital', 'uzdijital'] },
  { code: 'sipnet', words: ['sipnet'] },
];

/** Aniq provayder aytilmagan bo'lsa — toifa bo'yicha. */
const CATEGORY_KEYWORDS: { category: ParsedMessage['category']; words: string[] }[] = [
  { category: 'UTILITY', words: ['kommunal', 'kommunalka', 'kvartplata'] },
  { category: 'MOBILE', words: ['telefon', 'uyali', 'aloqa', 'nomer', 'raqam'] },
  { category: 'INTERNET', words: ['internet', 'wifi', 'vayfay'] },
  { category: 'TV', words: ['tv', 'televidenie', 'televizor', 'kabel'] },
];

/**
 * So'z BOSHIDAN mos kelsa — topildi.
 *
 * O'zbek tilida qo'shimchalar so'z oxiriga qo'shiladi ("ovqat" →
 * "ovqatga", "ovqatlanmoqchiman"), shuning uchun boshidan solishtirish
 * to'g'ri natija beradi.
 */
function matchWords(text: string, words: string[]): boolean {
  return words.some((word) => new RegExp(`(^|\\s)${word}`).test(text));
}

/**
 * So'z TO'LIQ mos kelsa — topildi.
 *
 * Qisqa so'zlar uchun kerak. Masalan "osh" taomini boshidan
 * solishtirsak, "hisobni OSHir" ham ovqat buyurtmasi bo'lib qolardi.
 */
function matchExactWords(text: string, words: string[]): boolean {
  const parts = text.split(' ');
  return words.some((word) => parts.includes(word));
}

// ── Ovqat ─────────────────────────────────────────────────────────────

/**
 * Ovqat buyurtmasiga ishora qiluvchi UMUMIY so'zlar.
 *
 * Bular boshidan solishtiriladi: "ovqat" → "ovqatga", "ovqatlanaman".
 */
const FOOD_WORDS = [
  'ovqat',
  'buyurtma ber',
  'buyurtma qil',
  'buyur',
  'zakaz',
  'och qoldim',
  'qornim',
  'yegim kel',
  'yeyman',
  'yegani',
  'restoran',
  'nonushta',
  'tushlik',
  'kechki ovqat',
  'kechlik',
  'yetkazib ber',
];

/**
 * Taom nomlari — TO'LIQ so'z sifatida solishtiriladi.
 *
 * Bu ro'yxat menyuni almashtirmaydi: u faqat "bu gap ovqat haqida"
 * degan xulosa uchun kerak. Haqiqiy qidiruv baza ustidan boradi.
 */
const DISH_WORDS = [
  'osh',
  'palov',
  'lagmon',
  'manti',
  'somsa',
  'kabob',
  'shashlik',
  'chuchvara',
  'shurva',
  'norin',
  'burger',
  'pitsa',
  'pizza',
  'lavash',
  'shaurma',
  'sushi',
  'rol',
  'salat',
  'shirinlik',
  'tort',
  'kofe',
  'qahva',
  'choy',
  'kartoshka',
];

/**
 * Sinonimlar: foydalanuvchi so'zi → BAZADA BOR so'z.
 *
 * Faqat haqiqatan ham boshqacha atalgan narsalar. Qo'shimchali
 * shakllar ("pitsalar") kerak emas — qidiruv so'z boshidan ishlaydi.
 */
const FOOD_SYNONYMS: Record<string, string> = {
  pizza: 'pitsa',
  sushi: 'rol',
  qahva: 'kofe',
  tort: 'shirinlik',
  palov: 'osh',
  shashlik: 'kabob',
  desert: 'shirinlik',
  gazak: 'salat',
};

/**
 * Qidiruvdan chiqarib tashlanadigan so'zlar.
 *
 * "menga 2 ta lag'mon buyur" gapidan faqat "lagmon" qolishi kerak.
 */
const FOOD_STOP_WORDS = new Set([
  'menga',
  'men',
  'bir',
  'ta',
  'dona',
  'porsiya',
  'buyur',
  'buyurtma',
  'ber',
  'bering',
  'qil',
  'qilaman',
  'qilmoqchiman',
  'zakaz',
  'ovqat',
  'ovqatlanmoqchiman',
  'och',
  'qoldim',
  'qornim',
  'yegim',
  'kelyapti',
  'keldi',
  'yeyman',
  'xohlayman',
  'istayman',
  'kerak',
  'iltimos',
  'tez',
  'hozir',
  'uchun',
  'ham',
  'va',
  'yana',
  'yetkaz',
  'yetkazib',
  'restoran',
  'restorandan',
]);

/**
 * Pul birliklari — qo'shimchasi bilan birga tushadi.
 *
 * "50 minggacha" bitta so'z bo'lib keladi, shuning uchun uni to'liq
 * ro'yxatga yozib bo'lmaydi: boshidan solishtiriladi.
 */
const MONEY_WORD_PREFIXES = ['ming', 'mln', 'million', 'som', 'soum'];

/**
 * Matndan menyu qidiruvi uchun so'zlarni ajratadi.
 *
 * Qaytadi: probel bilan ajratilgan qidiruv so'zlari yoki `null`.
 * Sinonimlar bazadagi so'zga almashtiriladi.
 *
 * @example
 *   extractFoodQuery("menga 2 ta lagmon buyur") // "lagmon"
 *   extractFoodQuery("pizza istayman")          // "pitsa"
 *   extractFoodQuery("och qoldim")              // null
 */
export function extractFoodQuery(text: string): string | null {
  const words = text
    .split(' ')
    // Raqamlar taom nomi emas.
    .filter((word) => word.length >= 3 && !/^\d+$/.test(word))
    .filter((word) => !FOOD_STOP_WORDS.has(word))
    .filter((word) => !MONEY_WORD_PREFIXES.some((prefix) => word.startsWith(prefix)))
    .map((word) => FOOD_SYNONYMS[word] ?? word);

  // Takrorlarni olib tashlaymiz: "pizza pitsa" → "pitsa".
  const unique = [...new Set(words)];

  return unique.length > 0 ? unique.join(' ') : null;
}

/**
 * "2 ta", "3 dona" — nechta dona.
 *
 * Chegara 20 ta: undan ko'pini `food.schemas.ts` baribir rad etadi,
 * lekin foydalanuvchiga xatoni yordamchi darhol aytgani yaxshi.
 */
export function extractQuantity(text: string): number | null {
  const match = text.match(/(?<!\d)(\d{1,2})\s*(?:ta|dona|porsiya)(?:\s|$)/);

  if (!match) return null;

  const value = Number(match[1]);

  return value >= 1 ? value : null;
}

/**
 * Ro'yxatdan tanlangan raqam.
 *
 * Yordamchi variantlarni "1. Lag'mon — Milliy Taomlar" ko'rinishida
 * beradi. Foydalanuvchi shu tugmani bossa, matn ayni shunday qaytadi —
 * boshidagi raqam esa tanlov degani.
 *
 * ── Nima uchun XOM matn ───────────────────────────────────────────────
 * `normalize()` nuqtani olib tashlaydi ("1." → "1"), shuning uchun
 * tozalangan matnda tanlovni "2 ta osh" dan ajratib bo'lmaydi. Bu
 * funksiya ataylab xom matn ustida ishlaydi.
 *
 * Qabul qilinadi: "1." · "1)" · yolg'iz "1".
 */
export function extractOrdinal(rawText: string): number | null {
  const match = rawText.match(/^\s*(\d{1,2})\s*$/) ?? rawText.match(/^\s*(\d{1,2})\s*[.)]/);

  if (!match) return null;

  const value = Number(match[1]);

  return value >= 1 && value <= 20 ? value : null;
}

// ── Niyat ─────────────────────────────────────────────────────────────

/**
 * Niyat kalit so'zlari.
 *
 * Tartib MUHIM: yuqoridagi birinchi mos kelgani tanlanadi. Masalan
 * "hisobni to'ldir" ham "to'la" so'ziga o'xshaydi, shuning uchun
 * TOPUP tekshiruvi PAY_SERVICE dan oldin turadi.
 */
const INTENT_KEYWORDS: { intent: IntentName; words: string[] }[] = [
  { intent: Intent.HELP, words: ['yordam', 'nima qila olasan', 'nimalar qila', 'qanday ishlaysan'] },
  /**
   * FOOD_STATUS — FOOD_ORDER dan OLDIN: "buyurtmam qayerda" gapida
   * "buyurtma" so'zi bor, lekin bu yangi buyurtma emas.
   */
  {
    intent: Intent.FOOD_STATUS,
    words: [
      'buyurtmam qayerda',
      'buyurtmam qani',
      'buyurtmam qachon',
      'ovqatim qayerda',
      'ovqatim qani',
      'ovqatim qachon',
      'buyurtma holati',
      'buyurtmam holati',
      'kuryer qayerda',
      'yetkazildimi',
      'qachon keladi',
    ],
  },
  { intent: Intent.BALANCE, words: ['balans', 'qancha pulim', 'qancha pul', 'hisobimda', 'mablag'] },
  /**
   * FOOD_ORDER — TRANSFER va PAY_SERVICE dan OLDIN:
   *  · "ovqat yetkazib yubor" — bu pul o'tkazma emas;
   *  · "ovqatga to'la"        — bu kommunal to'lov emas.
   *
   * Lekin BALANCE dan KEYIN: "ovqatga qancha pulim bor" savolida
   * odam baribir balansni so'rayapti.
   */
  { intent: Intent.FOOD_ORDER, words: FOOD_WORDS },
  {
    intent: Intent.TOPUP,
    words: ['hisobni toldir', 'hisobimni toldir', 'balansni toldir', 'hamyonni toldir', 'pul sol', 'toldir'],
  },
  { intent: Intent.TRANSFER, words: ['otkaz', 'yubor', 'jonat', 'pul ber', 'perevod'] },
  { intent: Intent.HISTORY, words: ['tarix', 'chek', 'oxirgi amal', 'harakatlar'] },
  { intent: Intent.PAY_SERVICE, words: ['tola', 'tolov', 'tolash', 'oplata', 'oplatit'] },
];

/**
 * Foydalanuvchi matnini tahlil qiladi.
 *
 * Telefon raqami summadan OLDIN ajratiladi va matndan olib tashlanadi —
 * aks holda "901234567" raqami summa deb o'qilardi.
 */
export function parseMessage(rawText: string): ParsedMessage {
  const text = normalize(rawText);

  const phone = extractPhone(text);

  // Raqamni olib tashlab, qolgan matndan summani qidiramiz.
  const withoutPhone = phone ? text.replace(/(?:\d[\s-]?){8,}\d/g, ' ') : text;

  const providerCode = PROVIDER_KEYWORDS.find((entry) => matchWords(text, entry.words))?.code ?? null;
  const category = CATEGORY_KEYWORDS.find((entry) => matchWords(text, entry.words))?.category ?? null;

  // Xizmat to'lovida uzun raqam — bu hisob raqami, summa emas.
  const accountMatch = withoutPhone.match(/(?<!\d)(\d{8,12})(?!\d)/);
  const accountNumber = accountMatch ? accountMatch[1] : null;

  const ordinal = extractOrdinal(rawText);
  const quantity = extractQuantity(withoutPhone);

  /**
   * Summani qidirishdan oldin taomga tegishli raqamlarni olib tashlaymiz.
   * Aks holda "2 ta lag'mon" gapidagi 2 — summa bo'lib qolardi.
   */
  let amountText = accountNumber ? withoutPhone.replace(accountNumber, ' ') : withoutPhone;
  if (quantity !== null) amountText = amountText.replace(/(?<!\d)\d{1,2}\s*(?:ta|dona|porsiya)(?=\s|$)/, ' ');
  if (ordinal !== null) amountText = amountText.replace(/^\s*\d{1,2}\s*/, ' ');

  const amountSom = extractAmount(amountText);

  const intent = detectIntent(text);

  // Ovqat niyatida bo'lgandagina menyu so'zlarini ajratamiz — boshqa
  // buyruqlarda bu ortiqcha ish va noto'g'ri natija berardi.
  const foodQuery = intent === Intent.FOOD_ORDER ? extractFoodQuery(withoutPhone) : null;

  return { intent, amountSom, phone, providerCode, category, accountNumber, foodQuery, quantity, ordinal };
}

/**
 * Niyatni aniqlaydi.
 *
 * Avval ro'yxatdagi iboralar (boshidan solishtiriladi), keyin taom
 * nomlari (to'liq so'z sifatida) tekshiriladi.
 */
function detectIntent(text: string): IntentName {
  const byKeyword = INTENT_KEYWORDS.find((entry) => matchWords(text, entry.words))?.intent;

  if (byKeyword) return byKeyword;

  return matchExactWords(text, DISH_WORDS) ? Intent.FOOD_ORDER : Intent.UNKNOWN;
}
