import { describe, expect, it } from 'vitest';

import { conversationQuerySchema, openConversationSchema, sendMessageSchema } from '@/modules/chat/chat.schemas';
import {
  CHAT_FILTERS,
  formatLastMessage,
  formatUnread,
  peerStatusText,
  statusMark,
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

describe('statusMark', () => {
  it('yuborilganda bitta belgi, qolganida ikkita', () => {
    expect(statusMark('SENT')).toBe('✓');
    expect(statusMark('DELIVERED')).toBe('✓✓');
    expect(statusMark('SEEN')).toBe('✓✓');
  });
});

describe('peerStatusText', () => {
  /**
   * "Yozmoqda" ONLAYN dan ustun: u yangiroq va aniqroq ma'lumot.
   * Ikkalasi bir vaqtda ko'rsatilsa, satr chalkash bo'lardi.
   */
  it("yozayotgan bo'lsa ustun turadi", () => {
    expect(peerStatusText(true, true)).toBe('yozmoqda...');
    expect(peerStatusText(false, true)).toBe('yozmoqda...');
  });

  it('onlayn va oflayn holatlari', () => {
    expect(peerStatusText(true, false)).toBe('Onlayn');
    expect(peerStatusText(false, false)).toBe('Oflayn');
  });
});

describe('sendMessageSchema', () => {
  it('oddiy xabarni qabul qiladi', () => {
    expect(sendMessageSchema.parse({ body: '  Salom!  ' }).body).toBe('Salom!');
  });

  /**
   * Bo'sh xabar ro'yxatda bo'sh qator qoldirardi va uni o'chirishdan
   * boshqa iloji bo'lmasdi.
   */
  it("bo'sh xabarni rad etadi", () => {
    expect(sendMessageSchema.safeParse({ body: '' }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ body: '    ' }).success).toBe(false);
  });

  it('juda uzun xabarni rad etadi', () => {
    expect(sendMessageSchema.safeParse({ body: 'a'.repeat(4001) }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ body: 'a'.repeat(4000) }).success).toBe(true);
  });

  it('yuboruvchini qabul qilmaydi', () => {
    // Mijoz kim yuborganini tanlay olsa, boshqa odam nomidan yozardi.
    expect(sendMessageSchema.parse({ body: 'salom', senderId: 'x' })).not.toHaveProperty('senderId');
  });

  it('holatni qabul qilmaydi', () => {
    expect(sendMessageSchema.parse({ body: 'salom', status: 'SEEN' })).not.toHaveProperty('status');
  });
});

describe('formatLastMessage — rasmli xabar', () => {
  function item(overrides: Partial<ConversationListItem>): ConversationListItem {
    return {
      id: '1',
      peer: {
        kind: 'DIRECT',
        handle: 'bobur_k',
        name: 'Bobur Karimov',
        avatarUrl: null,
        color: null,
        isVerified: false,
        profileUrl: '/u/bobur_k',
      },
      lastMessage: null,
      lastMessageIsMine: false,
      lastMessageAt: '2026-08-11T03:00:00.000Z',
      unreadCount: 0,
      ...overrides,
    };
  }

  it("matnsiz rasm uchun maxsus matn ko'rsatiladi", () => {
    // Aks holda ro'yxatda bo'sh qator turardi.
    expect(formatLastMessage(item({ lastMessage: '' }))).toBe('Rasm');
  });

  it("o'z rasmim ham belgilanadi", () => {
    expect(formatLastMessage(item({ lastMessage: '', lastMessageIsMine: true }))).toBe('Siz: Rasm');
  });

  it("xabar umuman yo'q holati farqlanadi", () => {
    // `null` — "hali xabar yo'q", bo'sh satr esa "xabar bor, matnsiz".
    expect(formatLastMessage(item({ lastMessage: null }))).toBe("Hali xabar yo'q");
  });
});

describe('sendMessageSchema — rasm bilan', () => {
  const image = '/api/v1/files/chat/a/b.webp';

  it('matnsiz, rasmli xabar qabul qilinadi', () => {
    expect(sendMessageSchema.safeParse({ imageUrl: image }).success).toBe(true);
  });

  it("matn ham, rasm ham bo'lmasa rad etiladi", () => {
    expect(sendMessageSchema.safeParse({ body: '  ' }).success).toBe(false);
  });

  it('BEGONA rasm manzili rad etiladi', () => {
    expect(sendMessageSchema.safeParse({ imageUrl: 'https://tracker.example.com/p.gif' }).success).toBe(false);
  });
});
