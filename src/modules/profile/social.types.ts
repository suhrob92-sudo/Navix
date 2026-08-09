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
}

export interface PublicProfileResponse {
  profile: PublicProfile;
}

export interface FollowResponse {
  isFollowing: boolean;
  followerCount: number;
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
