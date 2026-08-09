import { describe, expect, it } from 'vitest';

import { openConversationSchema, conversationQuerySchema } from '@/modules/chat/chat.schemas';
import {
  CHAT_FILTERS,
  formatLastMessage,
  formatUnread,
  type ConversationListItem,
} from '@/modules/chat/chat.types';

const BASE: ConversationListItem = {
  id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
  peer: {
    kind: 'DIRECT',
    handle: 'aziz',
    name: 'Aziz Karimov',
    avatarUrl: null,
    color: null,
    isVerified: false,
    profileUrl: '/u/aziz',
  },
  lastMessage: 'Salom!',
  lastMessageIsMine: false,
  lastMessageAt: '2026-08-09T10:00:00.000Z',
  unreadCount: 0,
};

describe('formatLastMessage', () => {
  it("o'z xabarim oldiga “Siz” qo'yiladi", () => {
    expect(formatLastMessage({ ...BASE, lastMessageIsMine: true })).toBe('Siz: Salom!');
  });

  it("begona xabar o'z holicha", () => {
    expect(formatLastMessage(BASE)).toBe('Salom!');
  });

  it("xabar yo'q bo'lsa tushuntiriladi", () => {
    expect(formatLastMessage({ ...BASE, lastMessage: null })).toBe("Hali xabar yo'q");
  });
});

describe('formatUnread', () => {
  it("kichik sonni o'z holicha yozadi", () => {
    expect(formatUnread(3)).toBe('3');
    expect(formatUnread(99)).toBe('99');
  });

  /** Uch xonali son nishonni cho'zib yuborardi. */
  it('99 dan oshsa qisqartiradi', () => {
    expect(formatUnread(100)).toBe('99+');
    expect(formatUnread(1_240)).toBe('99+');
  });
});

describe('CHAT_FILTERS', () => {
  it('filtrlar takrorlanmaydi', () => {
    const values = CHAT_FILTERS.map((item) => item.value);

    expect(new Set(values).size).toBe(values.length);
  });
});

describe('openConversationSchema', () => {
  it('foydalanuvchi nomini qabul qiladi', () => {
    expect(openConversationSchema.safeParse({ username: 'aziz_karimov' }).success).toBe(true);
  });

  it('biznes manzilini qabul qiladi', () => {
    expect(openConversationSchema.safeParse({ businessSlug: 'burger-house' }).success).toBe(true);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Ikkalasi ham berilsa, server qaysi biriga suhbat ochishni bilmasdi
   * va tanlov jimgina kodning tartibiga bog'liq bo'lib qolardi.
   */
  it('ikkalasi birga berilishini rad etadi', () => {
    expect(openConversationSchema.safeParse({ username: 'aziz', businessSlug: 'burger-house' }).success).toBe(
      false,
    );
  });

  it('hech biri berilmasa rad etadi', () => {
    expect(openConversationSchema.safeParse({}).success).toBe(false);
  });

  it("noto'g'ri nom va manzilni rad etadi", () => {
    expect(openConversationSchema.safeParse({ username: 'Aziz.Karimov' }).success).toBe(false);
    expect(openConversationSchema.safeParse({ businessSlug: 'burger house' }).success).toBe(false);
  });

  it('suhbat ID sini qabul qilmaydi', () => {
    // Mijoz suhbatni O'ZI tanlay olsa, begona suhbatga qo'shilib
    // olishi mumkin bo'lardi.
    const parsed = openConversationSchema.parse({ username: 'aziz', conversationId: 'x' });

    expect(parsed).not.toHaveProperty('conversationId');
  });
});

describe('conversationQuerySchema', () => {
  it('standart filtr — barchasi', () => {
    expect(conversationQuerySchema.parse({}).filter).toBe('ALL');
  });

  it("noma'lum filtrni rad etadi", () => {
    expect(conversationQuerySchema.safeParse({ filter: 'ARXIV' }).success).toBe(false);
  });

  it("foydalanuvchi ID'sini qabul qilmaydi", () => {
    expect(conversationQuerySchema.parse({ userId: 'x' })).not.toHaveProperty('userId');
  });
});
