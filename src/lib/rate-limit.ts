import { RateLimitError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { cacheKey, getRedis } from '@/lib/redis';

/**
 * So'rovlar sonini cheklash (rate limiting).
 *
 * Oddiy tilda: bir odam bir daqiqada 1000 marta parol taxmin qila olmasligi kerak.
 * Bu himoya "brute-force" (parolni taxmin qilib topish) hujumlarini to'xtatadi.
 *
 * Ishlash prinsipi — "sanovchi oyna" (fixed window):
 *  1. Redis'da hisoblagich yaratiladi va unga muddat (TTL) beriladi;
 *  2. Har so'rovda hisoblagich bittaga oshadi;
 *  3. Chegaradan oshsa — 429 xatolik qaytadi;
 *  4. Muddat tugagach hisoblagich o'zi o'chadi.
 */

export interface RateLimitRule {
  /** Chegara ichida ruxsat etilgan so'rovlar soni. */
  limit: number;
  /** Oyna uzunligi (soniyalarda). */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Autentifikatsiya uchun standart cheklovlar.
 * Qiymatlar xavfsizlik va qulaylik o'rtasidagi muvozanatga qarab tanlangan.
 */
export const AUTH_RATE_LIMITS = {
  /** Ro'yxatdan o'tish: bir IP'dan soatiga 5 marta. */
  register: { limit: 5, windowSeconds: 60 * 60 },
  /** Kirish: bir raqam uchun 15 daqiqada 10 marta. */
  login: { limit: 10, windowSeconds: 60 * 15 },
  /** SMS kod yuborish: bir raqamga soatiga 5 marta. */
  otpSend: { limit: 5, windowSeconds: 60 * 60 },
  /** Kodni tekshirish: bir raqam uchun 15 daqiqada 10 marta. */
  otpVerify: { limit: 10, windowSeconds: 60 * 15 },
  /** Parolni tiklash so'rovi: bir raqam uchun soatiga 3 marta. */
  passwordReset: { limit: 3, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export type AuthRateLimitScope = keyof typeof AUTH_RATE_LIMITS;

/**
 * Hisoblagichni oshiradi va chegaraga yetgan-yetmaganini qaytaradi.
 *
 * @param scope cheklov turi (masalan `login`)
 * @param identifier kim uchun hisoblanadi (telefon raqami yoki IP)
 * @param rule chegara qoidasi
 */
export async function consumeRateLimit(
  scope: string,
  identifier: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const key = cacheKey.rateLimit(scope, identifier);

  try {
    const redis = getRedis();

    // Ikkala buyruq bitta so'rovda yuboriladi — tarmoq kechikishi ikki barobar kamayadi.
    const results = await redis
      .multi()
      .incr(key)
      .expire(key, rule.windowSeconds, 'NX') // TTL faqat birinchi so'rovda o'rnatiladi
      .exec();

    // `exec()` tranzaksiya bekor qilinganda `null` qaytaradi — bu holatda
    // hisoblagichga ishonib bo'lmaydi, so'rovni o'tkazib yuboramiz.
    const incrementResult = results?.[0];
    if (!incrementResult) {
      return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
    }

    const current = Number(incrementResult[1] ?? 0);
    const remaining = Math.max(0, rule.limit - current);

    if (current > rule.limit) {
      const ttl = await redis.ttl(key);
      return { allowed: false, remaining: 0, retryAfterSeconds: ttl > 0 ? ttl : rule.windowSeconds };
    }

    return { allowed: true, remaining, retryAfterSeconds: 0 };
  } catch (error) {
    // Redis ishlamay qolsa foydalanuvchini bloklamaymiz — xizmat to'xtab qolmasligi kerak.
    // Lekin bu holat log'ga yoziladi, chunki himoya vaqtincha o'chgan bo'ladi.
    logger.error({ err: error, scope, identifier }, 'Rate limit tekshiruvi bajarilmadi');
    return { allowed: true, remaining: rule.limit, retryAfterSeconds: 0 };
  }
}

/**
 * Kirish TALAB QILINMAYDIGAN endpointlar uchun cheklovlar.
 *
 * Ular alohida ro'yxatda, chunki xavfi boshqacha: bu yerda parol
 * taxmin qilinmaydi, lekin robot bazani soxta yozuvlar bilan
 * to'ldirib tashlashi mumkin.
 */
export const PUBLIC_RATE_LIMITS = {
  /** Navbatga yozilish: bir IP'dan soatiga 5 marta. */
  waitlist: { limit: 5, windowSeconds: 60 * 60 },
  /**
   * Obuna bo'lish: bitta foydalanuvchi uchun daqiqasiga 30 marta.
   *
   * Odam uchun bemalol (ro'yxatni aylanib chiqib obuna bo'lish),
   * skript uchun esa foydasiz.
   */
  follow: { limit: 30, windowSeconds: 60 },
  /**
   * Suhbat ochish: bitta foydalanuvchi uchun soatiga 60 marta.
   *
   * Har bir yangi suhbat BEGONA odamning ro'yxatida paydo bo'ladi,
   * shuning uchun chegara obunadan qattiqroq.
   */
  /**
   * Kirish urinishlari BITTA MANZILDAN: soatiga 30 marta.
   *
   * ── Nima uchun telefon bo'yicha cheklov YETARLI EMAS ────────────────
   * `login` cheklovi telefon raqami bo'yicha ishlaydi va bitta hisobni
   * yaxshi himoya qiladi. Lekin hujum boshqacha bo'ladi:
   *
   *   hujumchi 10 000 ta telefon raqamini oladi va HAR BIRIGA bittadan
   *   eng ommabop parolni sinaydi ("12345678", "parol123").
   *
   * Har bir raqamga bitta urinish tushadi — telefon bo'yicha cheklov
   * hech qachon ishga tushmaydi. Lekin 10 000 hisobning bir nechtasi
   * ochiladi. Bu "credential stuffing" deb ataladi va bugungi kunda
   * eng ko'p uchraydigan hujum.
   *
   * Manzil bo'yicha cheklov aynan shu yo'lni yopadi.
   *
   * ── Nima uchun 30 ta ────────────────────────────────────────────────
   * Bir uydan yoki bir ofisdan bir necha odam kirishi mumkin va ular
   * parolni bir necha marta xato yozishi tabiiy. 30 ta — ularga
   * yetadi, hujumga esa yetmaydi.
   */
  loginByIp: { limit: 30, windowSeconds: 60 * 60 },
  /**
   * OCHIQ katalog: daqiqasiga 120 marta bitta manzildan.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Mehmonxonalar, reyslar, vakansiyalar va modullar ro'yxati kirishsiz
   * ochiladi — bu to'g'ri, ular ommaviy ma'lumot.
   *
   * Lekin chegarasiz ochiq manzil ikki narsani beradi:
   *  · butun bazani skript bilan varaqlab yig'ib olish (raqobatchi
   *    bir kechada barcha narxlarni ko'chirib oladi);
   *  · bitta arzon skript bilan bazani yuklab, saytni sekinlashtirish.
   *
   * ── Nima uchun 120 ta ───────────────────────────────────────────────
   * Odam bir daqiqada 120 marta sahifa varaqlay olmaydi. Skript esa
   * bemalol qiladi. Bu chegara haqiqiy foydalanuvchiga umuman
   * sezilmaydi.
   */
  publicCatalog: { limit: 120, windowSeconds: 60 },
  /**
   * Katalog rasmlarini boshqarish: daqiqasiga 40 marta.
   *
   * ── Nima uchun yuklashdan ALOHIDA chegara ───────────────────────────
   * `upload` chegarasi faylning O'ZINI yuborishni cheklaydi. Bu yerda
   * esa faqat manzil biriktiriladi — ya'ni fayl yuklamasdan ham
   * mingta yozuv yaratib, jadvalni to'ldirish mumkin edi.
   *
   * 40 ta — sotuvchi bir mahsulotga 8 ta rasm qo'yib, tartibini bir
   * necha marta o'zgartirishiga bemalol yetadi.
   */
  catalogImage: { limit: 40, windowSeconds: 60 },
  /**
   * Baho qo'yish: daqiqasiga 20 marta.
   *
   * ── Nima uchun bunchalik past ───────────────────────────────────────
   * Odam bir daqiqada yigirmata narsaga baho qo'ya olmaydi — u
   * ularni sotib olgan ham bo'lmaydi.
   *
   * Chegara asosan takroriy bosishdan himoya qiladi: fikrini
   * o'zgartirib, yulduzni bir necha marta bosgan odam ham
   * bemalol sig'adi.
   */
  review: { limit: 20, windowSeconds: 60 },
  /**
   * Sevimlilar: daqiqasiga 60 marta.
   *
   * ── Nima uchun bahodan yuqori ───────────────────────────────────────
   * Yurakcha bosish — bir bosishlik amal va odam katalogni
   * varaqlab, ketma-ket o'nlab narsani belgilashi mumkin. Baho esa
   * o'ylashni talab qiladi.
   */
  favorite: { limit: 60, windowSeconds: 60 },
  /**
   * Ko'rilganini belgilash: daqiqasiga 120 marta.
   *
   * ── Nima uchun eng yuqori chegara ───────────────────────────────────
   * Bu so'rov HAR BIR mahsulot sahifasi ochilganda yuboriladi, ya'ni
   * u ilovadagi eng tez-tez takrorlanadigan yozuv amali.
   *
   * Odam katalogni tez varaqlab, bir daqiqada o'nlab sahifani
   * ochishi mumkin. Chegara esa faqat skriptni to'xtatadi.
   */
  recentView: { limit: 120, windowSeconds: 60 },
  /**
   * Savol va javob: daqiqasiga 10 marta.
   *
   * Kunlik chegara (`MAX_QUESTIONS_PER_DAY`) asosiy himoya; bu esa
   * bir zumda o'nlab so'rov yuborishni to'xtatadi.
   */
  productQuestion: { limit: 10, windowSeconds: 60 },
  /**
   * Savatni o'zgartirish: daqiqasiga 120 marta.
   *
   * ── Nima uchun chegara YUQORI ───────────────────────────────────────
   * Savat serverga ko'chgach, har bir "+" va "-" bosish so'rovga
   * aylandi. Odam beshta mahsulotning sonini tanlab chiqsa,
   * bu allaqachon o'nlab so'rov.
   *
   * Past chegara oddiy xaridorni to'xtatib qo'yardi — pastroq
   * chegara faqat skript uchun to'siq bo'lishi kerak.
   */
  cartWrite: { limit: 120, windowSeconds: 60 },
  /**
   * Qaytarish so'rovi: daqiqasiga 10 marta.
   *
   * Bu PUL bilan bog'liq amal va uni ketma-ket yuborishga hech
   * qanday sabab yo'q. Past chegara oddiy odamga sezilmaydi.
   */
  returnRequest: { limit: 10, windowSeconds: 60 },
  chatOpen: { limit: 60, windowSeconds: 60 * 60 },
  /**
   * Guruh yaratish: soatiga 10 ta.
   *
   * ── Nima uchun bunchalik qattiq ─────────────────────────────────────
   * Guruh yaratish — bu boshqa odamlarni SO'RAMASDAN suhbatga
   * qo'shish. Cheklovsiz bitta hisob soatiga yuzlab guruh yasab,
   * har biriga o'nlab odamni tortib, ularning ekranini reklama
   * bilan to'ldira olardi.
   *
   * Kuniga o'nta guruh yasaydigan haqiqiy odam yo'q.
   */
  groupCreate: { limit: 10, windowSeconds: 60 * 60 },
  /**
   * Guruhni boshqarish (nom, rasm, a'zolar, daraja): daqiqasiga 30 ta.
   *
   * Bu amallarning har biri suhbatga hodisa yozuvi qo'shadi —
   * cheklovsiz guruh tarixini bir zumda ko'mib tashlash mumkin edi.
   */
  groupManage: { limit: 30, windowSeconds: 60 },
  /**
   * Xabar yuborish: daqiqasiga 60 ta.
   *
   * Odam uchun bemalol (soniyasiga bitta), skript uchun esa spam
   * qilishga yetmaydi.
   */
  chatSend: { limit: 60, windowSeconds: 60 },
  /**
   * Reaksiya qo'yish: daqiqasiga 120 marta.
   *
   * Xabardan yumshoqroq: reaksiya bir bosishda qo'yiladi va odam
   * emojini bir necha marta almashtirib ko'rishi normal. Ayni paytda
   * har bosish push yuborishi mumkin, shuning uchun cheksiz emas.
   */
  chatReact: { limit: 120, windowSeconds: 60 },
  /**
   * Qo'ng'iroq boshlash: daqiqasiga 10 marta.
   *
   * Har bir qo'ng'iroq begona odamning telefonini CHALDIRADI —
   * xabardan ko'ra bezovta qiluvchi amal. Shuning uchun chegara qattiq.
   * Ayni paytda "ko'tarmadi, qayta urinaman" holatiga bemalol yetadi.
   */
  callStart: { limit: 10, windowSeconds: 60 },
  /**
   * Ulanish signallari: daqiqasiga 300 ta.
   *
   * ── Nima uchun cheklov KERAK ────────────────────────────────────────
   * Signallar navbati muddati tugaguncha xotirada turadi. Cheklovsiz
   * unga istalgancha ma'lumot tiqib, Redis xotirasini to'ldirish mumkin
   * bo'lardi.
   *
   * Haqiqiy qo'ng'iroq ~40 ta signal ishlatadi, shuning uchun 300 juda
   * bemalol — lekin suiiste'molga yetmaydi.
   */
  callSignal: { limit: 300, windowSeconds: 60 },
  /**
   * Odam qidirish: daqiqasiga 60 marta.
   *
   * Qidiruv har bosilgan harfda emas, yozish to'xtagach yuboriladi.
   * Shuning uchun odam uchun 60 juda bemalol; skript esa shu chegara
   * bilan foydalanuvchilar ro'yxatini yig'a olmaydi.
   */
  userSearch: { limit: 60, windowSeconds: 60 },
  /**
   * Bloklash va blokdan chiqarish: daqiqasiga 20 marta.
   *
   * Odam uchun bemalol, skript esa shu chegara bilan minglab odamni
   * ketma-ket bloklab, bazani to'ldira olmaydi.
   */
  userBlock: { limit: 20, windowSeconds: 60 },
  /**
   * Shikoyat: soatiga 20 marta.
   *
   * ── Nima uchun chegara QATTIQ ───────────────────────────────────────
   * Shikoyatni odam o'qiydi. Cheksiz shikoyat — moderatorning vaqtini
   * o'g'irlash usuli, ya'ni haqiqiy shikoyatlar ko'milib qolardi.
   */
  userReport: { limit: 20, windowSeconds: 60 * 60 },
  /**
   * Hamkorlik taklifi — kuniga o'ntagacha.
   *
   * ── Nima uchun chegara QAT'IY ───────────────────────────────────────
   * "Hamkorlikka ochiq" degan belgi ijodkorni ochiq nishonga
   * aylantirmasligi kerak. Bitta juftlikda faqat bitta javobsiz
   * taklif bo'lishi bazada majburlangan, lekin usiz ham bitta odam
   * yuzlab ijodkorga bir xil matn yuborishi mumkin edi.
   *
   * O'nta — haqiqiy biznes uchun yetarli: u kuniga o'nta blogerga
   * yozsa, bu allaqachon jiddiy kampaniya.
   */
  collabOffer: { limit: 10, windowSeconds: 60 * 60 * 24 },
  /**
   * Post yozish: soatiga 20 ta.
   *
   * Har bir post obunachilarning lentasiga tushadi. Odam uchun soatiga
   * yigirmata juda bemalol, skript uchun esa lentani egallab olishga
   * yetmaydi.
   */
  postCreate: { limit: 20, windowSeconds: 60 * 60 },
  /**
   * Izoh: daqiqasiga 20 ta.
   *
   * Izoh postdan tez-tez yoziladi (suhbat kabi), lekin u ham begona
   * odamga bildirishnoma yuboradi.
   */
  postComment: { limit: 20, windowSeconds: 60 },
  /**
   * Shikoyat: soatiga 20 ta.
   *
   * Shikoyat tugmasi ham QUROL bo'lishi mumkin: bir odam o'nlab
   * postga shikoyat yozib, moderator navbatini to'ldirib qo'yishi va
   * haqiqiy shikoyatlarni ko'mib yuborishi mumkin.
   *
   * Yigirma — halol foydalanuvchi uchun juda bemalol (odatda kuniga
   * bir-ikkita), hujum uchun esa yetarli emas.
   */
  report: { limit: 20, windowSeconds: 60 * 60 },
  /**
   * Video ko'rildi: daqiqasiga 60 ta.
   *
   * Ko'rishlar soni sotuvchi uchun ko'rsatkich. Chegarasiz skript
   * uni istalgan songa ko'tarib qo'yardi va son ma'nosini
   * yo'qotardi. Odam esa bir daqiqada 60 ta videoni ko'ra olmaydi.
   */
  videoView: { limit: 60, windowSeconds: 60 },
  /**
   * Yoqtirish: daqiqasiga 120 ta.
   *
   * Lentani aylanib chiqib ko'plab post yoqtirish tabiiy holat.
   * Cheklov faqat robotni to'xtatish uchun.
   */
  postLike: { limit: 120, windowSeconds: 60 },
  /**
   * Ulashish va mahsulot tugmasi: daqiqasiga 30 ta.
   *
   * Ikkala son ham sotuvchining ko'rsatkichi. Chegarasiz skript
   * ularni istalgan songa ko'tarib, "bu video ishlayapti" degan
   * yolg'on manzara yaratardi.
   */
  postShare: { limit: 30, windowSeconds: 60 },
  /**
   * Hikoya joylash: soatiga 30 ta.
   *
   * Kunlik chegara (20 ta) xizmatning o'zida tekshiriladi. Bu yerdagi
   * cheklov esa boshqa ish qiladi: skript bir soniyada yuzta so'rov
   * yuborib, fayl omborini to'ldirib qo'ymasligi uchun.
   */
  createStory: { limit: 30, windowSeconds: 60 * 60 },
  /**
   * Rasm yuklash: soatiga 60 ta.
   *
   * ── Nima uchun chegara KERAK ────────────────────────────────────────
   * Har bir rasm joy egallaydi va u PULGA tushadi. Cheklovsiz skript
   * bir kechada saqlash limitini to'ldirib, hisobni to'xtatib
   * qo'yishi mumkin edi — shunda hamma rasmlar ochilmay qolardi.
   */
  upload: { limit: 60, windowSeconds: 60 * 60 },
  /**
   * Brauzer xatosi haqida hisobot: daqiqasiga 30 ta.
   *
   * ── Nima uchun chegara SAXIY ────────────────────────────────────────
   * Bitta buzilgan sahifa bir necha xil xato chiqarishi mumkin va
   * ularning hammasi kerak. Brauzer tomoni bir xil xatoni ikki marta
   * yubormaydi, ya'ni 30 ta — bu 30 ta HAR XIL xato.
   *
   * Chegara IP bo'yicha: bu manzilda foydalanuvchi noma'lum
   * (xato tizimga kirgunga qadar ham yuz berishi mumkin).
   */
  clientError: { limit: 30, windowSeconds: 60 },
  /**
   * PUL amallari: bitta foydalanuvchi uchun soatiga 20 marta.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Hamyon amallarida `idempotencyKey` bor — u ALOQA UZILGANDA
   * takrorlanishdan saqlaydi. Lekin u ATAYLAB yuborilgan yuzlab
   * so'rovni to'xtatmaydi: har biri boshqa kalit bilan keladi.
   *
   * Chegara odam uchun bemalol: kuniga bir-ikki marta to'ldirish yoki
   * o'tkazish odatiy hol. Soatiga yigirmata esa allaqachon shubhali.
   *
   * ── Nima uchun chegara QATTIQROQ emas ───────────────────────────────
   * Pul amali muvaffaqiyatsiz tugashi mumkin (mablag' yetmadi). Odam
   * qayta urinadi va bu ham chegaraga kiradi. Juda qattiq chegara
   * halol odamni bloklab qo'yardi.
   */
  moneyAction: { limit: 20, windowSeconds: 60 * 60 },
  /**
   * Taklif kodini tekshirish: bir IP'dan daqiqasiga 20 marta.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Bu yo'l KIRISHSIZ ochiq (havolani ochgan odam hali ro'yxatdan
   * o'tmagan). Ochiq yo'lni kod taxmin qilishga ishlatish mumkin.
   *
   * Kod 8 milliard variantdan iborat — taxmin qilish amalda
   * imkonsiz. Lekin urinishning o'zi bazani bekorga ishlatardi.
   *
   * Yigirmata — odam uchun bemalol (havolani bir necha marta
   * ochish, sahifani yangilash), skript uchun esa foydasiz.
   */
  /**
   * Guruh havolasini TEKSHIRISH: daqiqasiga 20 marta.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Bu manzil kirishsiz ochiladi va u kod bo'yicha guruh qidiradi.
   * Cheklovsiz bo'lsa, skript kodlarni birma-bir sinab, mavjud
   * guruhlarni topib olishi mumkin edi.
   *
   * 141 trillion kombinatsiyada bu baribir amalda imkonsiz, lekin
   * cheklov urinishning O'ZINI to'xtatadi — va serverni behuda
   * yukdan saqlaydi.
   */
  groupInviteLookup: { limit: 20, windowSeconds: 60 },
  /**
   * Xabarlarni qidirish: daqiqasiga 40 marta.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Qidiruv eng katta jadval (`messages`) bo'ylab boradi va u ilovadagi
   * eng og'ir so'rovlardan biri.
   *
   * Brauzer har harfda so'rov yubormaydi (kechikish bor), lekin bu
   * himoya emas: so'rovni to'g'ridan-to'g'ri yuborib, bazani yuklab
   * qo'yish mumkin.
   *
   * 40 ta — odam uchun bemalol: u bir daqiqada 40 marta qidirmaydi.
   */
  messageSearch: { limit: 40, windowSeconds: 60 },
  /**
   * CSP xabarlari: daqiqasiga 120 marta.
   *
   * ── Nima uchun ALOHIDA va SAXIY ─────────────────────────────────────
   * Ilgari ular xato hisobotlari bilan bitta cheklovni bo'lishardi
   * (daqiqasiga 30). Brauzer esa har bir sahifa ochilishida bir
   * nechta xabar yuboradi — natijada oddiy foydalanuvchi bir necha
   * sahifa ochishi bilanoq 429 xatosini olardi va uning konsoli
   * qizil yozuvlarga to'lardi.
   *
   * Endi ma'lum buzilishlar serverda darhol tashlab yuboriladi
   * (bazaga tegmasdan), ya'ni bu so'rovlar deyarli tekin. Shuning
   * uchun chegara ham kengroq bo'lishi mumkin.
   */
  cspReport: { limit: 120, windowSeconds: 60 },
  referralLookup: { limit: 20, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export type PublicRateLimitScope = keyof typeof PUBLIC_RATE_LIMITS;

/**
 * Berilgan qoida bo'yicha cheklovni majburlaydi.
 *
 * `enforceRateLimit` va `enforcePublicRateLimit` ikkalasi shu yerga
 * tayanadi — xato matni va soniyalarni ikki joyda yozib yurmaslik uchun.
 */
async function enforce(scope: string, identifier: string, rule: RateLimitRule, message?: string): Promise<void> {
  const result = await consumeRateLimit(scope, identifier, rule);

  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterSeconds / 60);
    throw new RateLimitError(
      result.retryAfterSeconds,
      message ?? `Juda ko'p urinish. ${minutes} daqiqadan so'ng qayta urinib ko'ring.`,
    );
  }
}

/**
 * Chegaradan oshsa darhol `RateLimitError` tashlaydi.
 * API route'larida shu funksiya ishlatiladi.
 */
export async function enforceRateLimit(
  scope: AuthRateLimitScope,
  identifier: string,
  message?: string,
): Promise<void> {
  return enforce(scope, identifier, AUTH_RATE_LIMITS[scope], message);
}

/** Ochiq endpointlar uchun — `PUBLIC_RATE_LIMITS` qoidalari bo'yicha. */
export async function enforcePublicRateLimit(
  scope: PublicRateLimitScope,
  identifier: string,
  message?: string,
): Promise<void> {
  return enforce(scope, identifier, PUBLIC_RATE_LIMITS[scope], message);
}

/** Hisoblagichni nolga qaytaradi (masalan muvaffaqiyatli kirishdan keyin). */
export async function resetRateLimit(scope: string, identifier: string): Promise<void> {
  try {
    await getRedis().del(cacheKey.rateLimit(scope, identifier));
  } catch (error) {
    logger.warn({ err: error, scope, identifier }, "Rate limit hisoblagichini tozalab bo'lmadi");
  }
}
