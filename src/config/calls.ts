/**
 * Qo'ng'iroq sozlamalari.
 *
 * ── Qo'ng'iroq QANDAY ishlaydi (qisqacha) ─────────────────────────────
 * Ovoz SERVERDAN o'tmaydi. Ikki telefon bir-biriga to'g'ridan-to'g'ri
 * ulanadi — bu WebRTC deb ataladi. Server faqat "tanishtiruvchi"
 * vazifasini bajaradi: ikki tomon bir-biriga o'z manzilini va sozlamasini
 * yuboradi (bu "signalizatsiya" deyiladi).
 *
 * Foydasi katta: ovoz trafigi bizning serverimizdan o'tmaydi, ya'ni
 * xarajat ham, kechikish ham eng kam bo'ladi.
 */

/**
 * STUN serverlari — telefonning TASHQI manzilini aniqlaydi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Telefon o'zining haqiqiy internetdagi manzilini bilmaydi: u uy yoki
 * mobil tarmoq ichida, "yashirin" manzilda turadi. STUN server unga
 * "sen tashqaridan mana bunday ko'rinasan" deb aytadi.
 *
 * Google'ning ochiq STUN serverlari BEPUL va cheklovsiz. Ular faqat
 * bir-ikki kichik so'rovga javob beradi — ovoz ular orqali o'tmaydi.
 */
export const STUN_SERVERS = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] as const;

/**
 * Video sifati.
 *
 * ── Nima uchun ATAYLAB past ───────────────────────────────────────────
 * Brauzer so'ralmasa eng yuqori sifatni tanlaydi — telefonlarda bu
 * ko'pincha 1280×720 yoki undan ham katta. O'zbekistondagi mobil
 * tarmoqda bunday oqim uzluksiz o'tmaydi: rasm muzlaydi, ovoz
 * uziladi va trafik tez tugaydi.
 *
 * 640×480 telefon ekrani uchun yetarli — suhbatdoshning yuzi aniq
 * ko'rinadi. Sekundiga 24 kadr esa harakatni silliq ko'rsatadi.
 *
 * `ideal` — QAT'IY talab emas: kamera bunday rejimni qo'llab-
 * quvvatlamasa, brauzer eng yaqinini tanlaydi va qo'ng'iroq baribir
 * ishlaydi.
 */
export const VIDEO_CONSTRAINTS = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { max: 24 },
} as const;

/**
 * Javob kutish muddati.
 *
 * 45 soniya — odam telefonni cho'ntagidan olib, ekranga qarashi uchun
 * yetarli. Undan uzog'i esa chaqiruvchini bekorga kuttiradi.
 */
export const RING_TIMEOUT_SECONDS = 45;

/**
 * Bitta qo'ng'iroqning eng uzun davomiyligi (soniyalarda).
 *
 * ── Nima uchun cheklov bor ────────────────────────────────────────────
 * Brauzer yopilib qolsa yoki ulanish uzilsa, qo'ng'iroq bazada
 * "ketmoqda" holatida qolib ketishi mumkin. Unda odam boshqa hech kimga
 * qo'ng'iroq qila olmasdi ("band" deb turaverardi).
 *
 * Shu sababli bu muddatdan oshgan qo'ng'iroq keyingi so'rovda avtomatik
 * yopiladi.
 */
export const MAX_CALL_SECONDS = 4 * 60 * 60;

/**
 * "Men hali gaplashyapman" belgisining umri.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Faqat yuqoridagi 4 soatlik chegara bo'lsa, brauzeri to'satdan
 * yopilgan odam TO'RT SOAT davomida "band" bo'lib turardi: unga hech
 * kim qo'ng'iroq qila olmasdi, o'zi ham qila olmasdi.
 *
 * Shuning uchun gaplashayotgan tomon vaqti-vaqti bilan "men bormanni"
 * bildiradi. Belgi so'nsa — demak brauzer yopilgan va qo'ng'iroq
 * yopiladi.
 */
export const CALL_ALIVE_TTL_SECONDS = 60;

/** Belgi shuncha oraliqda yangilanadi (umridan ancha qisqa). */
export const CALL_ALIVE_PING_MS = 20_000;

/**
 * Signalizatsiya xabarlari Redis'da shuncha yashaydi.
 *
 * Qisqa: bu xabarlar faqat ulanish o'rnatilguncha kerak. Keyin ular
 * qiymatini yo'qotadi va saqlanishi shart emas.
 */
export const SIGNAL_TTL_SECONDS = 120;

/** Bitta navbatda saqlanadigan eng ko'p signal — cheksiz o'sib ketmasligi uchun. */
export const SIGNAL_QUEUE_LIMIT = 200;

/** Qo'ng'iroq holatlarining ko'rinadigan nomlari. */
export const CALL_STATUS_LABELS = {
  RINGING: 'Chalinmoqda',
  ACTIVE: 'Suhbat ketmoqda',
  DECLINED: 'Rad etildi',
  MISSED: 'Javob berilmadi',
  ENDED: 'Tugadi',
  FAILED: "Ulanib bo'lmadi",
} as const;
