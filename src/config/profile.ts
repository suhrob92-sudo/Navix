/**
 * Ijtimoiy profil qoidalari.
 *
 * ── Nima uchun alohida fayl ───────────────────────────────────────────
 * Bu qoidalar UCH joyda kerak: validatsiyada (server), formada
 * (brauzer) va ro'yxatdan o'tishda (boshlang'ich nom yasashda).
 * Ular bir joyda turmasa, uch joyda uch xil bo'lib ketardi.
 */

export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 30,
  /**
   * Faqat kichik harf, raqam va pastki chiziq. Harf bilan boshlanadi.
   *
   * ── Nima uchun shunchalik tor ───────────────────────────────────────
   * Nom manzilda ketadi (`/u/aziz_karimov`). Nuqta, chiziqcha yoki
   * boshqa belgi qo'shilsa, manzil noaniq bo'lib qolardi. Katta harf
   * ham yo'q: `@Aziz` va `@aziz` ikki xil odam bo'lib chiqib,
   * chalkashlik va aldash uchun yo'l ochilardi.
   */
  pattern: /^[a-z][a-z0-9_]{2,29}$/,
} as const;

/**
 * Band nomlar — ularni hech kim ola olmaydi.
 *
 * Sabab ikki xil: ba'zilari ilovaning O'Z manzillari bilan
 * to'qnashadi, ba'zilari esa rasmiy vakil bo'lib ko'rinish uchun
 * ishlatilishi mumkin ("men Navix qo'llab-quvvatlash xizmatiman").
 */
export const RESERVED_USERNAMES: readonly string[] = [
  'navix',
  'admin',
  'administrator',
  'support',
  'help',
  'official',
  'moderator',
  'security',
  'system',
  'root',
  'api',
  'auth',
  'login',
  'register',
  'profile',
  'settings',
  'search',
  'about',
  'me',
  'user',
  'users',
  'chat',
  'messages',
  'call',
  'feed',
  'navbat',
];

/** Nom bandmi (ilova ehtiyoji uchun ajratilganmi). */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase());
}

export const BIO_MAX_LENGTH = 300;
export const LOCATION_MAX_LENGTH = 80;
export const WEBSITE_MAX_LENGTH = 200;

/**
 * Ro'yxatdan o'tayotgan odamga boshlang'ich nom yasaydi.
 *
 * ── Nima uchun tasodifiy qo'shimcha ─────────────────────────────────
 * Ismlar takrorlanadi: yuzlab "Aziz" bor. Faqat ismdan yasalsa,
 * ikkinchi Azizning ro'yxatdan o'tishi xato bilan tugardi. Sakkiz
 * belgili tasodifiy qo'shimcha bunga yo'l qo'ymaydi.
 *
 * Foydalanuvchi keyin nomni "Profilni tahrirlash" da o'zgartira oladi.
 */
export function buildDefaultUsername(firstName: string | null | undefined): string {
  const suffix = Math.random().toString(36).slice(2, 10).padEnd(8, '0');

  const base = (firstName ?? '')
    .toLowerCase()
    // Lotin harflari va raqamlardan boshqasi tashlanadi (apostrof, bo'sh joy).
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);

  // Nom HARF bilan boshlanishi shart — raqamdan boshlangani rad etilardi.
  return /^[a-z]/.test(base) ? `${base}_${suffix}` : `user_${suffix}`;
}
