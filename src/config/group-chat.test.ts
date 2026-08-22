import { describe, expect, it } from 'vitest';

import {
  canDo,
  canRemoveMember,
  GROUP_ADD_BATCH_MAX,
  GROUP_MAX_MEMBERS,
  GROUP_MIN_MEMBERS,
  GROUP_TITLE_MAX,
  GROUP_TITLE_MIN,
  groupRoleLabel,
  memberCountText,
  systemMessageText,
  type GroupRoleName,
} from '@/config/group-chat';

/**
 * Guruh qoidalari — testlar.
 *
 * Bu yerdagi har bir tekshiruv haqiqiy xatoning oldini oladi: huquqlar
 * jadvalidagi bitta xato butun guruhni begona odam qo'liga berib
 * qo'yishi mumkin.
 */

describe('chegaralar', () => {
  it('nom uzunligi mantiqiy', () => {
    expect(GROUP_TITLE_MIN).toBeGreaterThan(0);
    expect(GROUP_TITLE_MAX).toBeGreaterThan(GROUP_TITLE_MIN);
  });

  it("bir so'rovdagi qo'shish chegarasi umumiy chegaradan oshmaydi", () => {
    expect(GROUP_ADD_BATCH_MAX).toBeLessThanOrEqual(GROUP_MAX_MEMBERS);
  });

  it("guruh kamida ikki kishilik", () => {
    expect(GROUP_MIN_MEMBERS).toBe(2);
    expect(GROUP_MAX_MEMBERS).toBeGreaterThan(GROUP_MIN_MEMBERS);
  });
});

describe('huquqlar', () => {
  it('ega hamma narsani qila oladi', () => {
    expect(canDo('OWNER', 'EDIT_INFO')).toBe(true);
    expect(canDo('OWNER', 'ADD_MEMBER')).toBe(true);
    expect(canDo('OWNER', 'REMOVE_MEMBER')).toBe(true);
    expect(canDo('OWNER', 'MANAGE_ADMIN')).toBe(true);
  });

  it('administrator daraja bera OLMAYDI', () => {
    expect(canDo('ADMIN', 'EDIT_INFO')).toBe(true);
    expect(canDo('ADMIN', 'ADD_MEMBER')).toBe(true);
    expect(canDo('ADMIN', 'REMOVE_MEMBER')).toBe(true);
    // Eng muhim tekshiruv: aks holda admin o'ziga teng odam yasab olardi.
    expect(canDo('ADMIN', 'MANAGE_ADMIN')).toBe(false);
  });

  it('oddiy a\'zo hech narsani boshqara olmaydi', () => {
    expect(canDo('MEMBER', 'EDIT_INFO')).toBe(false);
    expect(canDo('MEMBER', 'ADD_MEMBER')).toBe(false);
    expect(canDo('MEMBER', 'REMOVE_MEMBER')).toBe(false);
    expect(canDo('MEMBER', 'MANAGE_ADMIN')).toBe(false);
  });
});

describe('chiqarish qoidasi', () => {
  it('EGANI hech kim chiqara olmaydi', () => {
    const roles: GroupRoleName[] = ['OWNER', 'ADMIN', 'MEMBER'];

    for (const actor of roles) {
      expect(canRemoveMember(actor, 'OWNER')).toBe(false);
    }
  });

  it('ega administratorni ham, oddiy a\'zoni ham chiqaradi', () => {
    expect(canRemoveMember('OWNER', 'ADMIN')).toBe(true);
    expect(canRemoveMember('OWNER', 'MEMBER')).toBe(true);
  });

  it('administrator faqat oddiy a\'zoni chiqaradi', () => {
    expect(canRemoveMember('ADMIN', 'MEMBER')).toBe(true);
    // Ikki administrator bir-birini chiqarishga urinadigan poyga bo'lmasin.
    expect(canRemoveMember('ADMIN', 'ADMIN')).toBe(false);
  });

  it('oddiy a\'zo hech kimni chiqara olmaydi', () => {
    expect(canRemoveMember('MEMBER', 'MEMBER')).toBe(false);
    expect(canRemoveMember('MEMBER', 'ADMIN')).toBe(false);
  });
});

describe('hodisa matnlari', () => {
  it('barcha turlar uchun matn bor va bo\'sh emas', () => {
    const kinds = [
      'GROUP_CREATED',
      'MEMBER_ADDED',
      'MEMBER_REMOVED',
      'MEMBER_LEFT',
      'TITLE_CHANGED',
      'IMAGE_CHANGED',
      'ADMIN_GRANTED',
      'ADMIN_REVOKED',
      'OWNER_CHANGED',
    ] as const;

    for (const kind of kinds) {
      const text = systemMessageText(kind, 'Ali', 'Vali');

      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain('undefined');
    }
  });

  it("o'zbekcha qo'shimcha ismga YOPISHIB yoziladi", () => {
    // "Vali ni" emas, "Valini" — bo'sh joy grammatik xato bo'lardi.
    expect(systemMessageText('MEMBER_ADDED', 'Ali', 'Vali')).toBe("Ali Valini qo'shdi");
    expect(systemMessageText('MEMBER_REMOVED', 'Ali', 'Vali')).toBe('Ali Valini chiqardi');
    expect(systemMessageText('ADMIN_REVOKED', 'Ali', 'Vali')).toBe('Ali Validan administratorlikni oldi');
  });

  it("ko'p odam qo'shilganda son yoziladi", () => {
    expect(systemMessageText('MEMBER_ADDED', 'Ali', '3 kishi')).toBe("Ali 3 kishini qo'shdi");
  });

  it("guruhdan chiqishda ikkinchi ism KERAK EMAS", () => {
    expect(systemMessageText('MEMBER_LEFT', 'Ali')).toBe('Ali guruhdan chiqdi');
    expect(systemMessageText('GROUP_CREATED', 'Ali')).toBe('Ali guruhni yaratdi');
  });

  it("egri qo'shtirnoq ishlatilmaydi", () => {
    const text = systemMessageText('TITLE_CHANGED', 'Ali', 'Oila');

    expect(text).toContain('«Oila»');
    // Belgilar kod bilan yozilgan: faylning o'zi ham toza qolishi kerak.
    expect(/[\u2018\u2019\u201c\u201d]/.test(text)).toBe(false);
  });
});

describe('ko\'rinadigan matnlar', () => {
  it('daraja nomlari tarjima qilingan', () => {
    expect(groupRoleLabel('OWNER')).toBe('Ega');
    expect(groupRoleLabel('ADMIN')).toBe('Administrator');
    expect(groupRoleLabel('MEMBER')).toBe("A'zo");
  });

  it("a'zolar soni ko'plik qo'shimchasisiz yoziladi", () => {
    // O'zbek tilida "5 a'zolar" xato.
    expect(memberCountText(1)).toBe("1 a'zo");
    expect(memberCountText(5)).toBe("5 a'zo");
  });
});
