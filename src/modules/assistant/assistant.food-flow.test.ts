import { describe, expect, it } from 'vitest';

import { estimateMinutesLeft } from '@/modules/assistant/assistant.food-flow';

describe('estimateMinutesLeft', () => {
  const created = new Date('2026-08-04T10:00:00.000Z');

  it('qolgan vaqtni hisoblaydi', () => {
    // 45 daqiqalik yetkazishdan 15 daqiqa o'tdi → 30 daqiqa qoldi.
    expect(estimateMinutesLeft(created, 45, new Date('2026-08-04T10:15:00.000Z'))).toBe(30);
  });

  it('endi berilgan buyurtmada to\'liq vaqtni qaytaradi', () => {
    expect(estimateMinutesLeft(created, 45, created)).toBe(45);
  });

  /**
   * Muddat o'tib ketganda "0 daqiqa qoldi" deb yozish — yolg'on.
   * Bunday holatda yordamchi boshqa matn ko'rsatishi kerak, shuning
   * uchun `null` qaytadi.
   */
  it('muddat o\'tib ketgan bo\'lsa null qaytaradi', () => {
    expect(estimateMinutesLeft(created, 45, new Date('2026-08-04T10:45:00.000Z'))).toBeNull();
    expect(estimateMinutesLeft(created, 45, new Date('2026-08-04T11:30:00.000Z'))).toBeNull();
  });
});
