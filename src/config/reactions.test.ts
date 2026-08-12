import { describe, expect, it } from 'vitest';

import { isAllowedReaction, REACTION_MAX_LENGTH, REACTIONS, reactionLabel } from '@/config/reactions';

describe('REACTIONS', () => {
  it('emojilar takrorlanmaydi', () => {
    const values = REACTIONS.map((item) => item.emoji);

    expect(new Set(values).size).toBe(values.length);
  });

  /**
   * Bazadagi ustun `VarChar(16)`.
   *
   * Uzunroq emoji qo'shilsa, reaksiya saqlanmasdan xato bilan tugardi
   * — va buni faqat foydalanuvchi topardi.
   */
  it('emoji ustun uzunligiga sig’adi', () => {
    for (const reaction of REACTIONS) {
      expect(reaction.emoji.length).toBeLessThanOrEqual(REACTION_MAX_LENGTH);
    }
  });

  /**
   * Tanlash qatori telefon ekranida BIR QATORGA sig'ishi kerak.
   *
   * Har biri 44px, 412px kenglikdagi ekranda oltitasi bemalol
   * joylashadi. Ko'proq bo'lsa, qator surilishi kerak bo'lardi va
   * "bir bosishda" degan asosiy foyda yo'qolardi.
   */
  it("oltitadan oshmaydi", () => {
    expect(REACTIONS.length).toBeLessThanOrEqual(6);
  });

  it('har birida nom bor', () => {
    for (const reaction of REACTIONS) {
      expect(reaction.label.length).toBeGreaterThan(0);
    }
  });
});

describe('isAllowedReaction', () => {
  it("ro'yxatdagini tasdiqlaydi", () => {
    expect(isAllowedReaction('👍')).toBe(true);
  });

  it('begona emoji va matnni rad etadi', () => {
    expect(isAllowedReaction('🦄')).toBe(false);
    expect(isAllowedReaction('salom')).toBe(false);
    expect(isAllowedReaction('')).toBe(false);
  });
});

describe('reactionLabel', () => {
  it("ro'yxatdagi emoji uchun nom beradi", () => {
    expect(reactionLabel('❤️')).toBe('Yoqdi');
  });

  /**
   * Bazada eski emoji qolib ketishi mumkin (ro'yxatdan olib
   * tashlangan). Shunda nishon nomsiz qolmasligi kerak.
   */
  it("noma'lum emoji uchun emojining o'zi", () => {
    expect(reactionLabel('🦄')).toBe('🦄');
  });
});
