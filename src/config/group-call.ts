/**
 * Guruh qo'ng'irog'i — yagona qoidalar manbai.
 *
 * ── ENG MUHIM QAROR: to'r (mesh), server emas ─────────────────────────
 * Guruh qo'ng'irog'ini ikki xil qurish mumkin.
 *
 * 1. TO'R (mesh) — har bir telefon boshqa HAR BIR telefon bilan
 *    to'g'ridan-to'g'ri ulanadi. Oraliqda hech qanday server yo'q.
 *
 *    Narxi: har bir telefon o'z videosini N-1 marta YUBORADI.
 *      · 3 kishi — har biri 2 marta yuboradi;
 *      · 4 kishi — 3 marta;
 *      · 5 kishi — 4 marta.
 *
 *    Video oqimi taxminan 1 Mbit/s. Ya'ni 4 kishilik suhbatda har bir
 *    telefondan 3 Mbit/s CHIQADI. O'zbekiston mobil tarmoqlarida
 *    chiqish tezligi odatda 1-5 Mbit/s — demak 4 kishi haqiqiy chegara.
 *
 * 2. SERVER (SFU) — har bir telefon oqimini BITTA serverga yuboradi,
 *    server esa uni hammaga tarqatadi. Telefon har doim bitta oqim
 *    yuboradi, nechta odam bo'lishidan qat'i nazar.
 *
 *    Narxi: alohida server kerak. U Vercel'da ISHLAMAYDI — Vercel
 *    qisqa so'rovlar uchun, uzluksiz video oqimi uchun emas. Ya'ni
 *    alohida ijaraga olingan server, oylik to'lov va uni kuzatib
 *    turadigan odam kerak.
 *
 * ── Nima uchun HOZIR to'r tanlandi ────────────────────────────────────
 * Loyihada hali daromad yo'q va foydalanuvchilar soni noma'lum. Oylik
 * to'lovli server olish — hali kelmagan muammoni hal qilish uchun pul
 * sarflash degani.
 *
 * To'r esa: qo'shimcha xarajatsiz, bugun ishlaydi va 4 kishilik
 * suhbatni bemalol ko'taradi. Oilaviy yoki kichik jamoa suhbati uchun
 * bu yetarli.
 *
 * ── QACHON serverga o'tish kerak ──────────────────────────────────────
 * Uchta belgidan biri paydo bo'lsa:
 *   · foydalanuvchilar muntazam 5+ kishilik suhbat so'rasa;
 *   · qo'ng'iroqlarning katta qismi "ulanmadi" bilan tugasa;
 *   · video sifati haqida shikoyat ko'paysa.
 *
 * O'shanda LiveKit yoki mediasoup ko'riladi. Bu kod SHUNGA TAYYOR:
 * signal yuborishda "kimga" maydoni bor, ya'ni server qo'shilganda
 * faqat yo'naltirish o'zgaradi, qolgan mantiq o'z joyida qoladi.
 */

/**
 * Video suhbatda eng ko'p ishtirokchi.
 *
 * Yuqoridagi hisobga ko'ra: 4 kishida har bir telefondan 3 Mbit/s
 * chiqadi — bu chegara. Beshinchisiga ruxsat berish suhbatni
 * hammaga buzib berardi.
 */
export const GROUP_CALL_MAX_VIDEO = 4;

/**
 * Ovozli suhbatda eng ko'p ishtirokchi.
 *
 * Ovoz oqimi videodan taxminan 25 barobar yengil (40 Kbit/s).
 * 8 kishida har bir telefondan 280 Kbit/s chiqadi — eng sekin
 * tarmoqda ham bemalol.
 */
export const GROUP_CALL_MAX_AUDIO = 8;

/** Turiga qarab chegarani beradi. */
export function maxParticipants(kind: 'AUDIO' | 'VIDEO'): number {
  return kind === 'VIDEO' ? GROUP_CALL_MAX_VIDEO : GROUP_CALL_MAX_AUDIO;
}

/**
 * Chaqiruv necha soniya chalinadi.
 *
 * ── Nima uchun ikki kishilikdan UZUNROQ ───────────────────────────────
 * Guruhda odamlar bir vaqtda emas, birin-ketin qo'shiladi. Chaqiruv
 * tez o'chsa, kechroq qaragan odam suhbatni umuman ko'rmasdi.
 */
export const GROUP_CALL_RING_SECONDS = 60;

/**
 * Ishtirokchining suhbatdagi holati.
 *
 * ── Nima uchun "chiqdi" ALOHIDA holat ─────────────────────────────────
 * Yozuvni o'chirib yuborish oson edi, lekin unda "kim qatnashgan"
 * degan savolga javob qolmasdi. Suhbat tugagach tarixda "Ali va Vali
 * qatnashdi" deb ko'rsatish kerak.
 */
export type CallParticipantStatusName = 'INVITED' | 'JOINED' | 'LEFT' | 'DECLINED';

/** Ishtirokchi hozir suhbatdami. */
export function isActiveParticipant(status: CallParticipantStatusName): boolean {
  return status === 'JOINED';
}

/** Ishtirokchi hali javob bermaganmi (telefoni chalinmoqda). */
export function isRingingParticipant(status: CallParticipantStatusName): boolean {
  return status === 'INVITED';
}

/**
 * Ekranda nechta oyna bir qatorda turadi.
 *
 * ── Nima uchun config'da ──────────────────────────────────────────────
 * Bu son ikki joyda kerak: uslubda (grid) va "yana N kishi" yozuvida.
 * Ikki joyda yozilsa, chegara o'zgarganda bittasi eskirib qolardi.
 */
export function videoGridColumns(count: number): number {
  if (count <= 1) return 1;

  return 2;
}

/** Suhbatdagi odamlar sonini o'zbekcha yozadi. */
export function participantCountText(count: number): string {
  return `${count} kishi`;
}
