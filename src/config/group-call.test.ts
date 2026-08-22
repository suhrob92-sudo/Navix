import { describe, expect, it } from 'vitest';

import {
  GROUP_CALL_MAX_AUDIO,
  GROUP_CALL_MAX_VIDEO,
  GROUP_CALL_RING_SECONDS,
  isActiveParticipant,
  isRingingParticipant,
  maxParticipants,
  participantCountText,
  videoGridColumns,
  type CallParticipantStatusName,
} from '@/config/group-call';

/**
 * Guruh qo'ng'irog'i qoidalari — testlar.
 *
 * Chegaralar bu yerda ATAYLAB qulflangan: ular tarmoq hisobidan kelib
 * chiqqan (`config/group-call.ts` dagi izohga qarang). Kimdir "5 kishi
 * ham bo'laversin" deb o'zgartirsa, test tushadi va u sababni o'qishga
 * majbur bo'ladi.
 */

describe('chegaralar', () => {
  it('video chegarasi 4 kishi', () => {
    /**
     * 4 kishida har bir telefondan 3 Mbit/s chiqadi. O'zbekiston
     * mobil tarmoqlarida chiqish tezligi odatda 1-5 Mbit/s.
     */
    expect(GROUP_CALL_MAX_VIDEO).toBe(4);
  });

  it('ovoz chegarasi videodan KATTA', () => {
    // Ovoz oqimi videodan taxminan 25 barobar yengil.
    expect(GROUP_CALL_MAX_AUDIO).toBeGreaterThan(GROUP_CALL_MAX_VIDEO);
  });

  it('turiga qarab chegara beriladi', () => {
    expect(maxParticipants('VIDEO')).toBe(GROUP_CALL_MAX_VIDEO);
    expect(maxParticipants('AUDIO')).toBe(GROUP_CALL_MAX_AUDIO);
  });

  it("chaqiruv ikki kishilikdan UZOQROQ chalinadi", () => {
    // Guruhda odamlar birin-ketin qo'shiladi.
    expect(GROUP_CALL_RING_SECONDS).toBeGreaterThanOrEqual(45);
  });
});

describe('ishtirokchi holati', () => {
  it("faqat 'JOINED' suhbatda hisoblanadi", () => {
    const statuses: CallParticipantStatusName[] = ['INVITED', 'JOINED', 'LEFT', 'DECLINED'];

    expect(statuses.filter(isActiveParticipant)).toEqual(['JOINED']);
  });

  it("faqat 'INVITED' chalinayotgan hisoblanadi", () => {
    const statuses: CallParticipantStatusName[] = ['INVITED', 'JOINED', 'LEFT', 'DECLINED'];

    expect(statuses.filter(isRingingParticipant)).toEqual(['INVITED']);
  });

  it("chiqib ketgan odam suhbatda emas", () => {
    /**
     * Muhim: chiqqan odam ro'yxatda QOLADI (tarix uchun), lekin
     * "suhbatda" hisoblanmaydi — aks holda u bilan ulanish ochilardi.
     */
    expect(isActiveParticipant('LEFT')).toBe(false);
    expect(isActiveParticipant('DECLINED')).toBe(false);
  });
});

describe('ekran joylashuvi', () => {
  it('bitta odam butun ekranni egallaydi', () => {
    expect(videoGridColumns(1)).toBe(1);
  });

  it("ko'p odamda ikki ustun", () => {
    // Uch ustunda telefon ekranida yuzni ajratib bo'lmasdi.
    expect(videoGridColumns(2)).toBe(2);
    expect(videoGridColumns(3)).toBe(2);
    expect(videoGridColumns(4)).toBe(2);
  });
});

describe('matnlar', () => {
  it("odamlar soni ko'plik qo'shimchasisiz yoziladi", () => {
    expect(participantCountText(1)).toBe('1 kishi');
    expect(participantCountText(4)).toBe('4 kishi');
  });
});
