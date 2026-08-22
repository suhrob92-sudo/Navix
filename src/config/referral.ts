/**
 * Taklif tizimi — YAGONA sozlama.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Yangi ilova uchun eng qimmat narsa — birinchi foydalanuvchilar.
 * Reklama pul talab qiladi va O'zbekistonda uning narxi tez o'sib
 * boryapti.
 *
 * Eng arzon yo'l esa allaqachon ilovada bo'lgan odam: u do'stiga
 * havola yuboradi. Bunday odam ishonch bilan keladi va uzoq qoladi.
 *
 * ── Nima uchun MUKOFOT yo'q ───────────────────────────────────────────
 * Ko'p ilovalar taklif uchun pul yoki chegirma beradi. Navix bunday
 * qilmaydi va bu ATAYLAB:
 *
 *   1. Pul mukofot bo'lsa, soxta hisoblar paydo bo'ladi. Odam
 *      o'nta SIM karta olib, o'ziga o'zi taklif yozadi. Buni
 *      to'xtatish uchun butun bir tekshiruv tizimi kerak bo'lardi.
 *   2. Mukofot to'lash — pul harakati. U hisob-kitob, soliq va
 *      huquqiy masalalarni ochadi.
 *   3. Ilova hali ishga tushmagan. Mukofot berish uchun avval
 *      daromad kerak.
 *
 * Shuning uchun bu yerda faqat HISOB yuritiladi: kim kimni
 * taklif qilgani va nechta odam kelgani. Mukofot keyinchalik,
 * alohida qaror bilan qo'shilishi mumkin.
 */

/**
 * Kod alifbosi — CHALKASHTIRMAYDIGAN harflar.
 *
 * ── Nima uchun ba'zi harflar YO'Q ─────────────────────────────────────
 * Kod og'zaki aytiladi: "menga NAVIX kodini yuboring" degan gap
 * telefonda bo'ladi. Shunda quyidagilar chalkashadi:
 *
 *     O va 0 (nol)     I, L va 1 (bir)     S va 5
 *     B va 8           Z va 2              G va 6
 *
 * ── Nima uchun har juftlikdan BITTASI qoladi ─────────────────────────
 * Qoida "8 bo'lmasin" emas — "8 va B birga bo'lmasin". Ulardan
 * bittasi qolsa chalkashlik yo'q va alifbo ham keraksiz
 * kichraymaydi.
 *
 * Qolgani 26 ta belgi. Bu yetarli: 7 ta belgi 8 milliarddan ortiq
 * kod beradi.
 *
 * Harflar faqat KATTA: kichik harf bilan aralashsa, odam qaysi
 * biri ekanini so'rashga majbur bo'lardi.
 */
export const REFERRAL_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY234789';

/**
 * Kod uzunligi.
 *
 * Qisqasi og'zaki aytishga qulay, uzunroq esa taxmin qilishdan
 * himoya qiladi. Yetti belgi — ikkalasining o'rtasi.
 */
export const REFERRAL_CODE_LENGTH = 7;

/**
 * Kod yasashga necha marta urinamiz.
 *
 * ── Nima uchun urinish kerak ──────────────────────────────────────────
 * Kod tasodifiy yasaladi va nazariy jihatdan mavjudi bilan
 * to'qnashishi mumkin. Bazadagi noyoblik sharti buni ushlaydi —
 * shunda yangisini yasab qayta uriniladi.
 *
 * Uchta urinishdan keyin ham to'qnashish ehtimoli deyarli nolga
 * teng; agar shunday bo'lsa, muammo boshqa joyda va uni yashirish
 * noto'g'ri bo'lardi.
 */
export const REFERRAL_CODE_ATTEMPTS = 3;

/** Ro'yxatda bir vaqtda nechta odam ko'rsatiladi. */
export const REFERRAL_PAGE_SIZE = 20;

/**
 * Taklif havolasidagi yo'l.
 *
 * ── Nima uchun alohida sahifa, `?ref=` emas ───────────────────────────
 * `navix.uz/?ref=ABC1234` ko'rinishidagi havola ikki kamchilikka ega:
 *
 *   1. Ulashilganda xunuk ko'rinadi va odamlar savol berishadi.
 *   2. Odam tanishtiruv sahifasiga tushadi va uni KIM taklif
 *      qilganini bilmaydi.
 *
 * `navix.uz/i/ABC1234` esa toza ko'rinadi va o'sha sahifada
 * taklif qilgan odamning ismi ko'rsatiladi — bu ishonch beradi.
 */
export const REFERRAL_PATH = '/i';

/** Kod bo'yicha to'liq havola. */
export function referralLink(baseUrl: string, code: string): string {
  /*
    Manzil oxiridagi ortiqcha chiziq olib tashlanadi.

    Sozlamada `https://navix.uz/` deb yozilgan bo'lsa, natija
    `https://navix.uz//i/ABC` bo'lib qolardi — u ishlaydi, lekin
    ulashilganda xato yozilgandek ko'rinadi.
  */
  return `${baseUrl.replace(/\/+$/, '')}${REFERRAL_PATH}/${code}`;
}

/**
 * Kod to'g'ri shakldami.
 *
 * Kod MANZILDAN keladi va uni istalgan odam o'zgartira oladi.
 * Tekshirilmasa, bazaga ma'nosiz so'rovlar yog'ilardi.
 */
export function isReferralCode(value: string): boolean {
  if (value.length !== REFERRAL_CODE_LENGTH) return false;

  for (const char of value) {
    if (!REFERRAL_ALPHABET.includes(char)) return false;
  }

  return true;
}

/**
 * Odam yozgan kodni tozalaydi.
 *
 * ── Nima uchun ──────────────────────────────────────────────────────
 * Kod qo'lda ko'chirilganda yon-atrofidagi bo'sh joy ham tushadi,
 * ba'zan esa butun havola nusxalanadi. Ularni rad etish o'rniga
 * tozalash qulayroq: natija baribir bir xil.
 */
export function cleanReferralCode(input: string): string {
  const trimmed = input.trim().toUpperCase();

  // To'liq havola nusxalangan bo'lsa — oxirgi qismini olamiz.
  const parts = trimmed.split('/');

  return (parts[parts.length - 1] ?? '').split('?')[0];
}

/** Ulashishda yuboriladigan matn. */
export function referralShareText(link: string): string {
  return `Navix — taksi, ovqat, savdo va to'lovlar bitta ilovada. Mana havola: ${link}`;
}
