import { describe, expect, it } from 'vitest';

import { APP_MODULES, ModuleStatus } from '@/config/modules';
import { toSearchText } from '@/lib/search';
import { comingSoonReply, findPlannedModule } from '@/modules/assistant/assistant.modules';
import { Intent, parseMessage } from '@/modules/assistant/intent';

describe('tayyor bo\'lmagan modulni topish', () => {
  it('xarita buyrug\'ini taniydi', () => {
    expect(findPlannedModule('xarita och')?.id).toBe('maps');
    expect(findPlannedModule('manzil top')?.id).toBe('maps');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Ibora so'zlarining HAMMASI bo'lishi shart. Aks holda "yubor"
   * so'zi bitta o'zi "posilka yubor" iborasiga mos kelib, oddiy pul
   * o'tkazmasi "yetkazib berish moduli tayyor emas" javobini olardi.
   */
  it('bitta umumiy so\'zga yopishmaydi', () => {
    expect(findPlannedModule('901234567 ga 50 ming yubor')).toBeNull();
  });

  it('ISHLAYOTGAN modulni "tayyor emas" demaydi', () => {
    // Ovqat, Marketplace, kuryer va taksi allaqachon ishlaydi.
    expect(findPlannedModule('ovqat buyur')).toBeNull();
    expect(findPlannedModule('mahsulot qidir')).toBeNull();
    expect(findPlannedModule('kuryer kabineti')).toBeNull();
    expect(findPlannedModule('taksi chaqir')).toBeNull();
  });

  it('bo\'sh matnda hech narsa qaytarmaydi', () => {
    expect(findPlannedModule('')).toBeNull();
  });

  it('javobda modul NOMI bor', () => {
    const maps = findPlannedModule('xarita och');

    expect(maps).not.toBeNull();
    expect(comingSoonReply(maps!)).toContain(maps!.name);
  });
});

describe('reyestr bilan bog\'liqlik', () => {
  /**
   * Ro'yxat qo'lda yozilmaydi — u `src/config/modules.ts` dan keladi.
   *
   * Bu test shuni qo'riqlaydi: modul `LIVE` bo'lgach, "tez orada"
   * javobi O'ZI yo'qolishi kerak. Ikkinchi ro'yxat yuritilsa, ular
   * ertaga bir-biriga mos kelmay qolardi.
   */
  it('har bir PLANNED modul iborasi topiladi', () => {
    const planned = APP_MODULES.filter((module) => module.status === ModuleStatus.PLANNED);

    expect(planned.length).toBeGreaterThan(0);

    for (const entry of planned) {
      const phrase = toSearchText(entry.aiIntents[0]);

      expect(findPlannedModule(phrase)?.id).toBe(entry.id);
    }
  });

  it('har bir modulda kamida bitta ibora bor', () => {
    for (const entry of APP_MODULES) {
      expect(entry.aiIntents.length).toBeGreaterThan(0);
    }
  });
});

describe('niyat sifatida COMING_SOON', () => {
  it('xarita buyrug\'i COMING_SOON beradi', () => {
    expect(parseMessage('xarita och').intent).toBe(Intent.COMING_SOON);
  });

  it('chaqiruv so\'zi bilan ham ishlaydi', () => {
    // Ovoz bilan aytilganda odam "Navix, xarita och" deydi.
    expect(parseMessage('navix xarita och').intent).toBe(Intent.COMING_SOON);
  });

  it('ishlaydigan buyruqni buzmaydi', () => {
    expect(parseMessage("navix 2 ta lag'mon buyur").intent).toBe(Intent.FOOD_ORDER);
    expect(parseMessage('navix balansim qancha').intent).toBe(Intent.BALANCE);
  });

  it('chaqiruv so\'zi qidiruv matniga tushmaydi', () => {
    // "navix" menyuda yo'q — u qidiruvga oqib ketsa, hech narsa
    // topilmasdi.
    expect(parseMessage("navix lag'mon buyur").foodQuery).not.toContain('navix');
  });
});
