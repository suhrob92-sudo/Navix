import { describe, expect, it } from 'vitest';

import { SPEECH_LANGUAGES, isUsableTranscript, speechErrorMessage, stripWakeWord } from '@/lib/voice';

describe('chaqiruv so\'zini kesish', () => {
  it('gap boshidagi "navix" ni olib tashlaydi', () => {
    expect(stripWakeWord('navix taksi chaqir')).toBe('taksi chaqir');
  });

  it('kirish so\'zi bilan birga kesadi', () => {
    expect(stripWakeWord('hey navix balansim qancha')).toBe('balansim qancha');
    expect(stripWakeWord('ok navix, ovqat buyur')).toBe('ovqat buyur');
  });

  it('tanigich noto\'g\'ri yozgan variantlarni ham biladi', () => {
    // "Navix" — lotincha bo'lmagan so'z, tanigich uni turlicha yozadi.
    expect(stripWakeWord('naviks lagmon buyur')).toBe('lagmon buyur');
    expect(stripWakeWord('navigs balansim')).toBe('balansim');
  });

  it('chaqiruvdan keyingi tinish belgilarini tozalaydi', () => {
    expect(stripWakeWord('navix, balansim')).toBe('balansim');
    expect(stripWakeWord('navix — ovqat')).toBe('ovqat');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Kesish faqat BOSHIDAN bo'ladi. Aks holda "navix haqida nima
   * bilasan" degan savol "haqida nima bilasan" ga aylanib, ma'nosini
   * yo'qotardi.
   */
  it('gap o\'rtasidagi so\'zga tegmaydi', () => {
    expect(stripWakeWord('menga navix haqida ayt')).toBe('menga navix haqida ayt');
  });

  it('so\'zning bir qismini kesmaydi', () => {
    // "navixda" — boshqa so'z, uni "da" ga aylantirib bo'lmaydi.
    expect(stripWakeWord('navixda ovqat bormi')).toBe('navixda ovqat bormi');
  });

  it('chaqiruvsiz matnni o\'zgartirmaydi', () => {
    expect(stripWakeWord("lag'mon buyur")).toBe("lag'mon buyur");
  });

  it('chaqiruv yo\'q bo\'lsa kirish so\'ziga tegmaydi', () => {
    // "ok" bu yerda javob, chaqiruv emas.
    expect(stripWakeWord("ok, gazga to'la")).toBe("ok, gazga to'la");
  });

  it('faqat chaqiruvdan iborat matnda bo\'sh qaytaradi', () => {
    // Bo'sh matn "tushunmadim" javobini beradi — bu to'g'ri.
    expect(stripWakeWord('navix')).toBe('');
  });
});

describe('tanilgan matnga ishonch', () => {
  it('juda qisqa matnni rad etadi', () => {
    // Shovqin ko'pincha bir-ikki harf bo'lib keladi.
    expect(isUsableTranscript('a', 0.9)).toBe(false);
    expect(isUsableTranscript('  ', null)).toBe(false);
  });

  it('qisqa, lekin haqiqiy buyruqni qabul qiladi', () => {
    expect(isUsableTranscript('chek', 0.8)).toBe(true);
  });

  it('past ishonchli natijani rad etadi', () => {
    expect(isUsableTranscript('balansim qancha', 0.2)).toBe(false);
  });

  it('ishonch berilmasa matnning o\'ziga qaraydi', () => {
    // Ba'zi brauzerlar `confidence` bermaydi — bu xato emas.
    expect(isUsableTranscript('balansim qancha', null)).toBe(true);
  });
});

describe('tillar ro\'yxati', () => {
  it('o\'zbek tili BIRINCHI o\'rinda', () => {
    expect(SPEECH_LANGUAGES[0]).toBe('uz-UZ');
  });

  it('zaxira tillar bor', () => {
    // uz-UZ hamma qurilmada yo'q — ro'yxat bitta tildan iborat
    // bo'lsa, ovoz o'sha qurilmalarda umuman ishlamasdi.
    expect(SPEECH_LANGUAGES.length).toBeGreaterThan(1);
  });
});

describe('mikrofon xatolari', () => {
  it('har bir xato uchun o\'zbekcha matn bor', () => {
    for (const code of ['not-allowed', 'no-speech', 'audio-capture', 'network', 'language-not-supported']) {
      expect(speechErrorMessage(code).length).toBeGreaterThan(10);
    }
  });

  it('noma\'lum xatoda ham foydali gap aytadi', () => {
    const message = speechErrorMessage('something-new');

    expect(message).toContain('matn');
  });
});
