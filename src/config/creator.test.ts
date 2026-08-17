import { describe, expect, it } from 'vitest';

import {
  COLLAB_NOTE_MAX_LENGTH,
  CREATOR_LINK_FIELD,
  CREATOR_LINK_KINDS,
  MAX_PINNED_POSTS,
  creatorLinkConfig,
} from '@/config/creator';
import { POST_CTA_KINDS, ctaHref } from '@/config/post-cta';

/**
 * Ijodkor profili — sozlamalar.
 *
 * Bu faylning asosiy vazifasi — chaqiruv (CTA) ta'riflari bilan
 * ajralib ketmaslik. Ular ajralsa, videodagi tugma ishlab, profildagi
 * havola buzilardi.
 */
describe('CREATOR_LINK_KINDS', () => {
  it('har bir tur CHAQIRUV ro\'yxatida ham bor', () => {
    /*
      Eng muhim sinov. Ijodkor havolalari chaqiruv ta'riflaridan
      foydalanadi. Ro'yxatga chaqiruvda yo'q tur qo'shilsa, ekran
      chizishda yiqilardi.
    */
    for (const kind of CREATOR_LINK_KINDS) {
      expect((POST_CTA_KINDS as readonly string[]).includes(kind)).toBe(true);
    }
  });

  it('har bir turda ta\'rif topiladi', () => {
    for (const kind of CREATOR_LINK_KINDS) {
      const config = creatorLinkConfig(kind);

      expect(config).toBeDefined();
      expect(config.label.length).toBeGreaterThan(0);
      expect(config.icon).toBeDefined();
    }
  });

  it('har bir turda BAZA ustuni ko\'rsatilgan', () => {
    for (const kind of CREATOR_LINK_KINDS) {
      expect(CREATOR_LINK_FIELD[kind]).toBeTruthy();
    }

    // Ustunlar takrorlanmasligi kerak — aks holda ikki tur bir joyga yozilardi.
    const fields = CREATOR_LINK_KINDS.map((kind) => CREATOR_LINK_FIELD[kind]);

    expect(new Set(fields).size).toBe(fields.length);
  });

  it('har bir turda ISHLAYDIGAN manzil yasaladi', () => {
    for (const kind of CREATOR_LINK_KINDS) {
      const href = ctaHref(kind, 'navix');

      expect(href).toBeTruthy();
      expect(href?.startsWith('https://')).toBe(true);
    }
  });

  it('TELEFON va OBUNA profil havolalarida YO\'Q', () => {
    /*
      Telefon profilda ochiq turishi kerak emas — u videoga
      qo'yiladigan ataylab qaror. Obuna esa profilning o'zida
      alohida tugma sifatida turadi.
    */
    expect((CREATOR_LINK_KINDS as readonly string[]).includes('PHONE')).toBe(false);
    expect((CREATOR_LINK_KINDS as readonly string[]).includes('FOLLOW')).toBe(false);
    expect((CREATOR_LINK_KINDS as readonly string[]).includes('MESSAGE')).toBe(false);
  });
});

describe('MAX_PINNED_POSTS', () => {
  it('chegara bor va u kichik', () => {
    /*
      Chegarasiz bo'lsa, ijodkor hamma postini mahkamlab qo'yardi va
      mahkamlash ma'nosini butunlay yo'qotardi.
    */
    expect(MAX_PINNED_POSTS).toBeGreaterThan(0);
    expect(MAX_PINNED_POSTS).toBeLessThanOrEqual(5);
  });
});

describe('COLLAB_NOTE_MAX_LENGTH', () => {
  it('izoh qisqa qoladi', () => {
    // U profilda bitta qatorda turadi.
    expect(COLLAB_NOTE_MAX_LENGTH).toBeLessThanOrEqual(300);
  });
});
