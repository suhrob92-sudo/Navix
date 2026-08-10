/**
 * Push bildirishnomalar — brauzer va server uchun umumiy turlar.
 */

/** Brauzer obuna bo'lganda beradigan ma'lumot. */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  /** Qurilma nomi — odam ro'yxatda taniy olishi uchun. */
  deviceLabel: string;
}

/**
 * Telefonda ko'rinadigan xabar.
 *
 * ── Nima uchun `tag` bor ──────────────────────────────────────────────
 * Bir xil `tag` li xabar oldingisini ALMASHTIRADI. Bitta suhbatdan
 * o'nta xabar kelsa, ekranda o'nta bildirishnoma emas, bittasi —
 * eng oxirgisi turadi.
 *
 * ── Nima uchun `ttlSeconds` bor ───────────────────────────────────────
 * Telefon o'chiq bo'lsa, push xizmati xabarni saqlab turadi. Lekin
 * qo'ng'iroq chaqirig'ini yarim soatdan keyin yetkazishning ma'nosi
 * yo'q — u allaqachon tugagan. Shuning uchun qo'ng'iroq uchun muddat
 * qisqa beriladi.
 */
export interface PushPayload {
  title: string;
  body: string;
  /** Bosilganda ochiladigan sahifa. */
  url: string;
  tag: string;
  /** Xabar shuncha soniyagacha saqlanadi. */
  ttlSeconds?: number;
}

export interface PushDeviceView {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface PushStatusResponse {
  /** Serverda push sozlanganmi (VAPID kalitlari bor). */
  isAvailable: boolean;
  /** Brauzerga beriladigan ochiq kalit. */
  publicKey: string | null;
  /**
   * AYNAN shu brauzerning obunasi serverda bormi.
   *
   * ── Nima uchun alohida bayroq ───────────────────────────────────────
   * Brauzerda obuna bor-yo'qligi yetarli emas: ikkalasi ajralib
   * qolishi mumkin. Masalan xabar yetkazilmagach server yaroqsiz
   * obunani o'chiradi, brauzerda esa u qolaveradi.
   *
   * Unda sozlamalarda "yoqilgan" deb turardi-yu, xabar kelmasdi.
   */
  isSubscribed: boolean;
  devices: PushDeviceView[];
}
