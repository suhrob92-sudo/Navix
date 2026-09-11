import { describe, expect, it } from 'vitest';

import { Intent, parseMessage } from '@/modules/assistant/intent';

/**
 * Hech bir buyruq ADASHIB pul oqimiga tushmasligi kerak.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * "Yubor", "jo'nat" va "to'la" so'zlari pul buyruqlari ro'yxatida
 * turardi — GAPNING QOLGANIGA QARAMASDAN:
 *
 *   "do'stimga xabar yubor"   -> pul o'tkazish
 *   "rasm yubor"              -> pul o'tkazish
 *   "rezyume yubor"           -> pul o'tkazish
 *   "avtobus chiptasi yubor"  -> pul o'tkazish
 *   "mehmonxonaga to'la"      -> kommunal to'lov
 *
 * Har birida yordamchi "Kimga yuboramiz? Telefon raqamini yozing"
 * deb javob berardi va odam o'zi bilmagan holda PUL yuborish
 * yo'liga tushib qolardi.
 *
 * ── Nima uchun bu sinov ALOHIDA faylda ────────────────────────────────
 * Xato bitta buyruqda emas, QOIDADA edi: har safar yangi modul
 * qo'shilganda u qaytadan paydo bo'lardi. Posilka moduli
 * qo'shilganda aynan shunday bo'ldi.
 *
 * Shuning uchun bu yerda har bir modul uchun "pul fe'li bilan
 * yozilgan" ibora turadi. Yangi modul qo'shgan odam bu ro'yxatga
 * o'z qatorini qo'shishi kerak — va o'shanda xato darhol
 * ko'rinadi.
 */

/** Pul harakatlanadigan niyatlar. */
const MONEY_INTENTS: string[] = [Intent.TRANSFER, Intent.TOPUP, Intent.PAY_SERVICE];

/**
 * Pul fe'li ishlatilgan, lekin PUL HAQIDA BO'LMAGAN iboralar.
 *
 * Har biri haqiqiy foydalanuvchi yozishi mumkin bo'lgan gap.
 */
const NOT_MONEY = [
  // Taksi
  'ishga mashina yubor',
  "menga taksi jo'nat",
  // Ovqat
  'osh yubor',
  "ovqatga to'la",
  // Marketplace
  'kitob yubor',
  // Posilka
  'posilka yubor',
  "yuk jo'nat",
  // Mehmonxona va sayohat
  "mehmonxonaga to'la",
  'avtobus chiptasi yubor',
  // Ish qidirish
  'rezyume yubor',
  // Hamkorlik
  'hamkorlik taklifini yubor',
  // Xabarlar va lenta
  "do'stimga xabar yubor",
  'rasm yubor',
  'video yubor',
];

/**
 * HAQIQIY pul buyruqlari — ular ishlashda davom etishi SHART.
 *
 * Tuzatish "hammasini rad et" bo'lib qolmasligi uchun: pul
 * buyruqlari buzilsa, hamyon moduli ishlamay qolardi.
 */
const REAL_MONEY: [string, string][] = [
  ['901234567 ga 50 ming yubor', Intent.TRANSFER],
  ["50 ming jo'nat", Intent.TRANSFER],
  ["pulni o'tkaz", Intent.TRANSFER],
  ['perevod', Intent.TRANSFER],
  ["hisobni to'ldir", Intent.TOPUP],
  ["50 ming to'ldir", Intent.TOPUP],
  ["gazga 50 ming to'la", Intent.PAY_SERVICE],
  ["kommunal to'la", Intent.PAY_SERVICE],
];

describe('pul oqimiga adashib tushmaslik', () => {
  for (const text of NOT_MONEY) {
    it(`"${text}" pul buyrug'i emas`, () => {
      const intent = parseMessage(text).intent;

      expect(MONEY_INTENTS, `"${text}" -> ${intent}`).not.toContain(intent);
    });
  }
});

describe('haqiqiy pul buyruqlari ishlaydi', () => {
  for (const [text, expected] of REAL_MONEY) {
    it(`"${text}" -> ${expected}`, () => {
      expect(parseMessage(text).intent).toBe(expected);
    });
  }
});

describe('modul buyruqlari toʻgʻri manzilga boradi', () => {
  const ROUTES: [string, string][] = [
    ['uyga taksi', Intent.BOOK_TAXI],
    ['ishga mashina yubor', Intent.BOOK_TAXI],
    ['2 ta lagmon buyur', Intent.FOOD_ORDER],
    ['buyurtmam qayerda', Intent.FOOD_STATUS],
    ['telefon qidir', Intent.MARKET_ORDER],
    ['posilka yubor', Intent.SEND_PARCEL],
    ['posilkam qayerda', Intent.PARCEL_STATUS],
    ['xarajatlarim', Intent.FINANCE_REPORT],
    ['reklama beraman', Intent.FIND_CREATOR],
    ['takliflarim', Intent.COLLAB_OFFERS],
    ['buyurtmalarim', Intent.MY_ORDERS],
    ['balansim qancha', Intent.BALANCE],
    ["to'lovlar tarixi", Intent.HISTORY],
    ['nima qila olasan', Intent.HELP],
  ];

  for (const [text, expected] of ROUTES) {
    it(`"${text}" -> ${expected}`, () => {
      expect(parseMessage(text).intent).toBe(expected);
    });
  }
});

/**
 * "Mashina" so'zi IKKI ma'noda ishlatiladi.
 *
 * Chaqiriladigan transport va SOTIB OLINADIGAN tovar. Shuning
 * uchun u manzil yoki harakat bilan birga kelgandagina taksi
 * hisoblanadi.
 */
describe("zaif transport so'zi", () => {
  it('manzil bilan birga — taksi', () => {
    expect(parseMessage('ishga mashina yubor').intent).toBe(Intent.BOOK_TAXI);
    expect(parseMessage('uyga mashina chaqir').intent).toBe(Intent.BOOK_TAXI);
  });

  it('manzilsiz — taksi EMAS', () => {
    expect(parseMessage('mashina sotib ol').intent).not.toBe(Intent.BOOK_TAXI);
    expect(parseMessage('arzon mashina qidir').intent).not.toBe(Intent.BOOK_TAXI);
  });
});
