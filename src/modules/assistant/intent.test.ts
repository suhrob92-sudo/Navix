import { describe, expect, it } from 'vitest';

import {
  Intent,
  extractAmount,
  extractFoodQuery,
  extractOrdinal,
  extractPhone,
  extractQuantity,
  normalize,
  parseMessage,
} from '@/modules/assistant/intent';

describe('normalize', () => {
  it('apostrofning barcha turlarini olib tashlaydi', () => {
    // Foydalanuvchi turli klaviaturada turlicha yozadi.
    expect(normalize("to'la")).toBe('tola');
    expect(normalize('toʻla')).toBe('tola');
    expect(normalize('toʼla')).toBe('tola');
    expect(normalize('to`la')).toBe('tola');
    expect(normalize('tola')).toBe('tola');
  });

  it("ortiqcha probellarni yig'ishtiradi", () => {
    expect(normalize("  KOMMUNAL    TO'LA  ")).toBe('kommunal tola');
  });
});

describe('extractAmount', () => {
  it('oddiy raqamni topadi', () => {
    expect(extractAmount('50000 tola')).toBe(50_000);
  });

  it('probel bilan yozilgan raqamni topadi', () => {
    expect(extractAmount('50 000 som tola')).toBe(50_000);
  });

  it('"ming" ko\'paytiruvchisini hisobga oladi', () => {
    expect(extractAmount('50 ming')).toBe(50_000);
    expect(extractAmount('50ming')).toBe(50_000);
    expect(extractAmount('20 mingga tola')).toBe(20_000);
  });

  it('million va mln ni tushunadi', () => {
    expect(extractAmount('2 million')).toBe(2_000_000);
    expect(extractAmount('3 mln')).toBe(3_000_000);
  });

  it('"yarim million" iborasini tushunadi', () => {
    expect(extractAmount('yarim million tola')).toBe(500_000);
  });

  it("so'z bilan yozilgan sonni tushunadi", () => {
    expect(extractAmount('ellik ming')).toBe(50_000);
    expect(extractAmount('besh ming som')).toBe(5_000);
  });

  it("summa yo'q bo'lsa null qaytaradi", () => {
    expect(extractAmount('kommunal tola')).toBeNull();
    expect(extractAmount('')).toBeNull();
  });
});

describe('extractPhone', () => {
  it("xalqaro ko'rinishni tushunadi", () => {
    expect(extractPhone('+998901234567 ga yubor')).toBe('+998901234567');
    expect(extractPhone('998901234567')).toBe('+998901234567');
  });

  it('milliy raqamni tushunadi', () => {
    expect(extractPhone('901234567 ga 20000 yubor')).toBe('+998901234567');
  });

  it('probel bilan yozilgan raqamni tushunadi', () => {
    expect(extractPhone('90 123 45 67 raqamiga yubor')).toBe('+998901234567');
  });

  it("raqam yo'q bo'lsa null", () => {
    expect(extractPhone('balansim qancha')).toBeNull();
  });

  /**
   * Eng xavfli chalkashlik: kommunal hisob raqami ham uzun son.
   * U telefon deb o'qilsa, pul begonaga ketardi.
   */
  it('10 xonali kommunal hisobni telefon deb olmaydi', () => {
    expect(extractPhone('1234567890 raqamiga gaz tola')).toBeNull();
  });

  it('12 xonali elektr hisobini telefon deb olmaydi', () => {
    expect(extractPhone('123456789012 elektr')).toBeNull();
  });
});

