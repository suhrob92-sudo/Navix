/**
 * Provayder hisob raqami naqshini (regex) XAVFSIZLIK jihatidan tekshirish.
 *
 * ── Nima uchun bu fayl umuman kerak ───────────────────────────────────
 * Admin panelda provayder qo'shganda naqsh QO'LDA kiritiladi va bazaga
 * matn sifatida tushadi. Keyin har bir to'lovda server uni
 * `new RegExp(naqsh).test(hisobRaqami)` ko'rinishida ishlatadi.
 *
 * Ya'ni admin yozgan satr — SERVERDA BAJARILADIGAN KOD. Bu ikkita
 * jiddiy xavf tug'diradi:
 *
 *  1. ReDoS (Regular expression Denial of Service).
 *     `^(\d+)+$` kabi naqsh 30 ta raqamdan iborat noto'g'ri satrda
 *     milliardlab qadam bajaradi va Node.js jarayoni MUZLAB QOLADI.
 *     Bitta so'rov butun serverni to'xtatadi — chunki Node bir oqimli.
 *
 *  2. Juda keng naqsh. `\d+` (langarsiz) "abc123xyz" ni ham qabul
 *     qiladi, chunki `test()` satr ICHIDAN qidiradi. Natijada pul
 *     mavjud bo'lmagan hisobga ketadi.
 *
 * ── Yechim: ruxsat etilgan sintaksis ro'yxati (whitelist) ─────────────
 * "Xavflisini taqiqlash" ishonchsiz — hamma xavfli ko'rinishni oldindan
 * bilib bo'lmaydi. Shuning uchun teskarisini qilamiz: FAQAT sanab
 * o'tilgan belgilarga ruxsat beramiz, qolgani rad etiladi.
 *
 * Eng muhim qoida — GURUH (`(` va `)`) UMUMAN TAQIQLANGAN. Halokatli
 * qaytish (catastrophic backtracking) uchun ichida takrorlagichi bor
 * guruh kerak. Guruh bo'lmasa, bunday naqshni yozib bo'lmaydi.
 *
 * Hisob raqamlari oddiy: "10 ta raqam", "9 ta raqam", "harf-raqam".
 * Bularning barchasi guruhsiz yoziladi, ya'ni hech narsa yo'qotilmaydi.
 */

/** Bazadagi ustun uzunligi (`VarChar(200)`) bilan bir xil. */
export const MAX_ACCOUNT_REGEX_LENGTH = 200;

/**
 * Takrorlagichdagi eng katta son: `\d{1,60}`.
 * Hisob raqami maydonining o'zi ham 60 belgidan oshmaydi.
 */
const MAX_QUANTIFIER = 60;

/** Naqshda ruxsat etilgan qochirilgan (escaped) belgilar. */
const ALLOWED_ESCAPES = new Set(['d', 'w']);

/** Oddiy belgi sifatida ruxsat etilganlar. */
const LITERAL_PATTERN = /^[A-Za-z0-9-]$/;

/** Belgilar to'plami ichida ruxsat etilganlar: `[A-Z0-9-]`. */
const CHARACTER_CLASS_PATTERN = /^[A-Za-z0-9-]+$/;

/**
 * `{3}`, `{1,10}` yoki `{1,}` ko'rinishidagi takrorlagich.
 * Uchinchi guruh bo'sh bo'lsa — yuqori chegara qo'yilmagan.
 */
const QUANTIFIER_PATTERN = /^\{(\d{1,3})(,)?(\d{1,3})?\}$/;

/**
 * Naqshni tekshiradi va topilgan muammolarni o'zbekcha qaytaradi.
 * Ro'yxat bo'sh bo'lsa — naqsh xavfsiz.
 *
 * Xatolik qaytaradi, `throw` qilmaydi: admin formasida bir vaqtda
 * bir nechta muammoni ko'rsatish kerak.
 */
export function validateAccountRegex(source: string): string[] {
  const errors: string[] = [];

  if (source.length === 0) {
    return ['Naqsh kiritilmagan'];
  }

  if (source.length > MAX_ACCOUNT_REGEX_LENGTH) {
    return [`Naqsh ${MAX_ACCOUNT_REGEX_LENGTH} belgidan uzun bo'lmasligi kerak`];
  }

  // 1. Langar (anchor) — naqsh butun satrga tegishli bo'lishi shart.
  if (!source.startsWith('^') || !source.endsWith('$')) {
    errors.push("Naqsh '^' bilan boshlanib '$' bilan tugashi shart. Namuna: ^\\d{10}$");

    // Langar bo'lmasa qolgan tekshiruv chalkash bo'ladi — shu yerda to'xtaymiz.
    return errors;
  }

  // 2. Guruhlar — halokatli qaytishning yagona yo'li.
  //
  // Bu yerda ham to'xtaymiz: guruhli naqshda quyidagi tekshiruv yana
  // 3-4 ta xabar qo'shadi ("'(' ishlatilmaydi", "')' ishlatilmaydi"...).
  // Admin uchun bitta aniq sabab foydaliroq.
  if (source.includes('(') || source.includes(')')) {
    errors.push("Qavs '(' va ')' ishlatilmaydi — ular serverni muzlatib qo'yishi mumkin");

    return errors;
  }

  // 3. Ruxsat etilgan sintaksis.
  errors.push(...scanBody(source.slice(1, -1)));

  // 4. Naqsh haqiqatan ham kompilyatsiya bo'ladimi.
  //    Yuqoridagi tekshiruvlardan o'tgan, lekin baribir noto'g'ri
  //    yozilgan bo'lishi mumkin (masalan `\d{5,2}`).
  try {
    new RegExp(source);
  } catch {
    errors.push("Naqsh noto'g'ri yozilgan");
  }

  // Bir xil xatolik ikki marta chiqmasin.
  return [...new Set(errors)];
}

