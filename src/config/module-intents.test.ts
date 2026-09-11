import { describe, expect, it } from 'vitest';

import { APP_MODULES, matchModuleByIntent, ModuleStatus } from '@/config/modules';

/**
 * Yordamchi modullarni TOPA olishi kerak.
 *
 * ── HAQIQIY XATO: APOSTROF hamma narsani buzardi ──────────────────────
 * `matchModuleByIntent` oddiy `toLowerCase()` ishlatardi va ibora
 * AYNAN mos kelishi kerak edi. Reyestrda esa iboralar apostrof
 * bilan yozilgan: "kommunal to'la", "pul o'tkaz", "parolni
 * o'zgartir".
 *
 * Telefon klaviaturasida apostrof qulay emas va odam uni yozmaydi.
 * Natijada reyestrning katta qismi JIM o'chiq turardi: tekshirilgan
 * sakkizta iboradan SAKKIZTASI apostrofsiz ishlamasdi.
 *
 * Xato ko'rinmasdi — yordamchi shunchaki "tushunmadim" derdi va
 * buni hech kim xato deb o'ylamasdi.
 */
describe('modul iboralari apostrofga bogliq emas', () => {
  /** Reyestrdagi HAR BIR ibora — apostrofsiz ham ishlashi shart. */
  for (const entry of APP_MODULES) {
    for (const intent of entry.aiIntents) {
      /* Apostrofning barcha ko'rinishlarini olib tashlaymiz. */
      const plain = intent.replace(/['\u2018\u2019\u02BB\u02BC`]/gu, '');

      if (plain === intent) continue;

      it(`${entry.id}: "${intent}" ~ "${plain}"`, () => {
        expect(matchModuleByIntent(plain)?.id).toBe(matchModuleByIntent(intent)?.id);
      });
    }
  }
});

/**
 * Odam yozadigan tabiiy iboralar modulga borishi kerak.
 *
 * ── Nima uchun bu ro'yxat ─────────────────────────────────────────────
 * Modul qurilgan, lekin yordamchi uni tanimasa — u odam uchun
 * YO'Q. Bu holat ilovada uch marta takrorlandi (posilka, moliya,
 * hamkorlik) va har safar faqat o'lchov orqali topildi.
 */
describe('tabiiy iboralar modulga boradi', () => {
  const CASES: [string, string][] = [
    ['mehmonxona', 'hotel'],
    ['xona kerak', 'hotel'],
    ['bandlovlarim', 'hotel'],
    ['chipta olaman', 'travel'],
    ['sayohat', 'travel'],
    ['ish qidiryapman', 'jobs'],
    ['vakansiyalar', 'jobs'],
    ['arizalarim', 'jobs'],
    ['xabarlarim', 'chat'],
    ['suhbatlarim', 'chat'],
    ['hamyonim', 'wallet'],
    ['qurilmalarim', 'security'],
    ['parolni ozgartir', 'security'],
  ];

  for (const [text, moduleId] of CASES) {
    it(`"${text}" -> ${moduleId}`, () => {
      const found = matchModuleByIntent(text);

      expect(found?.id, `"${text}" hech qaysi modulga bormadi`).toBe(moduleId);
      /* Tayyor bo'lmagan modulga yuborish foydasiz. */
      expect(found?.status).toBe(ModuleStatus.LIVE);
    });
  }
});
