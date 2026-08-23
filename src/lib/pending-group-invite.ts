'use client';

import { cleanGroupInviteCode, isGroupInviteCode } from '@/config/group-invite';

/**
 * Guruh havolasini kirishgacha SAQLAB turish.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Odam guruh havolasini ochadi (`/g/ABCDEFGHJK`), lekin hisobi yo'q.
 * U ro'yxatdan o'tadi, SMS kodini kutadi, profilini to'ldiradi — va
 * bularning barchasi manzildagi kodni yo'qotadi.
 *
 * Natijada u ro'yxatdan o'tib bo'lib, qaysi guruhga chaqirilganini
 * unutadi. Havolani esa qayta topishi kerak — ko'pincha topmaydi.
 *
 * ── Nima uchun taklif kodidan ALOHIDA ─────────────────────────────────
 * Ikkalasi bir vaqtda bo'lishi mumkin: odam do'stining taklif
 * havolasi orqali kelib, keyin guruh havolasini ochishi mumkin.
 * Bitta kalitda saqlansa, ikkinchisi birinchisini o'chirib
 * yuborardi.
 */

const PENDING_KEY = 'navix.group-invite.pending';

/** Kodni saqlaydi. Noto'g'ri kod SAQLANMAYDI. */
export function rememberGroupInvite(code: string): void {
  const clean = cleanGroupInviteCode(code);

  if (!isGroupInviteCode(clean)) return;

  try {
    window.localStorage.setItem(PENDING_KEY, clean);
  } catch {
    /*
      Xotira yopiq (shaxsiy rejim).

      Odam guruhga o'zi qaytishi kerak bo'ladi, lekin ro'yxatdan
      o'tish avvalgidek davom etadi.
    */
  }
}

/** Saqlangan kodni qaytaradi (bo'lsa). */
export function readPendingGroupInvite(): string | null {
  try {
    const stored = window.localStorage.getItem(PENDING_KEY);

    if (!stored) return null;

    /**
     * O'qiyotganda ham TEKSHIRILADI.
     *
     * Qiymatni brauzer konsolidan qo'lda o'zgartirish mumkin —
     * ishonchsiz qiymat serverga yuborilmasligi kerak.
     */
    return isGroupInviteCode(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Kodni o'chiradi — guruhga qo'shilgandan keyin chaqiriladi. */
export function clearPendingGroupInvite(): void {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // Xotira yopiq — o'chiradigan narsa ham yo'q.
  }
}
