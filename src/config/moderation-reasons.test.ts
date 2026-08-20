import { describe, expect, it } from 'vitest';

import {
  CONTENT_REMOVAL_REASONS,
  CONTENT_REMOVAL_REASON_CONFIG,
  MODERATED_CONTENT_KINDS,
  MODERATED_CONTENT_LABELS,
  REMOVAL_NOTE_MAX_LENGTH,
  REMOVAL_NOTE_MIN_LENGTH,
  isContentRemovalReason,
  removalNoticeText,
} from '@/config/moderation-reasons';

/**
 * Olib tashlash sabablari — bu matnlar MUALLIFGA ko'rinadi.
 *
 * Ular ilovaning eng nozik joyi: odam o'z mehnati olib tashlanganini
 * shu jumlalardan o'qiydi. Yomon yozilgan sabab norozilikni
 * kuchaytiradi, yaxshi yozilgani esa xatoni tuzatishga o'rgatadi.
 */
describe('CONTENT_REMOVAL_REASON_CONFIG', () => {
  it('HAR BIR sabab uchun ta\'rif bor', () => {
    for (const reason of CONTENT_REMOVAL_REASONS) {
      expect(CONTENT_REMOVAL_REASON_CONFIG[reason]).toBeDefined();
    }
  });

  it('yorliq va izoh bo\'sh emas', () => {
    for (const reason of CONTENT_REMOVAL_REASONS) {
      const config = CONTENT_REMOVAL_REASON_CONFIG[reason];

      expect(config.label.trim().length).toBeGreaterThan(0);
      expect(config.notice.trim().length).toBeGreaterThan(0);
    }
  });

  it('muallif uchun izoh yorliqdan UZUNROQ', () => {
    /*
      Yorliqning o'zi ayblovga o'xshaydi ("Spam") va nima qilish
      kerakligini aytmaydi. Izoh esa qoidani tushuntirishi kerak —
      ya'ni u albatta uzunroq jumla bo'ladi.
    */
    for (const reason of CONTENT_REMOVAL_REASONS) {
      const config = CONTENT_REMOVAL_REASON_CONFIG[reason];

      expect(config.notice.length).toBeGreaterThan(config.label.length);
    }
  });

  it('yorliqlar takrorlanmaydi', () => {
    // Ikkita bir xil yorliq moderatorni chalg'itardi.
    const unique = new Set(CONTENT_REMOVAL_REASONS.map((r) => CONTENT_REMOVAL_REASON_CONFIG[r].label));

    expect(unique.size).toBe(CONTENT_REMOVAL_REASONS.length);
  });

  it('faqat "Boshqa sabab" izoh talab qiladi', () => {
    /*
      Har bir sababga izoh majburiy qilinsa, moderator "spam" deb
      yozib qo'yardi — ya'ni izoh ma'nosini yo'qotardi.

      "Boshqa sabab" esa izohsiz hech narsa tushuntirmaydi.
    */
    for (const reason of CONTENT_REMOVAL_REASONS) {
      expect(CONTENT_REMOVAL_REASON_CONFIG[reason].needsNote).toBe(reason === 'OTHER');
    }
  });
});

describe('MODERATED_CONTENT_LABELS', () => {
  it('HAR BIR tur uchun nom bor', () => {
    /*
      Nomsiz tur bildirishnomada "undefined olib tashlandi" bo'lib
      chiqardi — va bu aynan eng yomon paytda ko'rinardi.
    */
    for (const kind of MODERATED_CONTENT_KINDS) {
      expect(MODERATED_CONTENT_LABELS[kind]).toBeTruthy();
    }
  });
});

describe('isContentRemovalReason', () => {
  it('ro\'yxatdagini qabul, boshqasini rad etadi', () => {
    expect(isContentRemovalReason('SPAM')).toBe(true);
    expect(isContentRemovalReason('BOSHQA_NARSA')).toBe(false);
    expect(isContentRemovalReason('spam')).toBe(false);
  });
});

describe('removalNoticeText', () => {
  it('izohsiz — faqat qoida matni', () => {
    expect(removalNoticeText('SPAM', null)).toBe(CONTENT_REMOVAL_REASON_CONFIG.SPAM.notice);
  });

  it('izoh qoidadan KEYIN qo\'shiladi', () => {
    /*
      Tartib muhim: avval umumiy qoida, keyin aynan shu holatga
      tegishli gap. Teskarisida odam izohni qoidaning o'zi deb
      o'ylardi.
    */
    const text = removalNoticeText('OTHER', 'Rasmda begona logotip bor.');

    expect(text.startsWith(CONTENT_REMOVAL_REASON_CONFIG.OTHER.notice)).toBe(true);
    expect(text.endsWith('Rasmda begona logotip bor.')).toBe(true);
  });
});

describe('izoh chegaralari', () => {
  it('eng kam va eng ko\'p oqilona', () => {
    /*
      Eng kam chegara bo'lmasa "ok" degan izoh o'tardi; eng ko'p
      chegara bo'lmasa muallif ekranida o'qilmaydigan devor
      paydo bo'lardi.
    */
    expect(REMOVAL_NOTE_MIN_LENGTH).toBeGreaterThan(0);
    expect(REMOVAL_NOTE_MAX_LENGTH).toBeGreaterThan(REMOVAL_NOTE_MIN_LENGTH);
    expect(REMOVAL_NOTE_MAX_LENGTH).toBeLessThanOrEqual(200);
  });
});
