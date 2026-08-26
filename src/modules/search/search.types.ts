import type { SearchGroupKey } from '@/config/search-groups';

/**
 * Yagona qidiruv — brauzer va server uchun umumiy turlar.
 *
 * ── Nima uchun har bo'lim UCHUN alohida tur emas ──────────────────────
 * Mahsulot, taom va vakansiya butunlay boshqa narsalar va ularning
 * to'liq turlari ham boshqacha.
 *
 * Lekin QIDIRUV NATIJASIDA odamga faqat to'rtta narsa kerak: bu
 * nima, qanday nomlanadi, qo'shimcha bir qator ma'lumot va uni
 * qayerdan ochish mumkin.
 *
 * Har bo'limga alohida tur yasalsa, ekranda oltita deyarli bir xil
 * komponent bo'lardi va ular vaqt o'tib bir-biridan ajralib
 * ketardi.
 */

/** Qidiruvda topilgan bitta narsa. */
export interface SearchHit {
  /** Yozuvning o'z ID'si — ro'yxat kaliti uchun. */
  id: string;
  /** Asosiy matn: mahsulot nomi, taom nomi, odamning ismi. */
  title: string;
  /**
   * Ikkinchi qator: do'kon nomi, shahar, kompaniya.
   *
   * Bo'sh bo'lishi mumkin — hamma narsada ham qo'shimcha ma'lumot
   * bo'lavermaydi.
   */
  subtitle: string | null;
  /**
   * O'ng tomondagi qisqa matn: narx, maosh, sana.
   *
   * Narx BU YERDA matn ko'rinishida keladi — server uni allaqachon
   * formatlagan bo'ladi. Aks holda brauzer oltita xil summa
   * turini bilishi kerak bo'lardi.
   */
  meta: string | null;
  /** Rasm — bor bo'lsa. */
  imageUrl: string | null;
  /** Bosilganda ochiladigan manzil. */
  href: string;
}

/** Bitta bo'lim natijasi. */
export interface SearchGroupResult {
  key: SearchGroupKey;
  hits: SearchHit[];
  /**
   * Bo'limda JAMI nechta topilgan.
   *
   * `hits.length` dan katta bo'lishi mumkin: ekranda faqat
   * dastlabki bir nechtasi ko'rsatiladi. Farqi "hammasini
   * ko'rish" havolasida ishlatiladi.
   */
  total: number;
}

export interface UnifiedSearchResponse {
  /** Tozalangan so'rov — ajratib ko'rsatish uchun. */
  query: string;
  /** Faqat natija TOPILGAN bo'limlar. */
  groups: SearchGroupResult[];
  /** Barcha bo'limlardagi natijalar yig'indisi. */
  total: number;
}
