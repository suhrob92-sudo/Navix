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
import { stripWakeWord } from '@/lib/voice';
import { findPlannedModule } from '@/modules/assistant/assistant.modules';

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
  /** Marketplace'dan mahsulot sotib olish. */
  MARKET_ORDER: 'MARKET_ORDER',
  /**
   * Taksi chaqirish.
   *
   * ── Nima uchun alohida niyat ──────────────────────────────────────
   * "Uyga taksi" gapida na summa bor, na katalog nomi — ya'ni mavjud
   * niyatlarning hech biriga tushmaydi. Ustiga, taksining o'ziga xos
   * savoli bor: QAYERGA. Buni umumiy niyatga tiqib bo'lmaydi.
   */
  BOOK_TAXI: 'BOOK_TAXI',
  /**
   * Oylik moliyaviy hisobot: "shu oyda qancha sarfladim".
   *
   * ── Nima uchun HISTORY dan alohida ────────────────────────────────
   * `HISTORY` amallar RO'YXATINI ochadi — u "qaysi to'lov?" degan
   * savolga javob beradi. Bu yerdagi savol esa boshqa: "JAMI qancha
   * va nimaga?". Ro'yxatni ko'rsatib "o'zingiz qo'shib chiqing"
   * deyish javob emas.
   */
  FINANCE_REPORT: 'FINANCE_REPORT',
  /**
   * Posilka jo'natish.
   *
   * ── HAQIQIY XATO: pul o'tkazmasiga tushib ketardi ──────────────────
   * "Posilka yubor" gapidagi "yubor" so'zi `TRANSFER` ro'yxatida
   * turadi. Natijada yordamchi "Kimga yuboramiz? Telefon raqamini
   * yozing" deb PUL O'TKAZISH oqimini boshlardi.
   *
   * Odam posilka haqida gapirib turib, o'zi bilmagan holda pul
   * yuborish yo'liga tushib qolardi. Shuning uchun bu niyat
   * `TRANSFER` dan OLDIN tekshiriladi.
   */
  SEND_PARCEL: 'SEND_PARCEL',
  /** "Posilkam qayerda?" — jo'natma holati. */
  PARCEL_STATUS: 'PARCEL_STATUS',
  /**
   * Hamkorlik: ijodkor yoki bloger topish.
   *
   * ── Nima uchun yordamchiga kerak ──────────────────────────────────
   * Modul FAQAT lenta ichidagi menyu orqali ochiladi. Ya'ni undan
   * xabari bo'lmagan odam uni hech qachon topmaydi — yordamchidan
   * so'raganda esa "tushunmadim" javobini olardi.
   */
  FIND_CREATOR: 'FIND_CREATOR',
  /** "Takliflarim" — kelgan hamkorlik takliflari. */
  COLLAB_OFFERS: 'COLLAB_OFFERS',
  /**
   * "Buyurtmalarim" — barcha buyurtmalar tarixi.
   *
   * ── HAQIQIY XATO: menyudan TAOM sifatida qidirilardi ──────────────
   * "Buyurtmalarim" gapida "buyurtma" so'zi bor va u `FOOD_ORDER`
   * ro'yxatida turadi. Natijada yordamchi menyudan "buyurtmalarim"
   * degan TAOMNI qidirardi va "Menyulardan 'buyurtmalarim'
   * topilmadi" deb javob berardi — keyin esa odamni
   * restoranlarga yuborardi.
   *
   * Odam esa o'z buyurtmalari TARIXINI so'ragan edi.
   */
  MY_ORDERS: 'MY_ORDERS',
  /** Yordam — nima qila olasan. */
  HELP: 'HELP',
  /**
   * Tushunildi, lekin modul HALI TAYYOR EMAS.
   *
   * `UNKNOWN` dan farqi katta: "taksi chaqir" ni yordamchi tushunadi,
   * shunchaki chaqiradigan taksi yo'q. "Tushunmadim" desa — yolg'on
   * bo'lardi va foydalanuvchi boshqa so'z bilan qayta-qayta urinardi.
   */
  COMING_SOON: 'COMING_SOON',
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
  /**
   * Hisobot qaysi oy uchun so'ralgan.
   *
   * `PREVIOUS` — "o'tgan oyda qancha sarfladim". Boshqa hollarda
   * joriy oy: odam ko'pincha SHU oy haqida so'raydi va har safar
   * "qaysi oy?" deb qayta so'rash suhbatni cho'zardi.
   */
  financeMonth: 'CURRENT' | 'PREVIOUS';
  /** Hisob raqami (kommunal shaxsiy hisob, shartnoma raqami). */
  accountNumber: string | null;
  /**
   * Katalogdan qidiriladigan matn: "lagmon", "telefon", "kitob".
   *
   * Nomi tarixiy — u avval faqat menyu uchun edi. Endi MARKETPLACE
   * uchun ham ishlatiladi: ajratish qoidasi ikkalasida ham bir xil
   * (buyruq so'zlarini olib tashlash), farqi esa qaysi katalogda
   * qidirilishida.
   */
  foodQuery: string | null;
  /** "2 ta lag'mon" — nechta dona. */
  quantity: number | null;
  /** Ro'yxatdan tanlangan raqam: "2. Lag'mon — Milliy Taomlar" → 2. */
  ordinal: number | null;
  /**
   * Taksi qayerga: saqlangan manzil TURI.
   *
   * ── Nima uchun bu yerda faqat TUR bor, manzilning o'zi yo'q ─────────
   * Bu fayl SOF: bazaga murojaat qilmaydi. "Uy" so'zini manzilga
   * aylantirish uchun esa foydalanuvchining saqlangan manzillari
   * kerak — u `assistant.taxi-flow.ts` da o'qiladi.
   *
   * Shunday bo'linish testni ham osonlashtiradi: matnni tushunish
   * alohida, manzilni topish alohida sinaladi.
   */
  taxiDestination: 'HOME' | 'WORK' | null;
  /**
   * Taksi tanlashda NIMA muhim: arzonlik yoki tezlik.
   *
   * Tarifning NOMIDAN alohida saqlanadi. "Eng arzon" — bu tarif emas,
   * bu MAQSAD: qaysi tarif arzon ekanini narxlar hal qiladi va ular
   * ertaga o'zgarishi mumkin.
   */
  taxiPreference: 'CHEAPEST' | 'FASTEST' | null;
  /**
   * Foydalanuvchi ATAYLAB aytgan tarif nomi.
   *
   * `BUSINESS` ham taniladi, garchi bunday tarif hozircha yo'q bo'lsa
   * ham. Tanimasak, "biznes chaqir" degan odam jimgina Ekonom olardi
   * va buni safar tugagach bilib qolardi. Tanisak esa rost javob
   * bera olamiz: "bunday tarif yo'q".
   */
  taxiTariff: 'ECONOM' | 'COMFORT' | 'BUSINESS' | null;
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
  { code: 'hududiy-elektr', words: ['elektr', 'svet', 'svetga', 'yoruglik', 'tok'] },
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
 * Marketplace'ga ishora qiluvchi UMUMIY so'zlar.
 *
 * FOOD_WORDS dan keyin tekshiriladi: "ovqat sotib ol" gapida ikkalasi
 * ham bor, lekin bu baribir ovqat.
 */
