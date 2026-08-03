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
}

/**
 * Matnni solishtirishga tayyorlaydi.
 *
 * Apostrof butunlay olib tashlanadi: foydalanuvchi "to'la", "toʻla",
 * "toʼla" yoki "tola" deb yozishi mumkin — hammasi bir xil bo'lsin.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`ʻʼ']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

function matchWords(text: string, words: string[]): boolean {
  return words.some((word) => new RegExp(`(^|\\s)${word}`).test(text));
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
  { intent: Intent.BALANCE, words: ['balans', 'qancha pulim', 'qancha pul', 'hisobimda', 'mablag'] },
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

  const amountText = accountNumber ? withoutPhone.replace(accountNumber, ' ') : withoutPhone;
  const amountSom = extractAmount(amountText);

  const intent = INTENT_KEYWORDS.find((entry) => matchWords(text, entry.words))?.intent ?? Intent.UNKNOWN;

  return { intent, amountSom, phone, providerCode, category, accountNumber };
}