/**
 * Naqsh tanasini belgima-belgi o'qiydi.
 *
 * `hasAtom` — oxirgi o'qilgan narsa takrorlash mumkin bo'lgan bo'lakmi.
 * Takrorlagich (`+`, `{3}`) faqat shundan keyin kelishi mumkin:
 * `^+$` yoki `^{3}$` ma'nosiz.
 */
function scanBody(body: string): string[] {
  const errors: string[] = [];
  let index = 0;
  let hasAtom = false;

  while (index < body.length) {
    const char = body[index];

    // Qochirilgan belgi: \d, \w
    if (char === '\\') {
      const next = body[index + 1];

      if (!next || !ALLOWED_ESCAPES.has(next)) {
        errors.push(`Faqat \\d va \\w ishlatiladi (\\${next ?? ''} qo'llab-quvvatlanmaydi)`);
      }

      index += 2;
      hasAtom = true;
      continue;
    }

    // Belgilar to'plami: [A-Z0-9-]
    if (char === '[') {
      const closing = body.indexOf(']', index);

      if (closing === -1) {
        errors.push("Belgilar to'plami ']' bilan yopilmagan");
        break;
      }

      const content = body.slice(index + 1, closing);

      if (!CHARACTER_CLASS_PATTERN.test(content)) {
        errors.push("Belgilar to'plamida faqat harf, raqam va '-' bo'lishi mumkin. Namuna: [A-Z0-9]");
      }

      index = closing + 1;
      hasAtom = true;
      continue;
    }

    // Aniq sondagi takrorlagich: {3} yoki {1,10}
    if (char === '{') {
      const closing = body.indexOf('}', index);

      if (closing === -1) {
        errors.push("Takrorlagich '}' bilan yopilmagan");
        break;
      }

      const quantifier = body.slice(index, closing + 1);
      errors.push(...validateQuantifier(quantifier, hasAtom));

      index = closing + 1;
      // Takrorlagichdan keyin yana takrorlagich kelmasligi kerak.
      hasAtom = false;
      continue;
    }

    // Cheksiz takrorlagichlar.
    if (char === '+' || char === '*' || char === '?') {
      if (!hasAtom) {
        errors.push(`'${char}' belgisidan oldin nima takrorlanishi ko'rsatilmagan`);
      }

      index += 1;
      hasAtom = false;
      continue;
    }

    // Tanlov: ^\d{9}|\d{12}$
    if (char === '|') {
      index += 1;
      hasAtom = false;
      continue;
    }

    if (LITERAL_PATTERN.test(char)) {
      index += 1;
      hasAtom = true;
      continue;
    }

    errors.push(`'${char}' belgisi naqshda ishlatilmaydi`);
    index += 1;
    hasAtom = false;
  }

  return errors;
}

/** `{3}` / `{1,10}` ni tekshiradi. */
function validateQuantifier(quantifier: string, hasAtom: boolean): string[] {
  const errors: string[] = [];

  if (!hasAtom) {
    errors.push(`${quantifier} dan oldin nima takrorlanishi ko'rsatilmagan`);
  }

  const match = QUANTIFIER_PATTERN.exec(quantifier);

  if (!match) {
    errors.push(`${quantifier} noto'g'ri yozilgan. Namuna: {10} yoki {1,10}`);
    return errors;
  }

  const min = Number(match[1]);
  const hasComma = match[2] !== undefined;
  // `{5}` da yuqori chegara pastkisiga teng; `{1,}` da esa umuman yo'q.
  const max = hasComma ? (match[3] === undefined ? null : Number(match[3])) : min;

  if (min > MAX_QUANTIFIER || (max !== null && max > MAX_QUANTIFIER)) {
    errors.push(`Takrorlash soni ${MAX_QUANTIFIER} dan oshmasligi kerak`);
  }

  if (max !== null && min > max) {
    errors.push(`${quantifier}: birinchi son ikkinchisidan katta bo'lmasligi kerak`);
  }

  return errors;
}
