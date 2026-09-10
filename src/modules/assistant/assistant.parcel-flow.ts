import { formatUzDateTime } from '@/lib/date';
import { DELIVERY_STATUS_LABELS } from '@/modules/courier/courier.types';
import { formatWeight } from '@/modules/parcel/parcel.types';
import { listParcels } from '@/modules/parcel/parcel.service';
import type { AssistantReply } from '@/modules/assistant/assistant.types';

/**
 * "Navix, posilka yubor" — yordamchining posilka oqimi.
 *
 * ── Nima uchun yordamchi posilkani O'ZI to'ldirmaydi ──────────────────
 * Taksi buyurtmasida ikkita narsa kerak: qayerdan va qayerga.
 * Posilkada esa SAKKIZTA: ikkita viloyat, ikkita aniq manzil,
 * qabul qiluvchining ismi va telefoni, ichida nima borligi va
 * og'irligi.
 *
 * Ularni suhbatda birma-bir so'rash — sakkizta savol-javob. Odam
 * uchinchisida charchaydi va formani o'zi to'ldirgani yaxshiroq
 * bo'lardi. Ustiga, qabul qiluvchining telefon raqamini OG'ZAKI
 * aytish xato ehtimolini oshiradi va noto'g'ri raqam posilkani
 * yo'qotadi.
 *
 * Shuning uchun yordamchi bu yerda ROSTGO'Y: u formani ochadi va
 * nima kerakligini oldindan aytadi.
 *
 * ── Nima uchun HOLAT esa aytiladi ─────────────────────────────────────
 * "Posilkam qayerda?" — bu bitta savol va uning javobi ham bitta.
 * Buni aytish uchun ekran ochish shart emas.
 */

/**
 * Posilka jo'natish — FORMANI ochadi.
 *
 * Hech qanday jo'natma yaratilmaydi: yordamchi pul harakatlanadigan
 * amalni o'zi bajarmaydi. Bu butun ilovadagi qoida.
 */
export function handleSendParcel(): AssistantReply {
  return {
    text:
      "Posilka jo'natish formasini ochaman. Tayyorlab qo'ying: " +
      'qayerdan va qayerga, qabul qiluvchining ismi va telefoni, ' +
      "ichida nima borligi va taxminiy og'irligi.",
    suggestions: ['Posilkam qayerda', 'Balansim qancha'],
    action: { kind: 'navigate', href: '/delivery', label: "Posilka jo'natish" },
    state: { slots: {} },
  };
}

/**
 * Oxirgi jo'natmaning holati.
 *
 * ── Nima uchun faqat BITTASI ──────────────────────────────────────────
 * Odam "posilkam qayerda" deb so'raganda deyarli har doim ENG
 * OXIRGISINI nazarda tutadi. Uchtasini sanab chiqish ovozli javobda
 * uzun bo'lardi va odam oxirigacha eshitmasdi — qolganlari ekranda.
 */
export async function handleParcelStatus(userId: string): Promise<AssistantReply> {
  const { parcels, total } = await listParcels(userId, {
    page: 1,
    pageSize: 1,
    status: 'ALL',
    order: 'desc',
  });

  const latest = parcels[0];

  if (!latest) {
    return {
      text: "Hali jo'natma yo'q. Posilka jo'natishni xohlaysizmi?",
      suggestions: ['Posilka yubor'],
      action: { kind: 'navigate', href: '/delivery', label: "Posilka jo'natish" },
      state: { slots: {} },
    };
  }

  const route = `${latest.fromRegion} — ${latest.toRegion}`;
  const label = DELIVERY_STATUS_LABELS[latest.status];

  /*
    Kuryerning ismi FAQAT u tayinlangandan keyin aytiladi.

    Oldin aytishga hech narsa yo'q, keyin esa odam "kim olib
    ketdi?" degan savolga javob oladi.
  */
  const courier = latest.courier?.name ? ` Kuryer: ${latest.courier.name}.` : '';

  const finishedAt =
    latest.deliveredAt !== null
      ? ` ${formatUzDateTime(latest.deliveredAt)} da yetkazildi.`
      : latest.cancelledAt !== null
        ? ` ${formatUzDateTime(latest.cancelledAt)} da bekor qilingan.`
        : '';

  /*
    Nechta jo'natma borligi FAQAT bittadan ko'p bo'lganda aytiladi.

    "Jami 1 ta jo'natma" degan jumla hech narsa qo'shmaydi.
  */
  const rest = total > 1 ? ` Jami ${total} ta jo'natmangiz bor.` : '';

  return {
    text:
      `${route} yo'nalishidagi posilkangiz (${latest.description}, ` +
      `${formatWeight(latest.weightGrams)}) — ${label}.${courier}${finishedAt}${rest}`,
    suggestions: total > 1 ? ['Posilka yubor', 'Balansim qancha'] : ['Posilka yubor'],
    action: { kind: 'navigate', href: `/delivery/${latest.id}`, label: "Jo'natmani ochish" },
    state: { slots: {} },
  };
}