describe('parseMessage — niyat', () => {
  it.each([
    ['balansim qancha', Intent.BALANCE],
    ['hisobimda qancha pul bor', Intent.BALANCE],
    ["hisobni to'ldir", Intent.TOPUP],
    ['hamyonni toldir 50 ming', Intent.TOPUP],
    ['Boburga 20000 yubor', Intent.TRANSFER],
    ['901234567 ga pul otkaz', Intent.TRANSFER],
    ["kommunal to'la", Intent.PAY_SERVICE],
    ['gazga 50 ming tola', Intent.PAY_SERVICE],
    ['tolovlar tarixi', Intent.HISTORY],
    ['yordam', Intent.HELP],
    ['nima qila olasan', Intent.HELP],
    ['salom qalaysan', Intent.UNKNOWN],
  ])('"%s" → %s', (text, expected) => {
    expect(parseMessage(text).intent).toBe(expected);
  });

  /**
   * "hisobni to'ldir" ichida ham "tol" bor. Agar tartib noto'g'ri
   * bo'lsa, u xizmat to'lovi deb tushunilardi.
   */
  it("hisobni to'ldirish xizmat to'lovi bilan chalkashmaydi", () => {
    expect(parseMessage("hisobni to'ldir").intent).toBe(Intent.TOPUP);
    expect(parseMessage('kommunal tola').intent).toBe(Intent.PAY_SERVICE);
  });
});

describe('parseMessage — provayder va toifa', () => {
  it.each([
    ['gazga tola', 'hududgaz'],
    ['hududgaz tola', 'hududgaz'],
    ['suv puli tola', 'suvoqova'],
    ['svetga tola', 'hududiy-elektr'],
    ['beeline ga 10 ming sol', 'beeline'],
    ['ucell hisobini toldir', 'ucell'],
    ['uzonline tola', 'uzonline'],
  ])('"%s" → %s', (text, code) => {
    expect(parseMessage(text).providerCode).toBe(code);
  });

  it('aniq provayder aytilmasa toifani topadi', () => {
    expect(parseMessage('kommunal tola').category).toBe('UTILITY');
    expect(parseMessage('internetga tola').category).toBe('INTERNET');
    expect(parseMessage('telefonga 10 ming sol').category).toBe('MOBILE');
  });
});

describe('parseMessage — birga ishlashi', () => {
  it("o'tkazma: raqam va summa ajratiladi", () => {
    const result = parseMessage('901234567 ga 50 ming yubor');

    expect(result.intent).toBe(Intent.TRANSFER);
    expect(result.phone).toBe('+998901234567');
    expect(result.amountSom).toBe(50_000);
  });

  /**
   * Telefon raqami summa deb o'qilib qolmasligi kerak — bu eng
   * jiddiy xato bo'lardi: "901234567 ga 50000 yubor" degan buyruqda
   * 901 234 567 so'm o'tkazilishi mumkin edi.
   */
  it('telefon raqamini summa deb olmaydi', () => {
    const result = parseMessage('901234567 ga yubor');

    expect(result.phone).toBe('+998901234567');
    expect(result.amountSom).toBeNull();
  });

  it('kommunal: hisob raqami va summa ajratiladi', () => {
    const result = parseMessage('gazga 1234567890 hisobiga 45 ming tola');

    expect(result.intent).toBe(Intent.PAY_SERVICE);
    expect(result.providerCode).toBe('hududgaz');
    expect(result.accountNumber).toBe('1234567890');
    expect(result.amountSom).toBe(45_000);
  });

  it("hisob raqami summa deb o'qilmaydi", () => {
    const result = parseMessage('gazga 1234567890 hisobiga tola');

    expect(result.accountNumber).toBe('1234567890');
    expect(result.amountSom).toBeNull();
  });

  it("bo'sh matn xatolik bermaydi", () => {
    const result = parseMessage('');

    expect(result.intent).toBe(Intent.UNKNOWN);
    expect(result.amountSom).toBeNull();
    expect(result.phone).toBeNull();
  });
});

describe('extractFoodQuery', () => {
  it("buyruq so'zlarini olib tashlaydi", () => {
    // Faqat taom nomi qolishi kerak — qolgani menyuda yo'q.
    expect(extractFoodQuery('menga 2 ta lagmon buyur')).toBe('lagmon');
    expect(extractFoodQuery('bir porsiya osh buyurtma qil')).toBe('osh');
  });

  it("sinonimni bazadagi so'zga almashtiradi", () => {
    expect(extractFoodQuery('pizza istayman')).toBe('pitsa');
    expect(extractFoodQuery('sushi buyur')).toBe('rol');
    expect(extractFoodQuery('qahva ichgim keldi')).toContain('kofe');
  });

  it("bir xil so'zni ikki marta qaytarmaydi", () => {
    // "pizza" sinonim orqali "pitsa" ga aylanadi va takrorlanadi.
    expect(extractFoodQuery('pizza pitsa')).toBe('pitsa');
  });

  it("taom aytilmagan bo'lsa null qaytaradi", () => {
    expect(extractFoodQuery('och qoldim')).toBeNull();
    expect(extractFoodQuery('ovqat buyur')).toBeNull();
  });

  it("raqamlarni qidiruvga qo'shmaydi", () => {
    expect(extractFoodQuery('3 ta burger')).toBe('burger');
  });
});

