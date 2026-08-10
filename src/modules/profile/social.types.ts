/**
 * Ommaviy profil — brauzer va server uchun umumiy turlar.
 *
 * ── Nima uchun `profile.types` dan alohida ────────────────────────────
 * Mavjud `ProfilePayload` — bu O'Z profilingiz: unda telefon, email,
 * til va mavzu bor. Bu yerdagi profil esa BEGONA odam ko'radigan
 * ma'lumot: unda telefon ham, email ham bo'lmasligi kerak.
 *
 * Ikkalasini bitta turga birlashtirish eng oson yo'l bo'lardi va aynan
 * shu yo'l bilan bir kun begona odamga telefon raqami chiqib ketardi.
 */

export interface PublicProfile {
  /** Foydalanuvchi ID'si — xabar va qo'ng'iroq uchun kerak. */
  id: string;
  username: string;
  /** To'liq ism. Ism kiritilmagan bo'lsa `null`. */
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  isVerified: boolean;
  /** Ro'yxatdan o'tgan sana — ISO. */
  joinedAt: string;

  followerCount: number;
  followingCount: number;

  /**
   * Bu profil so'rov yuborgan odamning O'ZINIKIMI.
   *
   * Shu bayroqqa qarab "Kuzatish" o'rniga "Profilni tahrirlash"
   * ko'rsatiladi.
   */
  isOwn: boolean;
  /** So'rov yuborgan odam bu profilga obunami. */
  isFollowing: boolean;
  /**
   * So'rov yuborgan odam bu profilni BLOKLAGANMI.
   *
   * Teskarisi (meni bloklagan) bu yerda YO'Q va bo'lmasligi ham
   * kerak: uni javobga qo'shish bloklashni oshkor qilardi. Bloklagan
   * odamning profili umuman ochilmaydi.
   */
  isBlocked: boolean;
}

export interface PublicProfileResponse {
  profile: PublicProfile;
}

export interface FollowResponse {
  isFollowing: boolean;
  followerCount: number;
}

/**
 * Qidiruv natijasidagi bitta odam.
 *
 * ── Nima uchun `PublicProfile` dan kichikroq ──────────────────────────
 * Ro'yxatda o'nlab odam ko'rsatiladi. Har biri uchun obunachilar sonini
 * sanash — o'nlab qo'shimcha so'rov degani. Ro'yxatda esa bu son
 * ko'rinmaydi ham.
 *
 * Shu sababli bu yerda faqat ko'rinadigan maydonlar bor. Qolgani
 * profil ochilganda olinadi.
 */
export interface UserSearchResult {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  /** So'rov yuborgan odam bu profilga obunami. */
  isFollowing: boolean;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
}

/**
 * Qidiruv so'zini tozalaydi: " @Aziz " → "aziz".
 *
 * Odam nomni `@` bilan ham, `@` siz ham yozadi. Ikkalasi bir xil
 * natija berishi kerak — aks holda "@aziz" deb yozgan odam hech
 * kimni topa olmasdi.
 */
export function normalizeUserQuery(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Natija so'rovga qanchalik mos kelishi: kichik son — yaxshiroq.
 *
 * ── Nima uchun bazada emas ────────────────────────────────────────────
 * "Aynan mos keldi / boshida turibdi / ichida bor" degan uch bosqichli
 * tartibni SQL'da yozish mumkin, lekin u o'qib bo'lmas darajada
 * murakkab bo'lardi. Natijalar soni esa o'nlab — ularni bu yerda
 * saralash arzon.
 */
export function userMatchRank(username: string, fullName: string | null, query: string): number {
  const name = username.toLowerCase();
  const full = (fullName ?? '').toLowerCase();

  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (full.startsWith(query)) return 2;
  if (name.includes(query)) return 3;

  return 4;
}

/** `@` bilan ko'rsatish: "aziz" → "@aziz". */
export function formatUsername(username: string): string {
  return `@${username}`;
}

/**
 * Saytni qisqartirib ko'rsatadi: "https://navix.uz/blog" → "navix.uz/blog".
 *
 * Protokol olib tashlanadi, chunki u foydalanuvchiga hech narsa
 * bermaydi va qimmatli joyni egallaydi.
 */
export function formatWebsite(website: string): string {
  return website.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/**
 * Sonni qisqartiradi: 12500 → "12.5K".
 *
 * ── Nima uchun `Intl` EMAS ────────────────────────────────────────────
 * Loyihadagi barcha formatlash qo'lda: `Intl` server va brauzerda
 * boshqacha natija berib, React "hydration mismatch" xatosini
 * chiqarardi (sabab `src/lib/money.ts` da batafsil).
 */
export function formatCount(value: number): string {
  if (value < 1_000) return String(value);

  if (value < 1_000_000) {
    const thousands = value / 1_000;
    // 12.5K, lekin 13K (kasr nol bo'lsa ko'rsatilmaydi).
    const rounded = Math.floor(thousands * 10) / 10;

    return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}K`;
  }

  const millions = Math.floor((value / 1_000_000) * 10) / 10;

  return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
}
