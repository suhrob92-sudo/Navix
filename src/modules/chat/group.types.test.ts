import { describe, expect, it } from 'vitest';

import { GROUP_MAX_MEMBERS, GROUP_TITLE_MAX } from '@/config/group-chat';
import { groupStatusText, typingText } from '@/modules/chat/chat.types';
import {
  addMembersSchema,
  createGroupSchema,
  setMemberAdminSchema,
  updateGroupSchema,
} from '@/modules/chat/group.schemas';

/**
 * Guruh so'rovlari va matnlari — testlar.
 */

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

describe('createGroupSchema', () => {
  it("to'g'ri so'rovni qabul qiladi", () => {
    const parsed = createGroupSchema.parse({ title: 'Oila', memberIds: [ID_A] });

    expect(parsed.title).toBe('Oila');
    expect(parsed.memberIds).toEqual([ID_A]);
  });

  it("nom atrofidagi bo'sh joy kesiladi", () => {
    // Telefon klaviaturasi so'zdan keyin avtomatik probel qo'shadi.
    expect(createGroupSchema.parse({ title: '  Oila  ', memberIds: [ID_A] }).title).toBe('Oila');
  });

  it("faqat probeldan iborat nom RAD etiladi", () => {
    expect(createGroupSchema.safeParse({ title: '   ', memberIds: [ID_A] }).success).toBe(false);
  });

  it('juda uzun nom rad etiladi', () => {
    const long = 'a'.repeat(GROUP_TITLE_MAX + 1);

    expect(createGroupSchema.safeParse({ title: long, memberIds: [ID_A] }).success).toBe(false);
  });

  it("a'zosiz guruh yaratib bo'lmaydi", () => {
    expect(createGroupSchema.safeParse({ title: 'Oila', memberIds: [] }).success).toBe(false);
  });

  it("chegaradan ortiq odam rad etiladi", () => {
    const many = Array.from({ length: GROUP_MAX_MEMBERS }, () => ID_A);

    expect(createGroupSchema.safeParse({ title: 'Oila', memberIds: many }).success).toBe(false);
  });

  it("ID o'rniga boshqa matn rad etiladi", () => {
    expect(createGroupSchema.safeParse({ title: 'Oila', memberIds: ['salom'] }).success).toBe(false);
  });

  it('BEGONA rasm manzili rad etiladi', () => {
    // Tashqi manzil guruh a'zolarining IP manzilini oshkor qilardi.
    const result = createGroupSchema.safeParse({
      title: 'Oila',
      memberIds: [ID_A],
      imageUrl: 'https://example.com/a.jpg',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateGroupSchema', () => {
  it("bo'sh so'rov rad etiladi", () => {
    expect(updateGroupSchema.safeParse({}).success).toBe(false);
  });

  it('faqat nomni yuborish mumkin', () => {
    expect(updateGroupSchema.safeParse({ title: 'Yangi nom' }).success).toBe(true);
  });

  it("rasmni OLIB TASHLASH uchun null yuboriladi", () => {
    const parsed = updateGroupSchema.parse({ imageUrl: null });

    // `null` — "olib tashla", maydonning yo'qligi esa "tegma".
    expect(parsed.imageUrl).toBeNull();
    expect(parsed.title).toBeUndefined();
  });
});

describe('addMembersSchema', () => {
  it("bo'sh ro'yxat rad etiladi", () => {
    expect(addMembersSchema.safeParse({ memberIds: [] }).success).toBe(false);
  });

  it("bir nechta ID qabul qilinadi", () => {
    expect(addMembersSchema.parse({ memberIds: [ID_A, ID_B] }).memberIds).toHaveLength(2);
  });
});

describe('setMemberAdminSchema', () => {
  it('faqat mantiqiy qiymat qabul qiladi', () => {
    expect(setMemberAdminSchema.parse({ isAdmin: true }).isAdmin).toBe(true);
    expect(setMemberAdminSchema.safeParse({ isAdmin: 'ha' }).success).toBe(false);
  });

  it("so'rovda daraja YUBORIB bo'lmaydi", () => {
    // Aks holda "egalikni o'zimga o'tkazish" yo'li ochilardi.
    const parsed = setMemberAdminSchema.parse({ isAdmin: true, role: 'OWNER' });

    expect('role' in parsed).toBe(false);
  });
});

describe('typingText', () => {
  it("hech kim yozmasa bo'sh satr", () => {
    expect(typingText([])).toBe('');
  });

  it('bitta odamning ismi yoziladi', () => {
    expect(typingText(['Ali'])).toBe('Ali yozmoqda...');
  });

  it('ikkita ism "va" bilan birlashadi', () => {
    expect(typingText(['Ali', 'Vali'])).toBe('Ali va Vali yozmoqda...');
  });

  it("uch va undan ko'pda SON yoziladi", () => {
    // Uzun ismlar qatori sarlavha ostiga sig'masdi va "sakrab" turardi.
    expect(typingText(['Ali', 'Vali', 'Hasan'])).toBe('3 kishi yozmoqda...');
  });
});

describe('groupStatusText', () => {
  it("hech kim yozmasa a'zolar soni ko'rsatiladi", () => {
    expect(groupStatusText(7, [])).toBe("7 a'zo");
  });

  it("kimdir yozsa a'zolar soni o'rniga o'sha ko'rsatiladi", () => {
    expect(groupStatusText(7, ['Ali'])).toBe('Ali yozmoqda...');
  });
});
