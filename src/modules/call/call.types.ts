import { CALL_STATUS_LABELS } from '@/config/calls';

/**
 * Qo'ng'iroq moduli — brauzer va server uchun umumiy turlar.
 */

import type { CallParticipantStatusName } from '@/config/group-call';

export type CallKindName = 'AUDIO' | 'VIDEO';

export type CallStatusName = 'RINGING' | 'ACTIVE' | 'DECLINED' | 'MISSED' | 'ENDED' | 'FAILED';

/** Qo'ng'iroqdagi ikkinchi tomon. */
export interface CallPeer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  username: string;
}

/** Guruh qo'ng'irog'idagi bitta ishtirokchi. */
export interface CallParticipantView extends CallPeer {
  status: CallParticipantStatusName;
  /** Suhbatga qo'shilgan payt — ISO. Hali qo'shilmagan bo'lsa `null`. */
  joinedAt: string | null;
  /** Bu MENMI. */
  isMe: boolean;
}

export interface CallView {
  id: string;
  conversationId: string;
  kind: CallKindName;
  status: CallStatusName;
  /** Qo'ng'iroqni MEN boshladimmi. */
  isOutgoing: boolean;
  /**
   * Guruh qo'ng'irog'imi.
   *
   * Rost bo'lsa `peer` — bu GURUHNING o'zi (nomi va rasmi), aniq odam
   * emas. Odamlar `participants` ro'yxatida turadi.
   */
  isGroup: boolean;
  /**
   * Ikkinchi tomon: ikki kishilik suhbatda — odam, guruhda — guruh.
   *
   * ── Nima uchun guruhda ham TO'LDIRILADI ─────────────────────────────
   * Chaqiruv ekrani, bildirishnoma va tarix bir xil uchta narsani
   * so'raydi: nom, rasm va ID. Guruh uchun ham xuddi shu uchtasi bor.
   * Maydonni bo'sh qoldirish har bir joyda "bu guruhmi?" degan
   * shartni takrorlashga majbur qilardi.
   */
  peer: CallPeer;
  /**
   * Guruhdagi ishtirokchilar. Ikki kishilik qo'ng'iroqda BO'SH.
   *
   * Ro'yxatda chiqib ketganlar ham qoladi — suhbat tugagach "kim
   * qatnashdi" degan savolga javob kerak.
   */
  participants: CallParticipantView[];
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
}

/**
 * Ulanish serverlari ro'yxati — brauzerning `RTCPeerConnection` iga
 * shundayligicha beriladi.
 */
export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * Signalizatsiya xabari — ikki brauzer bir-biriga yuboradigan ma'lumot.
 *
 * ── Nima uchun uch xil ────────────────────────────────────────────────
 * `offer`     — chaqiruvchi: "men mana bunday gaplashaman";
 * `answer`    — qabul qiluvchi: "men esa mana bunday";
 * `candidate` — "meni mana bu manzillar orqali topsang bo'ladi".
 *
 * Server bu xabarlarning MAZMUNIGA umuman aralashmaydi — u faqat
 * yetkazib beradi.
 */
export type CallSignalType = 'offer' | 'answer' | 'candidate';

export interface CallSignal {
  type: CallSignalType;
  /** Ulanish tavsifi (`offer` va `answer` uchun). */
  sdp?: string;
  /** Tarmoq manzili (`candidate` uchun). */
  candidate?: unknown;
  /**
   * Signal KIMDAN kelgani.
   *
   * ── Nima uchun guruhda ZARUR ────────────────────────────────────────
   * Ikki kishilik suhbatda bu savol tug'ilmaydi: kim yuborgan bo'lsa,
   * u ikkinchi tomon.
   *
   * Guruhda esa har bir telefon boshqa HAR BIR telefon bilan alohida
   * ulanadi (izohi `config/group-call.ts` da). Ya'ni bir vaqtda uchta
   * turli ulanish muzokarasi ketadi va signal qaysi ulanishga
   * tegishli ekanini bilish shart. Aks holda birovning javobi
   * boshqasining ulanishiga berilib, hech biri ishlamasdi.
   */
  from?: string;
}

/**
 * Jonli oqimdan keladigan hodisa.
 *
 * `ring`   — sizga qo'ng'iroq qilishmoqda;
 * `state`  — qo'ng'iroq holati o'zgardi (javob berildi, tugadi...);
 * `signal` — ulanish uchun texnik ma'lumot.
 */
export type CallEvent =
  | { kind: 'ring'; call: CallView }
  | { kind: 'state'; call: CallView }
  | { kind: 'signal'; callId: string; signal: CallSignal };

export interface StartCallResponse {
  call: CallView;
  iceServers: IceServerConfig[];
}

export interface CallResponse {
  call: CallView;
}

export interface IceServersResponse {
  iceServers: IceServerConfig[];
}

// ── Ko'rinadigan matnlar ──────────────────────────────────────────────

/** Qo'ng'iroq holatining o'zbekcha nomi. */
export function callStatusText(status: CallStatusName): string {
  return CALL_STATUS_LABELS[status];
}

/**
 * Suhbat davomiyligini `4:07` yoki `1:02:33` ko'rinishida yozadi.
 *
 * ── Nima uchun `Intl` ishlatilmaydi ───────────────────────────────────
 * Loyihada barcha formatlash ATAYLAB qo'lda yoziladi: `Intl` natijasi
 * qurilma sozlamasiga qarab o'zgaradi va server bilan brauzer har xil
 * matn chizib qo'yishi mumkin.
 */
export function formatCallDuration(totalSeconds: number): string {
  const safe = totalSeconds > 0 ? Math.floor(totalSeconds) : 0;

  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const pad = (value: number): string => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/**
 * Qo'ng'iroq tarixidagi bir satrlik izoh.
 *
 * Suhbat oynasida qo'ng'iroq ham xabar kabi ko'rinadi, shuning uchun
 * uning matni bir qarashda tushunarli bo'lishi kerak.
 */
export function callSummaryText(call: Pick<CallView, 'status' | 'isOutgoing' | 'durationSeconds'>): string {
  if (call.status === 'ENDED') {
    return `${call.isOutgoing ? 'Chiquvchi' : 'Kiruvchi'} qo'ng'iroq · ${formatCallDuration(call.durationSeconds)}`;
  }

  if (call.status === 'MISSED') {
    return call.isOutgoing ? 'Javob berilmadi' : "Javobsiz qo'ng'iroq";
  }

  if (call.status === 'DECLINED') {
    return call.isOutgoing ? 'Rad etildi' : 'Siz rad etdingiz';
  }

  return callStatusText(call.status);
}

/**
 * Qo'ng'iroq tugaganmi.
 *
 * Bir joyda jamlangan: holatlar ro'yxati o'zgarsa, uni faqat shu yerda
 * tuzatish kerak bo'ladi.
 */
export function isCallOver(status: CallStatusName): boolean {
  return status === 'ENDED' || status === 'DECLINED' || status === 'MISSED' || status === 'FAILED';
}
