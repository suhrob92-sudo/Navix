// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DRAFT_TTL_DAYS, draftKey } from '@/config/draft';
import { clearDraft, getDraft, isDraftEmpty, saveDraft, type DraftInput } from '@/lib/post-draft';

/**
 * Post qoralamasi.
 *
 * ── Nima uchun bu sinovlar batafsil ───────────────────────────────────
 * Qoralama foydalanuvchining MEHNATI. U yo'qolsa, odam qaytadan
 * yozmaydi — voz kechadi.
 *
 * Shu bilan birga u telefon xotirasida turadi va uni QO'LDA
 * o'zgartirish mumkin. Ya'ni kod ikki tomondan ham ishonchli
 * bo'lishi kerak: yo'qotmasligi va buzilgan qiymatdan yiqilmasligi.
 */

const USER = 'user-1';
const OTHER = 'user-2';

const EMPTY: DraftInput = {
  body: '',
  imageUrl: null,
  video: null,
  attachments: [],
  cta: null,
  category: null,
  place: null,
  isSponsored: false,
};

function withBody(body: string): DraftInput {
  return { ...EMPTY, body };
}

/** Har sinovdan oldin xotira tozalanadi. */
beforeEach(() => {
  window.localStorage.clear();
  clearDraft(USER);
  clearDraft(OTHER);
  vi.useRealTimers();
});

describe('isDraftEmpty', () => {
  it('hech narsa yozilmagan qoralama BO\'SH', () => {
    expect(isDraftEmpty(EMPTY)).toBe(true);
  });

  it('faqat bo\'sh joy ham BO\'SH hisoblanadi', () => {
    /*
      Odam tasodifan probel bosishi mumkin. Uni "qoralama" deb
      saqlasak, keyingi safar "qoralama tiklandi" degan yozuv
      chiqardi — hech narsa tiklanmagan holda.
    */
    expect(isDraftEmpty(withBody('   \n  '))).toBe(true);
  });

  it('matn bo\'lsa BO\'SH emas', () => {
    expect(isDraftEmpty(withBody('Salom'))).toBe(false);
  });

  it('matnsiz RASM ham qoralama', () => {
    // "Mana shu manzara" degan postga matn shart emas.
    expect(isDraftEmpty({ ...EMPTY, imageUrl: '/img.webp' })).toBe(false);
  });

  it('faqat BO\'LIM tanlangani ham qoralama', () => {
    /*
      Odam bo'lim tanlab, keyin yozishga tayyorlanayotgan bo'lishi
      mumkin. Uni yo'qotish ham mehnatni yo'qotish.
    */
    expect(isDraftEmpty({ ...EMPTY, category: 'RESTAURANTS' })).toBe(false);
  });
});

describe('saqlash va o\'qish', () => {
  it('saqlangan qoralama qaytib keladi', () => {
    saveDraft(USER, withBody('Yarim yozilgan post'));

    expect(getDraft(USER)?.body).toBe('Yarim yozilgan post');
  });

  it('bo\'sh qoralama SAQLANMAYDI', () => {
    saveDraft(USER, withBody('Matn'));
    saveDraft(USER, EMPTY);

    expect(getDraft(USER)).toBeNull();
  });

  it('o\'chirilgach yo\'qoladi', () => {
    saveDraft(USER, withBody('Matn'));
    clearDraft(USER);

    expect(getDraft(USER)).toBeNull();
  });

  it('BOSHQA odamning qoralamasi ko\'rinmaydi', () => {
    /*
      Bu shunchaki noqulaylik emas — bitta telefonni ikki kishi
      ishlatganda (oila, do'kon) birinchisining yozayotgan matni
      ikkinchisiga ochilardi.
    */
    saveDraft(USER, withBody('Shaxsiy matn'));

    expect(getDraft(OTHER)).toBeNull();
  });

  it('biriktirma va chaqiruv ham saqlanadi', () => {
    saveDraft(USER, {
      ...EMPTY,
      body: 'Video',
      attachments: [{ kind: 'PRODUCT', targetId: 'p1', name: 'Krossovka', subtitle: '780 000' }],
      cta: { kind: 'TELEGRAM', value: 'navix_uz' },
      place: { name: 'Toshkent', latitude: 41.3, longitude: 69.2 },
      isSponsored: true,
    });

    const draft = getDraft(USER);

    expect(draft?.attachments[0]?.name).toBe('Krossovka');
    expect(draft?.cta?.value).toBe('navix_uz');
    expect(draft?.place?.name).toBe('Toshkent');
    expect(draft?.isSponsored).toBe(true);
  });

  it('YUKLANGAN video ham saqlanadi', () => {
    /*
      Video eng qimmat narsa: uni qayta yuklash mobil internetda
      bir necha daqiqa va real pul.
    */
    saveDraft(USER, {
      ...EMPTY,
      body: 'Video post',
      video: { url: '/v.mp4', posterUrl: '/p.webp', seconds: 12, trim: { start: 1, end: 9 } },
    });

    expect(getDraft(USER)?.video?.trim).toEqual({ start: 1, end: 9 });
  });
});

