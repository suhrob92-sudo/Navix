import { describe, expect, it } from 'vitest';

import { APP_NAV, PROFILE_MENU, isNavItemActive } from '@/config/app-nav';

/**
 * Pastki panel — ilovaning eng ko'p ko'riladigan qismi.
 *
 * ── Nima uchun bu sinov kerak ─────────────────────────────────────────
 * Bu yerda xatolik "yiqilmaydi": sahifa ochiladi, hamma narsa
 * ishlaydi, faqat NOTO'G'RI bo'lim yonib turadi. Odam esa qayerda
 * ekanini yo'qotadi.
 *
 * Bunday xatoni ko'z bilan sezish qiyin — ayniqsa yangi sahifa
 * qo'shilganda.
 */
describe('isNavItemActive', () => {
  const feed = APP_NAV.find((item) => item.href === '/feed')!;
  const home = APP_NAV.find((item) => item.href === '/dashboard')!;

  it("bo'limning O'Z sahifasi yonadi", () => {
    expect(isNavItemActive('/feed', feed)).toBe(true);
  });

  it("bo'limning ICHKI sahifasi ham yonadi", () => {
    /*
      Odam `/feed/saved` da turganda ham "Feed" yonishi kerak —
      u hali ham Feed bo'limida.
    */
    expect(isNavItemActive('/feed/saved', feed)).toBe(true);
    expect(isNavItemActive('/feed/stats/growth', feed)).toBe(true);
  });

  it('boshqa bo\'lim yonmaydi', () => {
    expect(isNavItemActive('/profile', feed)).toBe(false);
  });

  it('NOMI O\'XSHASH manzil yonmaydi', () => {
    /*
      Bu eng nozik holat: `/feedback` `/feed` bilan boshlanadi.
      Oddiy `startsWith` ishlatilsa, "Feedback" sahifasida "Feed"
      bo'limi yonib turardi.

      Shuning uchun tekshiruvda ajratuvchi chiziq bor: `/feed/`.
    */
    expect(isNavItemActive('/feedback', feed)).toBe(false);
    expect(isNavItemActive('/feed-settings', feed)).toBe(false);
  });

  it('`exact` bo\'limda faqat AYNAN o\'zi yonadi', () => {
    /*
      Bosh sahifa `exact`: `/dashboard/xyz` degan sahifa bo'lsa,
      u boshqa narsa va bosh sahifa yonmasligi kerak.
    */
    expect(isNavItemActive('/dashboard', home)).toBe(true);
    expect(isNavItemActive('/dashboard/reports', home)).toBe(false);
  });
});

describe('APP_NAV', () => {
  it('beshta bo\'lim — barmoq uchun qulay chegara', () => {
    /*
      Oltinchi bo'lim qo'shilsa, telefonning tor ekranida har biriga
      65px dan kam joy qolardi — bu barmoq nishonining chegarasidan
      past (`config/touch.ts`).
    */
    expect(APP_NAV.length).toBe(5);
  });

  it('manzillar takrorlanmaydi', () => {
    // Ikkita bir xil manzil ikkala bo'limni birga yondirardi.
    expect(new Set(APP_NAV.map((item) => item.href)).size).toBe(APP_NAV.length);
  });

  it('AYNAN BITTA markaziy tugma bor', () => {
    /*
      Markaziy tugma boshqacha chiziladi (katta, doira). Ikkitasi
      bo'lsa maket buzilardi, bittasi ham bo'lmasa — AI tugmasi
      yo'qolardi.
    */
    expect(APP_NAV.filter((item) => item.isCenter).length).toBe(1);
  });

  it('har bir bo\'limda yozuv va belgi bor', () => {
    for (const item of APP_NAV) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.icon).toBeTruthy();
      expect(item.href.startsWith('/')).toBe(true);
    }
  });
});

describe('PROFILE_MENU', () => {
  it('manzillar takrorlanmaydi', () => {
    expect(new Set(PROFILE_MENU.map((item) => item.href)).size).toBe(PROFILE_MENU.length);
  });

  it('har bir qatorda yozuv va izoh bor', () => {
    /*
      Izohsiz qator odamni "bu nima?" deb bosishga majbur qiladi.
      Menyuning maqsadi esa aksincha — kerakligini bosmasdan
      topish.
    */
    for (const item of PROFILE_MENU) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('pastki paneldagi bo\'limlar menyuda TAKRORLANMAYDI', () => {
    /*
      Bir narsa ikki joyda turmasligi kerak: odam "Feed" ni
      panelda ham, menyuda ham ko'rsa, ular boshqa-boshqa narsa
      deb o'ylardi.
    */
    const navHrefs = new Set(APP_NAV.map((item) => item.href));
    const repeated = PROFILE_MENU.filter((item) => navHrefs.has(item.href));

    expect(repeated).toEqual([]);
  });
});
