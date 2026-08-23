import { describe, expect, it } from 'vitest';

import {
  cleanGroupInviteCode,
  GROUP_INVITE_ALPHABET,
  GROUP_INVITE_CODE_LENGTH,
  GROUP_INVITE_PATH,
  GROUP_INVITE_WARNING,
  groupInviteLink,
  groupInviteShareText,
  isGroupInviteCode,
} from '@/config/group-invite';
import { REFERRAL_CODE_LENGTH } from '@/config/referral';

/**
 * Guruh havolasi — testlar.
 */

describe('kod shakli', () => {
  it('taklif kodidan UZUNROQ', () => {
    /**
     * Taklif kodi og'zaki aytiladi, guruh havolasi esa faqat
     * bosiladi. Ya'ni qisqalik shart emas, xavfsizlik esa muhimroq.
     */
    expect(GROUP_INVITE_CODE_LENGTH).toBeGreaterThan(REFERRAL_CODE_LENGTH);
  });

  it('kombinatsiyalar soni taxmin qilib bo\'lmaydigan darajada', () => {
    const combinations = GROUP_INVITE_ALPHABET.length ** GROUP_INVITE_CODE_LENGTH;

    // Trillionlab — birma-bir sinash amalda imkonsiz.
    expect(combinations).toBeGreaterThan(1e12);
  });

  it("to'g'ri kod qabul qilinadi", () => {
    const code = GROUP_INVITE_ALPHABET.slice(0, GROUP_INVITE_CODE_LENGTH);

    expect(isGroupInviteCode(code)).toBe(true);
  });

  it('uzunligi boshqa kod rad etiladi', () => {
    expect(isGroupInviteCode('ABC')).toBe(false);
    expect(isGroupInviteCode(GROUP_INVITE_ALPHABET.slice(0, GROUP_INVITE_CODE_LENGTH + 1))).toBe(false);
  });

  it('alifboda yo\'q belgi rad etiladi', () => {
    // Kichik harf, chalkash belgilar va bo'shliq.
    expect(isGroupInviteCode('abcdefghjk')).toBe(false);
    expect(isGroupInviteCode('ACDEFGHJK0')).toBe(false);
    expect(isGroupInviteCode('ACDEFGHJ K')).toBe(false);
  });

  it("bo'sh qiymat rad etiladi", () => {
    expect(isGroupInviteCode('')).toBe(false);
  });
});

describe('havola', () => {
  it("to'liq manzil yasaydi", () => {
    expect(groupInviteLink('https://navix.uz', 'ACDEFGHJKM')).toBe('https://navix.uz/g/ACDEFGHJKM');
  });

  it("oxiridagi chiziq ikkilanmaydi", () => {
    expect(groupInviteLink('https://navix.uz/', 'ACDEFGHJKM')).toBe('https://navix.uz/g/ACDEFGHJKM');
  });

  it("yo'l config bilan mos", () => {
    expect(groupInviteLink('https://navix.uz', 'ACDEFGHJKM')).toContain(GROUP_INVITE_PATH);
  });
});

describe('kodni tozalash', () => {
  it("to'liq havoladan kodni ajratadi", () => {
    expect(cleanGroupInviteCode('https://navix.uz/g/ACDEFGHJKM')).toBe('ACDEFGHJKM');
  });

  it("so'rov qismini tashlab yuboradi", () => {
    expect(cleanGroupInviteCode('https://navix.uz/g/ACDEFGHJKM?from=telegram')).toBe('ACDEFGHJKM');
  });

  it("kichik harfni kattaga aylantiradi", () => {
    expect(cleanGroupInviteCode('acdefghjkm')).toBe('ACDEFGHJKM');
  });

  it("bo'shliqlarni olib tashlaydi", () => {
    expect(cleanGroupInviteCode('  ACDEFGHJKM  ')).toBe('ACDEFGHJKM');
  });
});

describe('ulashish matni', () => {
  it('guruh nomi va havolani o\'z ichiga oladi', () => {
    const text = groupInviteShareText('Ish jamoasi', 'https://navix.uz/g/ACDEFGHJKM');

    expect(text).toContain('Ish jamoasi');
    expect(text).toContain('https://navix.uz/g/ACDEFGHJKM');
  });

  it("egri qo'shtirnoq ishlatilmaydi", () => {
    const text = groupInviteShareText('Oila', 'https://navix.uz/g/ACDEFGHJKM');

    expect(/[\u2018\u2019\u201c\u201d]/.test(text)).toBe(false);
  });
});

describe('ogohlantirish', () => {
  it("chiqarilgan odam qaytishi mumkinligini AYTADI", () => {
    /**
     * Bu havolaning eng katta xavfi va u ko'zga tashlanmaydi.
     * Matn o'zgartirilsa ham, bu ma'no qolishi shart.
     */
    expect(GROUP_INVITE_WARNING).toContain('chiqarilgan');
    expect(GROUP_INVITE_WARNING).toContain('yangilang');
  });
});