describe('buzilgan qiymatdan himoya', () => {
  it('noto\'g\'ri JSON e\'tiborsiz qoldiriladi', () => {
    /*
      `localStorage` ni brauzer konsoli orqali qo'lda o'zgartirish
      mumkin. Tekshirmasdan o'qisak, oyna yiqilardi va odam post
      yoza olmay qolardi.
    */
    window.localStorage.setItem(draftKey(USER), '{buzilgan');
    clearDraft(USER);
    window.localStorage.setItem(draftKey(USER), '{buzilgan');

    expect(getDraft(USER)).toBeNull();
  });

  it('sxemaga mos kelmagan qiymat rad etiladi', () => {
    window.localStorage.setItem(draftKey(USER), JSON.stringify({ body: 42 }));
    clearDraft(USER);
    window.localStorage.setItem(draftKey(USER), JSON.stringify({ body: 42 }));

    expect(getDraft(USER)).toBeNull();
  });

  it('buzilgan qoralama XOTIRADAN ham o\'chiriladi', () => {
    /*
      Qoldirilsa, har ochilganda qayta o'qilib qayta rad etilardi —
      foydasiz ish abadiy takrorlanardi.
    */
    window.localStorage.setItem(draftKey(USER), '{buzilgan');
    clearDraft(USER);
    window.localStorage.setItem(draftKey(USER), '{buzilgan');

    getDraft(USER);

    expect(window.localStorage.getItem(draftKey(USER))).toBeNull();
  });

  it('ro\'yxatda yo\'q bo\'lim rad etiladi', () => {
    const bad = JSON.stringify({ ...EMPTY, body: 'x', category: 'KOSMOS', savedAt: Date.now() });

    window.localStorage.setItem(draftKey(USER), bad);
    clearDraft(USER);
    window.localStorage.setItem(draftKey(USER), bad);

    expect(getDraft(USER)).toBeNull();
  });
});

describe('muddat', () => {
  it(`${DRAFT_TTL_DAYS} kundan eski qoralama o'chadi`, () => {
    /*
      Muddatsiz qoralama abadiy qoladi. Bir oy oldin tashlab
      ketilgan matn birdan qalqib chiqsa, odam "bu qayerdan
      keldi?" deb hayron bo'lardi.
    */
    const old = JSON.stringify({
      ...EMPTY,
      body: 'Eski matn',
      savedAt: Date.now() - (DRAFT_TTL_DAYS + 1) * 24 * 60 * 60 * 1000,
    });

    window.localStorage.setItem(draftKey(USER), old);
    clearDraft(USER);
    window.localStorage.setItem(draftKey(USER), old);

    expect(getDraft(USER)).toBeNull();
  });

  it('muddati o\'tmagan qoralama qoladi', () => {
    const fresh = JSON.stringify({
      ...EMPTY,
      body: 'Kechagi matn',
      savedAt: Date.now() - 24 * 60 * 60 * 1000,
    });

    window.localStorage.setItem(draftKey(USER), fresh);
    clearDraft(USER);
    window.localStorage.setItem(draftKey(USER), fresh);

    expect(getDraft(USER)?.body).toBe('Kechagi matn');
  });
});
