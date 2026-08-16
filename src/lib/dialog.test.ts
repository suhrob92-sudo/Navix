import { describe, expect, it, vi } from 'vitest';

import { dialogCancelHandler } from '@/lib/dialog';

/**
 * Bu sinov AYNIQSA muhim.
 *
 * Foydalanuvchi topgan xato: post yozish oynasida "Video" bosilib,
 * telefon galereyasi ochilgach "Bekor" bosilsa — butun oyna yopilib,
 * yozib qo'yilgan hamma narsa yo'qolardi.
 *
 * Sababi `<input type="file">` ning `cancel` hodisasi yuqoriga
 * ko'tarilishi edi. Bir qarashda bu ko'rinmaydi, shuning uchun
 * xato qaytib kelishi juda oson.
 */
describe('dialogCancelHandler', () => {
  /** Hodisa o'rniga eng kichik soxta obyekt — DOM kerak emas. */
  function event(target: unknown, currentTarget: unknown) {
    return { target, currentTarget } as never;
  }

  it('oynaning O\'ZIDAN kelgan bekor qilishda yopadi', () => {
    const close = vi.fn();
    const dialog = { id: 'dialog' };

    dialogCancelHandler(close)(event(dialog, dialog));

    // Escape bosilgan holat — oyna yopilishi kerak.
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('ICHKARIDAN ko\'tarilgan bekor qilishni e\'tiborsiz qoldiradi', () => {
    const close = vi.fn();
    const dialog = { id: 'dialog' };
    const fileInput = { id: 'input' };

    dialogCancelHandler(close)(event(fileInput, dialog));

    // Fayl tanlash bekor qilingan holat — oyna OCHIQ qolishi kerak.
    expect(close).not.toHaveBeenCalled();
  });

  it('har chaqiruvda yangi ishlovchi qaytaradi', () => {
    const close = vi.fn();

    expect(dialogCancelHandler(close)).not.toBe(dialogCancelHandler(close));
  });
});
