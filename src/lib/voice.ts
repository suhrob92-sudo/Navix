/**
 * Ovoz bilan boshqarish uchun SOF yordamchilar.
 *
 * Bu fayl brauzer API'siga TEGMAYDI: u yerda `window` va mikrofon bor,
 * ularni test qilib bo'lmaydi. Shu sababli qaror qabul qiladigan
 * mantiq — chaqiruv so'zini kesish, tilni tanlash, matnga ishonish —
 * shu yerda, sof funksiyalarda saqlanadi va to'liq test bilan
 * qoplanadi. Brauzer bilan gaplashish esa hook'da
 * (`use-speech-recognition.ts`).
 */

/**
 * Chaqiruv so'zi ("wake word") variantlari.
 *
 * ── Nima uchun bir nechta ─────────────────────────────────────────────
 * Nutqni tanish "Navix" ni har doim to'g'ri yozmaydi: u lotincha
 * bo'lmagan so'z va tanigich uni "navigs", "naviks", "nawix" deb
 * yozishi mumkin. Ro'yxat shuning uchun keng.
 *
 * MUHIM: bu yerda HAQIQIY wake word yo'q. Brauzer mikrofonni doim
 * ochiq tutolmaydi (batareya va ruxsat cheklovlari), shuning uchun
 * foydalanuvchi tugmani bosadi. "Navix" so'zini aytsa ham — biz uni
 * shunchaki olib tashlaymiz, chunki u buyruqning bir qismi emas.
 */
const WAKE_WORDS = ['navix', 'naviks', 'navigs', 'nawix', 'navik', 'naviq'];

/** Chaqiruvdan oldin aytiladigan so'zlar: "hey navix", "ok navix". */
const WAKE_PREFIXES = ['hey', 'hay', 'ok', 'okey', 'salom', 'eshit'];

/**
 * Gap boshidagi chaqiruv so'zini olib tashlaydi.
 *
 * Faqat BOSHIDAN kesiladi. Aks holda "navix haqida nima bilasan"
 * degan savol "haqida nima bilasan" ga aylanib, ma'nosini yo'qotardi.
 *
 * @example
 *   stripWakeWord('navix taksi chaqir')     // "taksi chaqir"
 *   stripWakeWord('hey navix, balansim?')   // "balansim?"
 *   stripWakeWord("lag'mon buyur")          // "lag'mon buyur"
 */
export function stripWakeWord(text: string): string {
  let rest = text.trimStart();

  // Ixtiyoriy kirish so'zi: "hey", "ok".
  const prefix = matchLeadingWord(rest, WAKE_PREFIXES);
  const afterPrefix = prefix === null ? rest : rest.slice(prefix.length).trimStart();

  const wake = matchLeadingWord(afterPrefix, WAKE_WORDS);

  // Chaqiruv so'zi yo'q bo'lsa, kirish so'zini ham tegmaymiz:
  // "ok, gazga to'la" dagi "ok" — javob, chaqiruv emas.
  if (wake === null) return text.trim();

  rest = afterPrefix.slice(wake.length);

  // Chaqiruvdan keyingi vergul va probellar: "navix, balansim".
  return rest.replace(/^[\s,.!?—-]+/u, '').trim();
}

/**
 * Matn shu so'zlardan biri bilan BOSHLANADIMI.
 *
 * So'z chegarasi tekshiriladi: "navixda" so'zi "navix" deb
 * kesilmasligi kerak.
 */
function matchLeadingWord(text: string, words: readonly string[]): string | null {
  const lower = text.toLowerCase();

  for (const word of words) {
    if (!lower.startsWith(word)) continue;

    const next = lower.charAt(word.length);
    // Keyingi belgi harf yoki raqam bo'lsa — bu boshqa so'z.
    if (next !== '' && /[\p{L}\p{N}]/u.test(next)) continue;

    return text.slice(0, word.length);
  }

  return null;
}

/**
 * Nutqni tanish uchun tillar — SINOV TARTIBIDA.
 *
 * ── Nima uchun ro'yxat, bitta til emas ────────────────────────────────
 * Brauzerning bepul tanigichi (Google) o'zbek tilini HAR DOIM
 * qo'llab-quvvatlamaydi: bu qurilma, Chrome versiyasi va mintaqaga
 * bog'liq. Qo'llab-quvvatlamasa, u xato beradi yoki bo'sh natija
 * qaytaradi.
 *
 * Shuning uchun ro'yxat: birinchisi ishlamasa, keyingisiga o'tiladi.
 * Rus tili ikkinchi o'rinda — O'zbekistonda ko'pchilik uni ham
 * tushunadi va tanigich uni aniq biladi.
 *
 * Natija HAR DOIM tahrirlanadigan maydonga tushadi, shuning uchun
 * noto'g'ri tanilgan so'z pul harakatiga aylanmaydi.
 */
export const SPEECH_LANGUAGES = ['uz-UZ', 'ru-RU', 'en-US'] as const;

export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number];

/**
 * Tanilgan matnga ishonsa bo'ladimi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Tanigich shovqinni ham "so'z" deb qaytaradi: bir-ikki harf yoki
 * ma'nosiz bo'g'in. Bunday matnni yordamchiga yuborish "Tushunmadim"
 * javobini keltiradi va foydalanuvchi ilovani ayblaydi.
 *
 * Chegara past qo'yilgan (3 belgi): "chek" va "tarix" kabi qisqa,
 * lekin haqiqiy buyruqlar o'tishi kerak.
 */
const MIN_RECOGNIZED_LENGTH = 3;

/**
 * Tanigich qanchalik ishonganini bildiradigan eng past chegara.
 *
 * Brauzer 0 dan 1 gacha son beradi. 0.5 dan pasti odatda shovqin.
 * Ba'zi brauzerlar umuman bermaydi — unda `null` keladi va biz
 * matnning o'ziga qaraymiz.
 */
const MIN_CONFIDENCE = 0.5;

export function isUsableTranscript(text: string, confidence: number | null): boolean {
  if (text.trim().length < MIN_RECOGNIZED_LENGTH) return false;
  if (confidence === null) return true;

  return confidence >= MIN_CONFIDENCE;
}

/** Mikrofon xatosi uchun o'zbekcha, foydali xabar. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.';
    case 'no-speech':
      return "Ovoz eshitilmadi. Tugmani bosib, aniqroq gapiring.";
    case 'audio-capture':
      return 'Mikrofon topilmadi. Qurilmangizni tekshiring.';
    case 'network':
      return "Internet uzildi. Nutqni tanish tarmoq orqali ishlaydi.";
    case 'language-not-supported':
      return "Bu qurilmada o'zbek tilini tanish mavjud emas. Matn bilan yozing.";
    default:
      return "Ovozni tanib bo'lmadi. Qaytadan urinib ko'ring yoki matn yozing.";
  }
}