describe('extractQuantity', () => {
  it.each([
    ['2 ta lagmon', 2],
    ['3 dona somsa', 3],
    ['1 porsiya osh', 1],
    ['10ta burger', 10],
  ])('"%s" → %s', (text, expected) => {
    expect(extractQuantity(text)).toBe(expected);
  });

  it("son aytilmagan bo'lsa null qaytaradi", () => {
    expect(extractQuantity('lagmon buyur')).toBeNull();
  });

  /**
   * "50 ming to'la" — bu summa, dona emas. "ta" qo'shimchasi
   * bo'lmagani uchun e'tiborga olinmaydi.
   */
  it("summani dona deb o'qimaydi", () => {
    expect(extractQuantity('50 ming tola')).toBeNull();
  });
});

describe('extractOrdinal', () => {
  it("ro'yxatdan tanlovni tushunadi", () => {
    expect(extractOrdinal("1. Lag'mon — Milliy Taomlar · 42 000 so'm")).toBe(1);
    expect(extractOrdinal('2) Burger')).toBe(2);
    expect(extractOrdinal('3')).toBe(3);
    expect(extractOrdinal('  2  ')).toBe(2);
  });

  /**
   * Eng muhim tekshiruv: "2 ta osh" — bu tanlov emas, SONI.
   * Aralashtirilsa foydalanuvchi butunlay boshqa taom oladi.
   */
  it('sonni tanlov deb olmaydi', () => {
    expect(extractOrdinal('2 ta osh')).toBeNull();
    expect(extractOrdinal('50 ming toldir')).toBeNull();
  });
});

describe('parseMessage — ovqat', () => {
  it.each([
    ['ovqat buyur', Intent.FOOD_ORDER],
    ['och qoldim', Intent.FOOD_ORDER],
    ['lagmon buyur', Intent.FOOD_ORDER],
    ['2 ta burger', Intent.FOOD_ORDER],
    ['pitsa istayman', Intent.FOOD_ORDER],
    ['buyurtmam qayerda', Intent.FOOD_STATUS],
    ['ovqatim qachon keladi', Intent.FOOD_STATUS],
  ])('"%s" → %s', (text, expected) => {
    expect(parseMessage(text).intent).toBe(expected);
  });

  /**
   * "buyurtmam qayerda" gapida "buyurtma" so'zi bor. Tartib
   * noto'g'ri bo'lsa, yordamchi yangi buyurtma bera boshlardi.
   */
  it('holat savolini yangi buyurtma deb tushunmaydi', () => {
    expect(parseMessage('buyurtmam qayerda').intent).toBe(Intent.FOOD_STATUS);
    expect(parseMessage('buyurtma ber').intent).toBe(Intent.FOOD_ORDER);
  });

  /**
   * "osh" juda qisqa so'z. Agar boshidan solishtirilsa,
   * "hisobni OSHir" ham ovqat bo'lib qolardi.
   */
  it("qisqa taom nomi boshqa so'z ichida topilmaydi", () => {
    expect(parseMessage('osh buyur').intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('limitni oshir').intent).not.toBe(Intent.FOOD_ORDER);
  });

  /**
   * "ovqat yetkazib yubor" — "yubor" so'zi bor, lekin bu pul
   * o'tkazma emas. "ovqatga to'la" ham kommunal to'lov emas.
   */
  it('ovqat pul buyruqlari bilan chalkashmaydi', () => {
    expect(parseMessage('ovqat yetkazib yubor').intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('ovqatga tola').intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('901234567 ga 50 ming yubor').intent).toBe(Intent.TRANSFER);
    expect(parseMessage('kommunal tola').intent).toBe(Intent.PAY_SERVICE);
  });

  it('soni va taom nomi birga ajratiladi', () => {
    const result = parseMessage("2 ta lag'mon buyur");

    expect(result.intent).toBe(Intent.FOOD_ORDER);
    expect(result.quantity).toBe(2);
    expect(result.foodQuery).toBe('lagmon');
    // Eng muhimi: 2 — bu dona, summa emas.
    expect(result.amountSom).toBeNull();
  });

  it('narx chegarasini tushunadi', () => {
    const result = parseMessage('50 minggacha shirinlik buyur');

    expect(result.intent).toBe(Intent.FOOD_ORDER);
    expect(result.amountSom).toBe(50_000);
    expect(result.foodQuery).toBe('shirinlik');
  });

  it("ro'yxatdan tanlash matnini tushunadi", () => {
    const result = parseMessage("1. Lag'mon — Milliy Taomlar · 42 000 so'm");

    expect(result.ordinal).toBe(1);
  });

  it("ovqat bo'lmagan buyruqda menyu qidirilmaydi", () => {
    expect(parseMessage('gazga 50 ming tola').foodQuery).toBeNull();
    expect(parseMessage('balansim qancha').foodQuery).toBeNull();
  });
});