const MARKET_WORDS = [
  'sotib ol',
  'sotib olmoqchi',
  'xarid qil',
  'mahsulot',
  'marketplace',
  'katalog',
  'dokon',
  'magazin',
];

/**
 * Mahsulot nomlari — TO'LIQ so'z sifatida solishtiriladi.
 *
 * `DISH_WORDS` bilan bir xil vazifa: "bu gap marketplace haqida" degan
 * xulosa uchun. Haqiqiy qidiruv baza ustidan boradi.
 */
const PRODUCT_WORDS = [
  'telefon',
  'smartfon',
  'noutbuk',
  'kompyuter',
  'monitor',
  'sichqoncha',
  'klaviatura',
  'quloqchin',
  'zaryadlagich',
  'kitob',
  'roman',
  'daftar',
  'kiyim',
  'futbolka',
  'kurtka',
  'palto',
  'krossovka',
  'poyabzal',
  'sumka',
  'changyutgich',
  'dazmol',
  'muzlatgich',
  'konstruktor',
  'krem',
  'shampun',
  'vitamin',
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
  'sotib',
  'ol',
  'olaman',
  'olsam',
  'olmoqchi',
  'olmoqchiman',
  'olib',
  'nima',
  'nimadir',
  'xarid',
  'mahsulot',
  'dokon',
  'dokondan',
  'katalog',
  'qidir',
  'qidiraman',
  'topib',
  'kerakli',
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
/**
 * TAKSI buyruqlari.
 *
 * ── Nima uchun tayyor iboralar ro'yxati EMAS ──────────────────────────
 * Birinchi urinishda "uyga taksi", "uyga qaytmoqchiman" kabi to'liq
 * iboralar ro'yxati yozilgandi. U mo'rt: "uyga eng arzon taksi" yoki
 * "taksi chaqir uyga" ro'yxatda yo'q va tushunilmasdi.
 *
 * Shuning uchun buyruq IKKI BELGIDAN yig'iladi:
 *
 *   1. VOSITA aytilganmi — "taksi";
 *   2. yoki MANZIL va HARAKAT birga aytilganmi — "uyga" + "ketmoqchiman".
 *
 * Bunda so'z tartibi ham, oradagi ortiqcha so'zlar ham ahamiyatsiz.
 *
 * ── Nima uchun "mashina" ro'yxatda yo'q ───────────────────────────────
 * Marketplace'da mashina jihozlari sotiladi va "mashina uchun gilam
 * sotib ol" taksi buyrug'i emas. "Mashina chaqir" esa MANZIL +
 * HARAKAT qoidasi orqali baribir tushuniladi.
 */
const TAXI_VEHICLE_WORDS = ['taksi', 'taxi'];

/**
 * ZAIF transport so'zlari — MANZIL yoki harakat bilan birga.
 *
 * ── Nima uchun yolg'iz yetarli emas ───────────────────────────────────
 * "Mashina" so'zi ikki ma'noda ishlatiladi: chaqiriladigan transport
 * va SOTIB OLINADIGAN tovar. "Mashina sotib ol" — bu Marketplace
 * qidiruvi, taksi emas.
 *
 * Manzil yoki harakat fe'li qo'shilganda esa boshqa ma'no qolmaydi:
 * "ishga mashina yubor" — bu faqat taksi.
 */
const TAXI_WEAK_VEHICLE_WORDS = ['mashina', 'moshin', 'avtomobil'];

/**
 * Harakat so'zlari — "borish" ma'nosini bildiradi.
 *
 * "Buyur", "sotib ol", "yetkazib ber" ATAYLAB yo'q: ular ovqat va
 * Marketplace buyruqlari va ular bu ro'yxatga tushsa, "uyga ovqat
 * buyur" taksi chaqirishga aylanardi.
 */
const TAXI_MOVE_WORDS = [
  'ketmoqchiman',
  'ketaman',
  'qaytmoqchiman',
  'qaytaman',
  'boraman',
  'bormoqchiman',
  'olib bor',
  'olib ket',
  'chaqir',
];

/** Saqlangan manzilga ishora qiluvchi so'zlar. */
const TAXI_HOME_WORDS = ['uyga', 'uyimga'];
const TAXI_WORK_WORDS = ['ishga', 'ishxonaga'];

/** Tarif NOMLARI — `detectTaxiTariff` bilan bir xil ro'yxat. */
const TAXI_TARIFF_WORDS = ['ekonom', 'econom', 'komfort', 'comfort', 'biznes', 'business'];

/**
 * Matn taksi chaqirish haqidami.
 *
 * ── Nima uchun KURYER alohida chiqarib tashlanadi ─────────────────────
 * "Uyga kuryer chaqir" gapida ham manzil, ham harakat bor — qoida
 * bo'yicha u taksi bo'lib qolardi. Holbuki kuryer boshqa modul va u
 * allaqachon ishlaydi.
 */
function isTaxiRequest(text: string): boolean {
  if (matchWords(text, ['kuryer'])) return false;

  if (matchWords(text, TAXI_VEHICLE_WORDS)) return true;

  const hasPlace = matchWords(text, [...TAXI_HOME_WORDS, ...TAXI_WORK_WORDS]);
  const hasMove = matchWords(text, TAXI_MOVE_WORDS);

  /*
    TARIF NOMI ham harakat kabi kuchli belgi.

    "Uyga eng arzon komfort" gapida na "taksi" so'zi bor, na harakat
    fe'li — lekin manzil va tarif nomi birga aytilgan bo'lsa, boshqa
    ma'no yo'q.

    Tarif nomi YOLG'IZ o'zi yetarli emas: "komfort divan" —
    Marketplace qidiruvi. Shuning uchun MANZIL bilan birga talab
    qilinadi.
  */
  const hasTariffName = matchWords(text, TAXI_TARIFF_WORDS);

  /*
    Zaif transport so'zi MANZIL bilan birga kelsa — bu taksi.

    "Ishga mashina yubor" ilgari hech qayerga tushmasdi va
    yordamchi "tushunmadim" derdi (undan oldin esa PUL o'tkazish
    oqimini ochardi).
  */
  const hasWeakVehicle = matchWords(text, TAXI_WEAK_VEHICLE_WORDS);

  return hasPlace && (hasMove || hasTariffName || hasWeakVehicle);
}

/**
 * Nima muhim: arzonlik yoki tezlik.
 *
 * ── Nima uchun TARIF NOMIDAN ajratilgan ───────────────────────────────
 * "Eng arzon" — tarif emas, MAQSAD. Bugun Ekonom arzon, ertaga yangi
 * tarif qo'shilib, u arzonroq bo'lishi mumkin. Maqsadni saqlasak,
 * javob o'zi to'g'rilanadi; tarif nomini saqlasak — qotib qolardi.
 *
 * Ikkalasi birga aytilishi ham mumkin: "eng arzon komfort". Bunday
 * holatda ATAYLAB aytilgan nom ustun turadi (`taxi-flow.ts` da).
 */
function detectTaxiPreference(text: string): 'CHEAPEST' | 'FASTEST' | null {
  if (matchWords(text, ['arzon', 'arzonroq'])) return 'CHEAPEST';
  if (matchWords(text, ['tez', 'tezroq', 'tezda'])) return 'FASTEST';

  return null;
}

/**
 * Foydalanuvchi tarif NOMINI aytdimi.
 *
 * "Biznes" ro'yxatda bor, garchi bunday tarif yo'q bo'lsa ham —
 * sababi `ParsedMessage.taxiTariff` izohida yozilgan.
 */
function detectTaxiTariff(text: string): 'ECONOM' | 'COMFORT' | 'BUSINESS' | null {
  if (matchWords(text, ['biznes', 'business'])) return 'BUSINESS';
  if (matchWords(text, ['komfort', 'comfort'])) return 'COMFORT';
  if (matchWords(text, ['ekonom', 'econom'])) return 'ECONOM';

  return null;
}

/**
 * Matn qaysi SAQLANGAN manzilga ishora qilmoqda.
 *
 * `null` — manzil aytilmagan. Bunday holatda yordamchi qayerga
 * borishni SO'RAYDI, taxmin qilmaydi: noto'g'ri manzilga taksi
 * chaqirish foydalanuvchiga pul va vaqt yo'qotadi.
 */
function detectTaxiDestination(text: string): 'HOME' | 'WORK' | null {
  if (matchWords(text, TAXI_WORK_WORDS)) return 'WORK';
  if (matchWords(text, TAXI_HOME_WORDS)) return 'HOME';

  return null;
}

/**
 * Moliyaviy hisobot so'ralganini aniqlovchi so'zlar.
 *
 * ── Nima uchun "sarf" bitta so'z bilan yetarli ────────────────────────
 * `matchWords` so'z BOSHIDAN solishtiradi, ya'ni "sarf" bitta o'zi
 * "sarfladim", "sarfladingiz", "sarflagan", "sarfim" va "sarf
 * qildim" ni ham qamrab oladi. Ularni alohida yozish ro'yxatni
 * uzaytirardi, foydasi esa nol.
 *
 * ── Nima uchun "solishtir" YOLG'IZ yozilmagan ─────────────────────────
 * "Narxlarni solishtir" — bu moliyaviy hisobot emas, xarid.
 * Shuning uchun so'z faqat OY bilan birga hisobga olinadi.
 */
const FINANCE_WORDS = [
  'sarf',
  'xarajat',
  'qancha ketdi',
  'qayerga ketdi',
  'nimaga ketdi',
  'nimalarga ketdi',
  'moliyaviy hisobot',
  'moliya markazi',
  'oylik hisobot',
  'hisobotim',
  'hisobotni korsat',
  'oy bilan solishtir',
  'oylarni solishtir',
];

/**
 * Hisobot QAYSI oy uchun so'ralgan.
 *
 * Aytilmasa — joriy oy. Odam ko'pincha "shu oyda qancha sarfladim"
 * deb so'raydi va har safar "qaysi oy?" deb qayta so'rash suhbatni
 * behuda cho'zardi.
 */
function detectFinanceMonth(text: string): 'CURRENT' | 'PREVIOUS' {
  /*
    ── "O'tgan oy bilan SOLISHTIR" — bu o'tgan oy hisoboti EMAS ────────
    Gapda "o'tgan oy" bor, lekin odam JORIY oyni so'rayapti: o'tgan
    oy faqat o'lchov nuqtasi.

    Agar buni sezmasak, javob "avgustda 604 000 sarfladingiz" bo'lardi
    va odam so'ragan solishtirish umuman aytilmasdi.
  */
  if (matchWords(text, ['solishtir'])) return 'CURRENT';

  /*
    Apostrof `toSearchText` da olib tashlanadi: "o'tgan" -> "otgan".
    Shuning uchun ro'yxatda apostrofsiz yozilgan.
  */
  return matchWords(text, ['otgan oy', 'utgan oy', 'avvalgi oy', 'oldingi oy', 'gecha oy'])
    ? 'PREVIOUS'
    : 'CURRENT';
}

/**
 * Jo'natma HOLATI so'ralganini bildiruvchi so'zlar.
 *
 * ── Nima uchun bu ro'yxat JO'NATISHDAN oldin turadi ───────────────────
 * "Posilkam qayerda" gapida ham "posilka" so'zi bor. Agar jo'natish
 * ro'yxati oldin tekshirilsa, holat so'ragan odamga yangi jo'natma
 * formasi ochilardi.
 */
const PARCEL_STATUS_WORDS = [
  'posilkam',
  'posilkalarim',
  'jonatmam',
  'jonatmalarim',
  'posilka qayerda',
  'posilka qani',
  'posilka qachon',
  'posilka holati',
  'yukim qayerda',
];

/**
 * Posilka JO'NATISH buyrug'i.
 *
 * "Yuk" so'zi yolg'iz yetarli emas: u boshqa ma'noda ham ishlatiladi
 * ("yuklab ol"). Shuning uchun u faqat jo'natish fe'li bilan birga
 * hisobga olinadi.
 */
const PARCEL_SEND_WORDS = ['posilka', 'yuk jonat', 'yuk yubor', 'yuk tashi'];

/**
 * Kelgan takliflar so'ralganini bildiruvchi so'zlar.
 *
 * Ijodkorni QIDIRISHDAN oldin tekshiriladi: "hamkorlik
 * takliflarim" gapida ikkala ro'yxatning so'zi ham bor va odam
 * qidiruvni emas, o'z qutisini so'rayapti.
 */
const COLLAB_OFFERS_WORDS = [
  'takliflarim',
  'hamkorlik takliflari',
  'hamkorlik taklifi keldi',
  'taklif keldimi',
  'menga taklif',
];

/**
 * Ijodkor QIDIRISH buyrug'i.
 *
 * "Reklama" ham shu yerda: biznes odatda "reklama beraman" deb
 * o'ylaydi, "hamkorlik" so'zini emas.
 */
const COLLAB_FIND_WORDS = ['hamkorlik', 'hamkor top', 'ijodkor', 'bloger', 'blogger', 'reklama'];

/**
 * Buyurtmalar TARIXI so'ralganini bildiruvchi so'zlar.
 *
 * ── Nima uchun "buyurtmam" YO'Q ───────────────────────────────────────
 * "Buyurtmam qayerda" — bu boshqa savol: odam BITTA, hozirgi
 * buyurtmaning holatini so'rayapti (`FOOD_STATUS`). Bu yerdagi
 * so'zlar esa KO'PLIKDA yoki tarixga ishora qiladi.
 */
const MY_ORDERS_WORDS = [
  'buyurtmalarim',
  'buyurtmalar tarixi',
  'buyurtma tarixi',
  'nima buyurtma qilgandim',
  'oldingi buyurtmalar',
];

const PHRASE_INTENTS: { intent: IntentName; words: string[] }[] = [
  /*
    FINANCE_REPORT eng BOSHIDA turadi.

    Sababi ikkita quyidagi ro'yxat bilan to'qnashuvda:
     - "shu oyda qancha PUL sarfladim" gapida `BALANCE` ning
       "qancha pul" iborasi ham bor, lekin bu balans savoli emas;
     - "xarajatlar TARIXI" gapida `HISTORY` ning "tarix" so'zi bor,
       lekin odam ro'yxatni emas, JAMI summani so'rayapti.
  */
  { intent: Intent.FINANCE_REPORT, words: FINANCE_WORDS },
  /*
    POSILKA — pul buyruqlaridan OLDIN.

    "Posilka yubor" dagi "yubor" `TRANSFER` ro'yxatida, "posilka
    qachon keladi" dagi "qachon keladi" esa `FOOD_STATUS` da turadi.
    Ikkalasi ham noto'g'ri javob berardi — biri hatto PUL
    o'tkazish oqimini ochardi.

    Holat jo'natishdan OLDIN: "posilkam qayerda" da ham "posilka"
    so'zi bor.
  */
  { intent: Intent.PARCEL_STATUS, words: PARCEL_STATUS_WORDS },
  { intent: Intent.SEND_PARCEL, words: PARCEL_SEND_WORDS },
  /*
    HAMKORLIK — kelgan takliflar qidiruvdan OLDIN.

    "Hamkorlik takliflarim" gapida ikkala ro'yxatning so'zi ham
    bor, lekin odam qidiruvni emas, o'z qutisini so'rayapti.
  */
  /*
    BUYURTMALAR TARIXI — `FOOD_ORDER` dan oldin.

    "Buyurtmalarim" gapida "buyurtma" so'zi bor va u ovqat
    buyurtmasi ro'yxatida turadi.
  */
  { intent: Intent.MY_ORDERS, words: MY_ORDERS_WORDS },
  { intent: Intent.COLLAB_OFFERS, words: COLLAB_OFFERS_WORDS },
  { intent: Intent.FIND_CREATOR, words: COLLAB_FIND_WORDS },
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
];

/**
 * Umumiy buyruqlar — aniq nom aytilmaganda ishlaydi.
 *
 * FOOD_ORDER va MARKET_ORDER bu yerda TRANSFER va PAY_SERVICE dan
 * OLDIN turadi:
 *  · "ovqat yetkazib yubor" — bu pul o'tkazma emas;
 *  · "ovqatga to'la"        — bu kommunal to'lov emas.
 */
/**
 * ── HAQIQIY XATO: PUL fe'llari hamma narsani o'ziga tortardi ──────────
 * "Yubor", "jo'nat" va "to'la" so'zlari pul buyruqlari ro'yxatida
 * turardi — GAPNING QOLGANIGA QARAMASDAN. Natijada:
 *
 *   "do'stimga xabar yubor"   -> pul o'tkazish
 *   "rasm yubor"              -> pul o'tkazish
 *   "rezyume yubor"           -> pul o'tkazish
 *   "avtobus chiptasi yubor"  -> pul o'tkazish
 *   "mehmonxonaga to'la"      -> kommunal to'lov
 *   "posilka yubor"           -> pul o'tkazish
 *
 * Har birida yordamchi "Kimga yuboramiz? Telefon raqamini yozing"
 * deb javob berardi va odam o'zi bilmagan holda PUL yuborish
 * yo'liga tushib qolardi.
 *
 * Bittasi (posilka) alohida tuzatilgandi. Lekin xato BITTA
 * buyruqda emas — QOIDADA edi: har safar yangi modul qo'shilganda
 * u qaytadan paydo bo'lardi.
 *
 * ── Yechim: pul fe'li PUL BELGISI bilan birga kelishi kerak ───────────
 * Haqiqiy pul buyrug'ida har doim biror belgi bo'ladi: summa,
 * telefon raqami, provayder nomi yoki "pul" so'zining o'zi.
 * "Xabar yubor" da ularning hech biri yo'q.
 *
 * ── Nima uchun IKKI ro'yxat ───────────────────────────────────────────
 * "Hisobni to'ldir" va "perevod" — o'zi yetarli aniq, ularga
 * qo'shimcha belgi kerak emas. "Yubor" esa yolg'iz hech narsani
 * anglatmaydi.
 */
interface CommandEntry {
  intent: IntentName;
  /** Har doim ishlaydigan aniq iboralar. */
  words: string[];
  /** Faqat PUL BELGISI bo'lganda ishlaydigan umumiy fe'llar. */
  moneyVerbs?: string[];
}

const COMMAND_INTENTS: CommandEntry[] = [
  { intent: Intent.FOOD_ORDER, words: FOOD_WORDS },
  { intent: Intent.MARKET_ORDER, words: MARKET_WORDS },
  {
    intent: Intent.TOPUP,
    words: ['hisobni toldir', 'hisobimni toldir', 'balansni toldir', 'hamyonni toldir', 'pul sol'],
    moneyVerbs: ['toldir'],
  },
  {
    intent: Intent.TRANSFER,
    words: ['pul ber', 'pul yubor', 'pul jonat', 'pul otkaz', 'perevod'],
    moneyVerbs: ['otkaz', 'yubor', 'jonat'],
  },
  { intent: Intent.HISTORY, words: ['tarix', 'chek', 'oxirgi amal', 'harakatlar'] },
  {
    intent: Intent.PAY_SERVICE,
    words: ['oplata', 'oplatit'],
    moneyVerbs: ['tola', 'tolov', 'tolash'],
  },
];

/**
 * Foydalanuvchi matnini tahlil qiladi.
 *
 * Telefon raqami summadan OLDIN ajratiladi va matndan olib tashlanadi —
 * aks holda "901234567" raqami summa deb o'qilardi.
 */
export function parseMessage(rawText: string): ParsedMessage {
  /**
   * Chaqiruv so'zi ("navix") buyruqning bir qismi emas.
   *
   * Ovoz bilan gapirganda odam odatda "Navix, lag'mon buyur" deydi.
   * Kesilmasa, "navix" so'zi qidiruv matniga tushib ketardi va menyuda
   * hech narsa topilmasdi.
   */
  const text = stripWakeWord(normalize(rawText));

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

  const intent = detectIntent(text, { amountSom, phone, providerCode, category });

  // Xarid niyatida bo'lgandagina katalog so'zlarini ajratamiz — boshqa
  // buyruqlarda bu ortiqcha ish va noto'g'ri natija berardi.
  const isShopping = intent === Intent.FOOD_ORDER || intent === Intent.MARKET_ORDER;
  const foodQuery = isShopping ? extractFoodQuery(withoutPhone) : null;

  /*
    Taksi maydonlari FAQAT taksi buyrug'ida ajratiladi.

    Boshqa joyda bu ortiqcha ish va xato manba: "arzon telefon qidir"
    gapidagi "arzon" Marketplace qidiruvi uchun, taksi tarifi uchun
    emas.
  */
  const isTaxi = intent === Intent.BOOK_TAXI;
  const taxiDestination = isTaxi ? detectTaxiDestination(text) : null;
  const taxiPreference = isTaxi ? detectTaxiPreference(text) : null;
  const taxiTariff = isTaxi ? detectTaxiTariff(text) : null;

  return {
    intent,
    amountSom,
    phone,
    providerCode,
    category,
    accountNumber,
    foodQuery,
    quantity,
    ordinal,
    taxiDestination,
    taxiPreference,
    taxiTariff,
    financeMonth: detectFinanceMonth(text),
  };
}

/**
 * Niyatni aniqlaydi.
 *
 * Avval ro'yxatdagi iboralar (boshidan solishtiriladi), keyin taom
 * nomlari (to'liq so'z sifatida) tekshiriladi.
 */
/**
 * Gapda PUL belgisi bormi.
 *
 * Haqiqiy pul buyrug'ida har doim biror belgi bo'ladi: summa,
 * telefon raqami, provayder nomi yoki "pul" so'zining o'zi.
 * "Xabar yubor" da ularning hech biri yo'q.
 */
export interface MoneySignal {
  amountSom: number | null;
  phone: string | null;
  providerCode: string | null;
  category: string | null;
}

function hasMoneySignal(text: string, signal: MoneySignal): boolean {
  if (signal.amountSom !== null) return true;
  if (signal.phone !== null) return true;
  if (signal.providerCode !== null) return true;
  if (signal.category !== null) return true;

  /* "Pulni o'tkaz" — summa aytilmagan, lekin ma'no aniq. */
  return matchWords(text, ['pul', 'mablag', 'som']);
}

function detectIntent(text: string, signal: MoneySignal): IntentName {
  /**
   * ── Tartib MUHIM ────────────────────────────────────────────────────
   *
   * 1. Aniq iboralar ("buyurtmam qayerda") — ular eng ma'noli;
   * 2. ANIQ NOM: "lagmon" yoki "telefon". Aniq nom umumiy buyruqdan
   *    kuchliroq: "telefon buyur" da "buyur" ikkala modulda ham bor,
   *    "telefon" esa faqat bittasida;
   * 3. Umumiy buyruqlar ("ovqat", "sotib ol") — nom aytilmagan holat;
   * 4. Pul buyruqlari.
   *
   * ── Nima uchun ro'yxatlar TO'LIQ yechim emas ────────────────────────
   * "zaryadlagich buyur" da hech qanday nom ro'yxatda yo'q. Bunday
   * holatda niyat FOOD_ORDER bo'lib qoladi, lekin menyudan hech narsa
   * topilmaydi — shunda `assistant.service.ts` KATALOGDAN qidiradi.
   *
   * Ya'ni oxirgi qarorni qo'lda yozilgan so'zlar emas, MA'LUMOT
   * qabul qiladi. Ro'yxat faqat tez yo'lni ochadi.
   */
  const byPhrase = PHRASE_INTENTS.find((entry) => matchWords(text, entry.words))?.intent;
  if (byPhrase) return byPhrase;

  /*
    TAKSI — aniq iboralardan KEYIN, katalog nomlaridan OLDIN.

    Keyin: "buyurtmam qayerda" gapida ham "buyurtma" bor, lekin u
    yangi taksi emas.

    Oldin: "uyga taksi" gapida hech qanday taom yoki mahsulot nomi
    yo'q, lekin "taksi" so'zining o'zi yetarli aniq. Agar katalog
    tekshiruvidan keyin qo'yilsa, ro'yxatlar o'sganda tasodifiy
    to'qnashuv ehtimoli paydo bo'lardi.
  */
  if (isTaxiRequest(text)) return Intent.BOOK_TAXI;

  if (matchExactWords(text, DISH_WORDS)) return Intent.FOOD_ORDER;
  if (matchExactWords(text, PRODUCT_WORDS)) return Intent.MARKET_ORDER;

  const byCommand = COMMAND_INTENTS.find((entry) => {
    if (matchWords(text, entry.words)) return true;

    /*
      Umumiy pul fe'li FAQAT pul belgisi bilan birga hisobga
      olinadi — aks holda "xabar yubor" pul o'tkazishga aylanardi.
    */
    return entry.moneyVerbs !== undefined && hasMoneySignal(text, signal) && matchWords(text, entry.moneyVerbs);
  })?.intent;

  if (byCommand) return byCommand;

  /**
   * Oxirgi urinish: bu hali TAYYOR BO'LMAGAN modulmi?
   *
   * Eng oxirida turadi va bu ataylab: ishlab turgan modul buyrug'i
   * "tez orada" javobini olmasligi kerak. Masalan "kuryer chaqir"
   * emas, "taksi chaqir" shu yerga tushadi.
   */
  if (findPlannedModule(text)) return Intent.COMING_SOON;

  return Intent.UNKNOWN;
}
