import { describe, expect, it } from 'vitest';

import { Intent, extractAmount, extractPhone, normalize, parseMessage } from '@/modules/assistant/intent';

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
