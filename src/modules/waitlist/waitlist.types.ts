/**
 * Navbat moduli — brauzer va server uchun umumiy turlar.
 */

export interface WaitlistJoinResult {
  /** Navbatdagi o'rin: 1, 2, 3 … */
  position: number;
  /**
   * Odam allaqachon ro'yxatda edimi.
   *
   * Bu XATO emas: takroriy yozilish tabiiy holat (odam esidan
   * chiqargan). Ekranda "siz allaqachon navbatdasiz" deb yumshoq
   * aytiladi va o'sha o'rin ko'rsatiladi.
   */
  alreadyJoined: boolean;
}

export interface WaitlistStats {
  /**
   * Navbatdagi odamlar soni.
   *
   * `null` — "hozircha ko'rsatilmaydi". Sabab `src/config/waitlist.ts` da.
   */
  total: number | null;
}

/**
 * API javoblari.
 *
 * Bu endpointlar javobni o'ramaydi (`{ entry: ... }` kabi), chunki
 * qaytadigan narsa bitta va uning nomi allaqachon manzilda bor.
 */
export type WaitlistJoinResponse = WaitlistJoinResult;

export type WaitlistStatsResponse = WaitlistStats;

/** O'rinni ko'rinadigan ko'rinishga keltiradi: 7 → "7-o'rin". */
export function formatPosition(position: number): string {
  return `${position}-o'rin`;
}
