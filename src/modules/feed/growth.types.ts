import type { AnalyticsPeriod } from '@/config/analytics';

/**
 * Ijodkorning o'sish ko'rsatkichlari — brauzer va server uchun umumiy.
 */

/** Bitta ko'rsatkich: shu davr, oldingi davr va farq. */
export interface GrowthMetric {
  /** Tanlangan davrdagi son. */
  current: number;
  /** Undan OLDINGI xuddi shunday uzunlikdagi davrdagi son. */
  previous: number;
  /**
   * Farq foizda.
   *
   * `null` — oldingi davrda nol bo'lgan. Bunday holatda foiz
   * hisoblab bo'lmaydi (izohi `config/analytics.ts` da).
   */
  changePercent: number | null;
}

/** Diagrammadagi bitta kun. */
export interface GrowthDay {
  /** `2026-08-21` — Toshkent kuni. */
  date: string;
  followers: number;
  likes: number;
}

export interface CreatorGrowth {
  days: AnalyticsPeriod;
  /** Hozirgi jami obunachilar — o'sish emas, HOLAT. */
  followerTotal: number;
  followers: GrowthMetric;
  likes: GrowthMetric;
  comments: GrowthMetric;
  posts: GrowthMetric;
  /** Kunlik ustunchalar — eng eskisidan bugungiga. */
  daily: GrowthDay[];
}