describe('parseMessage — marketplace', () => {
  it.each([
    ['telefon qidir', Intent.MARKET_ORDER],
    ['noutbuk kerak', Intent.MARKET_ORDER],
    ['kitob sotib ol', Intent.MARKET_ORDER],
    ['mahsulot qidiraman', Intent.MARKET_ORDER],
    ['katalogni och', Intent.MARKET_ORDER],
  ])('"%s" → %s', (text, expected) => {
    expect(parseMessage(text).intent).toBe(expected);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * "buyur" so'zi ikkala modulda ham ishlatiladi. Ajratish ANIQ NOM
   * orqali bo'ladi: "lag'mon" — ovqat, "telefon" — mahsulot.
   */
  it('bir xil buyruqni nomga qarab ajratadi', () => {
    expect(parseMessage("lag'mon buyur").intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('telefon buyur').intent).toBe(Intent.MARKET_ORDER);
  });

  it('nom aytilmasa umumiy buyruqqa qaraydi', () => {
    expect(parseMessage('ovqat buyur').intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('mahsulot sotib ol').intent).toBe(Intent.MARKET_ORDER);
  });

  /**
   * "telefonga to'la" — bu mobil aloqa to'lovi, mahsulot emas.
   * Aniq so'z solishtiruvi ("telefon" ≠ "telefonga") shuni saqlaydi.
   */
  it("mobil to'lov mahsulot bilan chalkashmaydi", () => {
    expect(parseMessage("telefonga to'la").intent).toBe(Intent.PAY_SERVICE);
    expect(parseMessage('telefonga 10 ming sol').category).toBe('MOBILE');
  });

  it('marketplace buyruqlarida ham qidiruv matni ajratiladi', () => {
    const result = parseMessage('menga 2 ta futbolka sotib ol');

    expect(result.intent).toBe(Intent.MARKET_ORDER);
    expect(result.quantity).toBe(2);
    expect(result.foodQuery).toBe('futbolka');
    expect(result.amountSom).toBeNull();
  });

  it('narx chegarasini tushunadi', () => {
    const result = parseMessage('500 minggacha krossovka qidir');

    expect(result.intent).toBe(Intent.MARKET_ORDER);
    expect(result.amountSom).toBe(500_000);
    expect(result.foodQuery).toBe('krossovka');
  });

  it("ro'yxatdan tanlash matnini tushunadi", () => {
    const result = parseMessage("2. Redmi Note 14 6/128GB — Texnomart · 2 690 000 so'm");

    expect(result.ordinal).toBe(2);
  });

  /**
   * Ro'yxatda yo'q nom: "zaryadlagich" PRODUCT_WORDS da bor, lekin
   * "quvvat banki" yo'q. Bunday holatda niyat FOOD_ORDER bo'lib qoladi
   * va katalogni `assistant.service.ts` hal qiladi.
   */
  it("noma'lum nomda buyruq so'ziga qaraydi", () => {
    const result = parseMessage('quvvat banki buyur');

    expect(result.intent).toBe(Intent.FOOD_ORDER);
    expect(result.foodQuery).toContain('quvvat');
  });

  it('pul buyruqlari buzilmadi', () => {
    expect(parseMessage('balansim qancha').intent).toBe(Intent.BALANCE);
    expect(parseMessage('kommunal tola').intent).toBe(Intent.PAY_SERVICE);
    expect(parseMessage('901234567 ga 50 ming yubor').intent).toBe(Intent.TRANSFER);
    expect(parseMessage("hisobni to'ldir").intent).toBe(Intent.TOPUP);
  });
});

/**
 * TAKSI buyruqlari.
 *
 * ── Nima uchun bu sinovlar ko'p ───────────────────────────────────────
 * Taksi tanish IKKI belgidan yig'iladi: vosita nomi yoki
 * "manzil + harakat". Bunday qoida kuchli, lekin u begona gaplarni
 * ham tortib olishi mumkin — masalan "uyga ovqat buyur".
 *
 * Shuning uchun har bir sinovda IKKI tomon tekshiriladi: kerakli
 * gap tushunilsinmi va KERAKSIZ gap tortib olinmasinmi.
 */
describe('taksi buyruqlari', () => {
  it('vosita nomi aytilganda taniydi', () => {
    for (const text of ['uyga taksi', 'taksi chaqir', 'menga taxi kerak', 'Navix, uyga taxi']) {
      expect(parseMessage(text).intent, text).toBe(Intent.BOOK_TAXI);
    }
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Bu gaplarda "taksi" so'zi UMUMAN yo'q. Tayyor iboralar ro'yxatiga
   * tayansak, ular tushunilmasdi — holbuki odam eng ko'p aynan
   * shunday gapiradi.
   */
  it("'taksi' so'zisiz ham taniydi", () => {
    for (const text of [
      'uyga qaytmoqchiman',
      'uyga ketmoqchiman',
      'meni uyimga olib bor',
      'ishga boraman',
      'uyga olib ket',
    ]) {
      expect(parseMessage(text).intent, text).toBe(Intent.BOOK_TAXI);
    }
  });

  /**
   * So'z tartibi va oradagi ortiqcha so'zlar ahamiyatsiz.
   *
   * "Uyga eng arzon taksi" tayyor iboralar ro'yxatida bo'lmasdi.
   */
  it("so'z tartibi va ortiqcha so'zlarga bog'liq emas", () => {
    for (const text of ['uyga eng arzon taksi', 'taksi chaqir uyga', 'tezroq uyga ketmoqchiman']) {
      expect(parseMessage(text).intent, text).toBe(Intent.BOOK_TAXI);
    }
  });

  it('manzil turini ajratadi', () => {
    expect(parseMessage('uyga taksi').taxiDestination).toBe('HOME');
    expect(parseMessage('uyimga olib bor').taxiDestination).toBe('HOME');
    expect(parseMessage('ishga taksi').taxiDestination).toBe('WORK');
    expect(parseMessage('ishxonaga olib bor').taxiDestination).toBe('WORK');
  });

  it("manzil aytilmasa null qaytaradi — yordamchi so'raydi", () => {
    expect(parseMessage('taksi chaqir').taxiDestination).toBeNull();
  });

  /**
   * ── Begona buyruqlarni TORTIB OLMASLIK ──────────────────────────────
   * Bu sinovlar bo'lmasa, taksi qoidasi ovqat va Marketplace
   * buyruqlarini o'g'irlab ketardi va foydalanuvchi "taksi
   * chaqiraymi?" degan javobni olardi.
   */
  it("ovqat buyrug'ini tortib olmaydi", () => {
    expect(parseMessage('uyga ovqat buyur').intent).not.toBe(Intent.BOOK_TAXI);
    expect(parseMessage('uyga lagmon yetkazib ber').intent).not.toBe(Intent.BOOK_TAXI);
  });

  it("Marketplace buyrug'ini tortib olmaydi", () => {
    expect(parseMessage('mashina uchun gilam sotib ol').intent).not.toBe(Intent.BOOK_TAXI);
  });

  it("kuryer buyrug'ini tortib olmaydi", () => {
    expect(parseMessage('uyga kuryer chaqir').intent).not.toBe(Intent.BOOK_TAXI);
  });

  it('pul buyruqlarini tortib olmaydi', () => {
    expect(parseMessage('balansim qancha').intent).toBe(Intent.BALANCE);
    expect(parseMessage('901234567 ga 50 ming yubor').intent).not.toBe(Intent.BOOK_TAXI);
  });

  it("'buyurtmam qayerda' savolini tortib olmaydi", () => {
    expect(parseMessage('buyurtmam qayerda').intent).toBe(Intent.FOOD_STATUS);
  });

  /**
   * Taksi endi ISHLAYDI, ya'ni "tez orada" javobi berilmasligi kerak.
   *
   * 54-bosqichda modul LIVE bo'lgach, "taksi chaqir" iborasi
   * `COMING_SOON` ro'yxatidan chiqib ketdi va bir muddat hech qanday
   * niyatga tushmay qoldi. Bu sinov o'sha bo'shliq qaytmasligini
   * qo'riqlaydi.
   */
  it("'tez orada' javobini bermaydi — taksi allaqachon ishlaydi", () => {
    expect(parseMessage('taksi chaqir').intent).not.toBe(Intent.COMING_SOON);
    expect(parseMessage('uyga taksi').intent).not.toBe(Intent.COMING_SOON);
  });
});

/**
 * SMART taksi buyruqlari — "eng arzon", "eng tez", tarif nomi.
 *
 * ── Nima uchun maqsad va NOM alohida ──────────────────────────────────
 * "Eng arzon" bugun Ekonomni, ertaga boshqa tarifni anglatishi
 * mumkin. Shuning uchun matndan MAQSAD ajratiladi, tarif esa
 * narxlar bo'yicha keyin tanlanadi.
 */
describe('smart taksi buyruqlari', () => {
  it("'eng arzon' maqsadini ajratadi", () => {
    for (const text of ['uyga eng arzon taksi', 'uyga arzonroq taksi', 'arzon taksi uyga']) {
      expect(parseMessage(text).taxiPreference, text).toBe('CHEAPEST');
    }
  });

  it("'eng tez' maqsadini ajratadi", () => {
    for (const text of ['uyga eng tez taksi', 'uyga tezroq taksi', 'tezda uyga taksi']) {
      expect(parseMessage(text).taxiPreference, text).toBe('FASTEST');
    }
  });

  it('tarif nomini ajratadi', () => {
    expect(parseMessage('uyga komfort chaqir').taxiTariff).toBe('COMFORT');
    expect(parseMessage('uyga ekonom taksi').taxiTariff).toBe('ECONOM');
  });

  /**
   * BUSINESS tarifi hozircha YO'Q, lekin u TANILADI.
   *
   * Tanimasak, "biznes chaqir" degan odam jimgina Ekonom olardi va
   * buni safar tugagach bilib qolardi. Tanisak — rost javob beramiz.
   */
  it("mavjud bo'lmagan Biznes tarifini ham taniydi", () => {
    expect(parseMessage('uyga biznes chaqir').taxiTariff).toBe('BUSINESS');
  });

  it('maqsad va nom birga aytilsa ikkalasi ham ajratiladi', () => {
    const parsed = parseMessage('uyga eng arzon komfort');

    expect(parsed.taxiPreference).toBe('CHEAPEST');
    expect(parsed.taxiTariff).toBe('COMFORT');
  });

  it('manzil ham birga ajratiladi', () => {
    const parsed = parseMessage('ishga eng tez taksi');

    expect(parsed.intent).toBe(Intent.BOOK_TAXI);
    expect(parsed.taxiDestination).toBe('WORK');
    expect(parsed.taxiPreference).toBe('FASTEST');
  });

  /**
   * ── BOSHQA buyruqlarga ta'sir qilmasligi ────────────────────────────
   * "Arzon telefon qidir" — bu Marketplace qidiruvi. Agar taksi
   * maydonlari har buyruqda ajratilsa, bu gapdagi "arzon" taksi
   * tarifi deb o'qilardi.
   */
  it("boshqa buyruqlarda taksi maydonlari bo'sh qoladi", () => {
    const market = parseMessage('arzon telefon qidir');

    expect(market.intent).not.toBe(Intent.BOOK_TAXI);
    expect(market.taxiPreference).toBeNull();
    expect(market.taxiTariff).toBeNull();
  });

  it("oddiy taksi buyrug'ida maqsad null qoladi", () => {
    expect(parseMessage('uyga taksi').taxiPreference).toBeNull();
    expect(parseMessage('uyga taksi').taxiTariff).toBeNull();
  });
});

describe('moliyaviy hisobot buyruqlari', () => {
  it('xarajat haqidagi savollarni tanadi', () => {
    const commands = [
      'shu oyda qancha sarfladim',
      'qancha sarfladim',
      'xarajatlarim',
      'moliyaviy hisobot',
      'oylik hisobot',
      'hisobotim',
      'eng kop nimaga ketdi',
      'pulim qayerga ketdi',
      'moliya markazini och',
    ];

    for (const command of commands) {
      expect(parseMessage(command).intent, command).toBe(Intent.FINANCE_REPORT);
    }
  });

  it("o'tgan oy so'ralganini ajratadi", () => {
    expect(parseMessage("o'tgan oyda qancha sarfladim").financeMonth).toBe('PREVIOUS');
    expect(parseMessage('avvalgi oyda qancha sarfladim').financeMonth).toBe('PREVIOUS');
    expect(parseMessage('oldingi oy xarajatlarim').financeMonth).toBe('PREVIOUS');
  });

  it('oy aytilmasa joriy oy tushuniladi', () => {
    expect(parseMessage('qancha sarfladim').financeMonth).toBe('CURRENT');
    expect(parseMessage('shu oyda qancha sarfladim').financeMonth).toBe('CURRENT');
  });

  /**
   * ── "O'tgan oy bilan SOLISHTIR" ─────────────────────────────────────
   * Gapda "o'tgan oy" bor, lekin odam JORIY oyni so'rayapti — o'tgan
   * oy faqat o'lchov nuqtasi. Agar bu sezilmasa, javob o'tgan oy
   * hisoboti bo'lardi va so'ralgan solishtirish umuman aytilmasdi.
   */
  it("solishtirish so'ralganda joriy oy qaytadi", () => {
    const parsed = parseMessage("o'tgan oy bilan solishtir");

    expect(parsed.intent).toBe(Intent.FINANCE_REPORT);
    expect(parsed.financeMonth).toBe('CURRENT');
  });

  /**
   * ── MAVJUD buyruqlar buzilmasligi ───────────────────────────────────
   * `FINANCE_REPORT` iboralar ro'yxatining eng boshida turadi, ya'ni
   * u boshqa hamma narsadan oldin tekshiriladi. Shuning uchun uning
   * qo'shni buyruqlarni "o'g'irlab" ketmasligi shu yerda qulflanadi.
   */
  it('balans, tarix va boshqa buyruqlarga tegmaydi', () => {
    expect(parseMessage('balansim qancha').intent).toBe(Intent.BALANCE);
    expect(parseMessage('qancha pulim bor').intent).toBe(Intent.BALANCE);
    expect(parseMessage("to'lovlar tarixi").intent).toBe(Intent.HISTORY);
    expect(parseMessage("gazga 50 ming to'la").intent).toBe(Intent.PAY_SERVICE);
    expect(parseMessage("hisobni to'ldir").intent).toBe(Intent.TOPUP);
    expect(parseMessage('uyga taksi').intent).toBe(Intent.BOOK_TAXI);
    /* "Narxlarni solishtir" — bu xarid, moliyaviy hisobot emas. */
    expect(parseMessage('narxlarni solishtir').intent).not.toBe(Intent.FINANCE_REPORT);
  });
});

describe('posilka buyruqlari', () => {
  /**
   * ── ENG MUHIM TEKSHIRUV: PUL o'tkazmasiga tushib ketmaslik ──────────
   * "Posilka yubor" gapidagi "yubor" so'zi `TRANSFER` ro'yxatida
   * turadi. Tuzatilmaguncha yordamchi "Kimga yuboramiz? Telefon
   * raqamini yozing" deb PUL O'TKAZISH oqimini boshlardi.
   *
   * Odam posilka haqida gapirib turib, o'zi bilmagan holda pul
   * yuborish yo'liga tushib qolardi.
   */
  it("jo'natish buyrug'i PUL o'tkazmasi deb tushunilmaydi", () => {
    for (const command of ['posilka yubor', "posilka jo'nat", 'posilka yubormoqchiman', "yuk jo'nat"]) {
      const parsed = parseMessage(command);

      expect(parsed.intent, command).toBe(Intent.SEND_PARCEL);
      expect(parsed.intent, command).not.toBe(Intent.TRANSFER);
    }
  });

  it('holat savolini taniydi', () => {
    for (const command of [
      'posilkam qayerda',
      'posilkam qani',
      "jo'natmam qayerda",
      'posilkalarim',
      'posilka qachon keladi',
    ]) {
      expect(parseMessage(command).intent, command).toBe(Intent.PARCEL_STATUS);
    }
  });

  /**
   * "Posilka qachon keladi" gapida `FOOD_STATUS` ning "qachon
   * keladi" iborasi ham bor — u ovqat buyurtmasi holatini ochardi.
   */
  it('holat savoli OVQAT holati deb tushunilmaydi', () => {
    expect(parseMessage('posilka qachon keladi').intent).not.toBe(Intent.FOOD_STATUS);
  });

  /**
   * Holat ro'yxati jo'natishdan OLDIN turadi: "posilkam qayerda"
   * gapida ham "posilka" so'zi bor va aks holda holat so'ragan
   * odamga yangi jo'natma formasi ochilardi.
   */
  it("holat savoli yangi jo'natma deb tushunilmaydi", () => {
    expect(parseMessage('posilkam qayerda').intent).not.toBe(Intent.SEND_PARCEL);
  });

  it('MAVJUD buyruqlarga tegmaydi', () => {
    /* Oddiy pul o'tkazmasi o'z joyida qolishi SHART. */
    expect(parseMessage('901234567 ga 50 ming yubor').intent).toBe(Intent.TRANSFER);
    expect(parseMessage("50 ming jo'nat").intent).toBe(Intent.TRANSFER);
    expect(parseMessage('buyurtmam qayerda').intent).toBe(Intent.FOOD_STATUS);
    expect(parseMessage('ovqat buyur').intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('uyga taksi').intent).toBe(Intent.BOOK_TAXI);
  });
});

describe('hamkorlik buyruqlari', () => {
  it('ijodkor qidirishni taniydi', () => {
    for (const command of ['hamkorlik', 'ijodkor top', 'bloger qidir', 'reklama beraman']) {
      expect(parseMessage(command).intent, command).toBe(Intent.FIND_CREATOR);
    }
  });

  it('kelgan takliflarni taniydi', () => {
    for (const command of ['takliflarim', 'hamkorlik takliflari', 'taklif keldimi']) {
      expect(parseMessage(command).intent, command).toBe(Intent.COLLAB_OFFERS);
    }
  });

  /**
   * "Hamkorlik takliflarim" gapida ikkala ro'yxatning so'zi ham bor.
   * Odam esa qidiruvni emas, O'Z QUTISINI so'rayapti.
   */
  it('taklif qutisi qidiruv deb tushunilmaydi', () => {
    expect(parseMessage('hamkorlik takliflari').intent).not.toBe(Intent.FIND_CREATOR);
  });

  it('MAVJUD buyruqlarga tegmaydi', () => {
    expect(parseMessage('901234567 ga 50 ming yubor').intent).toBe(Intent.TRANSFER);
    expect(parseMessage('posilka yubor').intent).toBe(Intent.SEND_PARCEL);
    expect(parseMessage('ovqat buyur').intent).toBe(Intent.FOOD_ORDER);
  });
});
