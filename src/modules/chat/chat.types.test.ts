import { describe, expect, it } from 'vitest';

import {
  conversationQuerySchema,
  editMessageSchema,
  openConversationSchema,
  reactionSchema,
  sendMessageSchema,
} from '@/modules/chat/chat.schemas';
import {
  aggregateReactions,
  CHAT_FILTERS,
  canEditMessage,
  canReactToMessage,
  PENDING_ID_PREFIX,
  DELETED_MESSAGE_TEXT,
  formatLastMessage,
  formatUnread,
  messageKindText,
  peerStatusText,
  QUOTE_PREVIEW_LENGTH,
  quotePreview,
  statusMark,
  type ConversationListItem,
  type MessageView,
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
  lastMessageKind: 'TEXT',
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
      lastMessageKind: 'TEXT',
      lastMessageIsMine: false,
      lastMessageAt: '2026-08-11T03:00:00.000Z',
      unreadCount: 0,
      ...overrides,
    };
  }

  it("matnsiz rasm uchun maxsus matn ko'rsatiladi", () => {
    // Aks holda ro'yxatda bo'sh qator turardi.
    expect(formatLastMessage(item({ lastMessage: '', lastMessageKind: 'IMAGE' }))).toBe('Rasm');
  });

  it("o'z rasmim ham belgilanadi", () => {
    expect(formatLastMessage(item({ lastMessage: '', lastMessageKind: 'IMAGE', lastMessageIsMine: true }))).toBe(
      'Siz: Rasm',
    );
  });

  it('ovozli xabar ham nomlanadi', () => {
    expect(formatLastMessage(item({ lastMessage: '', lastMessageKind: 'VOICE' }))).toBe('Ovozli xabar');
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

describe('messageKindText', () => {
  it('rasm va ovoz nomlanadi', () => {
    expect(messageKindText('IMAGE')).toBe('Rasm');
    expect(messageKindText('VOICE')).toBe('Ovozli xabar');
  });

  it("matnli xabarda qo'shimcha yozuv yo'q", () => {
    // Matn o'zi ko'rinadi — uning oldiga "Matn" deb yozish ma'nosiz.
    expect(messageKindText('TEXT')).toBe('');
  });
});

describe('sendMessageSchema — ovoz bilan', () => {
  const voice = '/api/v1/files/voice/a/b.webm';

  it('matnsiz ovozli xabar qabul qilinadi', () => {
    expect(sendMessageSchema.safeParse({ voiceUrl: voice, voiceSeconds: 12 }).success).toBe(true);
  });

  it('davomiyliksiz ovoz rad etiladi', () => {
    // Aks holda ekranda "0:00" turardi va odam uni buzilgan deb o'ylardi.
    expect(sendMessageSchema.safeParse({ voiceUrl: voice }).success).toBe(false);
  });

  it('ovozsiz davomiylik rad etiladi', () => {
    expect(sendMessageSchema.safeParse({ body: 'salom', voiceSeconds: 5 }).success).toBe(false);
  });

  it('juda uzun ovoz rad etiladi', () => {
    expect(sendMessageSchema.safeParse({ voiceUrl: voice, voiceSeconds: 121 }).success).toBe(false);
  });

  it('BEGONA ovoz manzili rad etiladi', () => {
    expect(sendMessageSchema.safeParse({ voiceUrl: 'https://example.com/a.mp3', voiceSeconds: 5 }).success).toBe(
      false,
    );
  });
});

// ── Javob, tahrirlash va o'chirish ────────────────────────────────────

function message(overrides: Partial<MessageView> = {}): MessageView {
  return {
    id: '9f8b1f2e-3f4a-4c5b-8d6e-7a8b9c0d1e2f',
    body: 'Salom!',
    imageUrl: null,
    voiceUrl: null,
    voiceSeconds: null,
    replyTo: null,
    editedAt: null,
    reactions: [],
    isMine: true,
    createdAt: '2026-08-11T10:00:00.000Z',
    status: 'SENT',
    isDeleted: false,
    systemKind: null,
    senderName: null,
    senderAvatarUrl: null,
    senderId: null,
    ...overrides,
  };
}

describe('quotePreview', () => {
  it("matnni o'z holicha beradi", () => {
    expect(quotePreview('Salom!', 'TEXT', false)).toBe('Salom!');
  });

  it('uzun matnni qisqartiradi', () => {
    const preview = quotePreview('a'.repeat(200), 'TEXT', false);

    // Uzun iqtibos butun ekranni egallab, javobning o'zi ko'rinmay qolardi.
    expect(preview).toBe(`${'a'.repeat(QUOTE_PREVIEW_LENGTH)}…`);
  });

  it('chegaradagi matn qisqartirilmaydi', () => {
    const exact = 'a'.repeat(QUOTE_PREVIEW_LENGTH);

    expect(quotePreview(exact, 'TEXT', false)).toBe(exact);
  });

  it("matnsiz xabarda TURI ko'rsatiladi", () => {
    expect(quotePreview('', 'IMAGE', false)).toBe('Rasm');
    expect(quotePreview('   ', 'VOICE', false)).toBe('Ovozli xabar');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * O'chirilgan xabarning matni iqtibosda qolib ketsa, "o'chirdim"
   * degani yolg'on bo'lardi: matn boshqa xabar ichida ko'rinib turardi.
   */
  it("o'chirilgan xabarning MATNI ko'rsatilmaydi", () => {
    expect(quotePreview('Maxfiy gap', 'TEXT', true)).toBe(DELETED_MESSAGE_TEXT);
  });
});

describe('canEditMessage', () => {
  it("o'z matnli xabarim tahrirlanadi", () => {
    expect(canEditMessage(message())).toBe(true);
  });

  it('begona xabar tahrirlanmaydi', () => {
    expect(canEditMessage(message({ isMine: false }))).toBe(false);
  });

  it("o'chirilgan xabar tahrirlanmaydi", () => {
    expect(canEditMessage(message({ isDeleted: true }))).toBe(false);
  });

  /**
   * Rasm va ovozning "matni" yo'q. Tahrirlashga ruxsat berilsa,
   * rasmli xabar matnli bo'lib qolardi.
   */
  it('rasm va ovoz tahrirlanmaydi', () => {
    expect(canEditMessage(message({ imageUrl: '/api/v1/files/chat/a.webp' }))).toBe(false);
    expect(canEditMessage(message({ voiceUrl: '/api/v1/files/voice/a.webm', voiceSeconds: 4 }))).toBe(false);
  });
});

describe('sendMessageSchema — javob', () => {
  const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

  it('javob ID sini qabul qiladi', () => {
    expect(sendMessageSchema.parse({ body: 'ha', replyToId: id }).replyToId).toBe(id);
  });

  it("ID bo'lmagan qiymatni rad etadi", () => {
    expect(sendMessageSchema.safeParse({ body: 'ha', replyToId: 'salom' }).success).toBe(false);
  });

  it('javobsiz xabar ham qabul qilinadi', () => {
    expect(sendMessageSchema.parse({ body: 'ha' }).replyToId).toBeUndefined();
  });
});

describe('editMessageSchema', () => {
  it('matnni tozalab qabul qiladi', () => {
    expect(editMessageSchema.parse({ body: '  Tuzatildi  ' }).body).toBe('Tuzatildi');
  });

  /**
   * Yuborishda bo'sh matn mumkin (rasm o'zi xabar), tahrirlashda esa
   * yo'q: xabar ko'rinmas bo'lib qolardi.
   */
  it("bo'sh matnni rad etadi", () => {
    expect(editMessageSchema.safeParse({ body: '   ' }).success).toBe(false);
  });

  it('juda uzun matnni rad etadi', () => {
    expect(editMessageSchema.safeParse({ body: 'a'.repeat(4001) }).success).toBe(false);
  });

  it('tahrir vaqtini mijozdan qabul qilmaydi', () => {
    // Aks holda "tahrirlangan" belgisini aylanib o'tish mumkin bo'lardi.
    expect(editMessageSchema.parse({ body: 'ha', editedAt: null })).not.toHaveProperty('editedAt');
  });
});

// ── Reaksiyalar ───────────────────────────────────────────────────────

const ME = '11111111-1111-4111-8111-111111111111';
const PEER = '22222222-2222-4222-8222-222222222222';

describe('aggregateReactions', () => {
  it("bir xil emojini bitta nishonga yig'adi", () => {
    const result = aggregateReactions(
      [
        { emoji: '👍', userId: ME },
        { emoji: '👍', userId: PEER },
      ],
      ME,
    );

    expect(result).toEqual([{ emoji: '👍', count: 2, isMine: true }]);
  });

  it("o'zimniki emasligini to'g'ri belgilaydi", () => {
    const result = aggregateReactions([{ emoji: '❤️', userId: PEER }], ME);

    expect(result).toEqual([{ emoji: '❤️', count: 1, isMine: false }]);
  });

  it("reaksiyasiz xabar bo'sh ro'yxat beradi", () => {
    expect(aggregateReactions([], ME)).toEqual([]);
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Jonli ulanish suhbatni JSON matnga aylantirib solishtiradi. Tartib
   * beqaror bo'lsa, hech narsa o'zgarmagan bo'lsa ham matn boshqacha
   * chiqib, butun suhbat har 1.5 soniyada qayta uzatilardi.
   */
  it("tartib QAT'IY: avval ko'p qo'yilgani", () => {
    const result = aggregateReactions(
      [
        { emoji: '😂', userId: ME },
        { emoji: '👍', userId: PEER },
        { emoji: '👍', userId: 'x' },
      ],
      ME,
    );

    expect(result.map((item) => item.emoji)).toEqual(['👍', '😂']);
  });

  it("teng sonda ro'yxatdagi tartib saqlanadi", () => {
    // Kirish tartibi teskari berilsa ham natija bir xil bo'lishi kerak.
    const forward = aggregateReactions(
      [
        { emoji: '👍', userId: ME },
        { emoji: '❤️', userId: PEER },
      ],
      ME,
    );
    const backward = aggregateReactions(
      [
        { emoji: '❤️', userId: PEER },
        { emoji: '👍', userId: ME },
      ],
      ME,
    );

    expect(forward.map((item) => item.emoji)).toEqual(['👍', '❤️']);
    expect(backward.map((item) => item.emoji)).toEqual(['👍', '❤️']);
  });

  it("noma'lum emoji oxirida turadi", () => {
    const result = aggregateReactions(
      [
        { emoji: '🦄', userId: PEER },
        { emoji: '🙏', userId: ME },
      ],
      ME,
    );

    expect(result.map((item) => item.emoji)).toEqual(['🙏', '🦄']);
  });
});

describe('canReactToMessage', () => {
  it("oddiy xabarga reaksiya qo'yiladi", () => {
    expect(canReactToMessage(message())).toBe(true);
  });

  it("o'chirilgan xabarga qo'yilmaydi", () => {
    // Unda hech narsa qolmagan — reaksiya nimaga ekani tushunarsiz.
    expect(canReactToMessage(message({ isDeleted: true }))).toBe(false);
  });

  it("hali yuborilmagan xabarga qo'yilmaydi", () => {
    // Uning ID si haqiqiy emas — so'rov "topilmadi" bilan tugardi.
    expect(canReactToMessage(message({ id: `${PENDING_ID_PREFIX}1` }))).toBe(false);
  });
});

describe('reactionSchema', () => {
  it("ro'yxatdagi emojini qabul qiladi", () => {
    expect(reactionSchema.parse({ emoji: '👍' }).emoji).toBe('👍');
  });

  /**
   * Istalgan matnga ruxsat berilsa, emoji o'rniga haqorat yozib
   * yuborish mumkin bo'lardi — u esa suhbatdoshning ekranida,
   * o'chirib bo'lmaydigan holda turardi.
   */
  it("ro'yxatdan tashqari emojini rad etadi", () => {
    expect(reactionSchema.safeParse({ emoji: '🦄' }).success).toBe(false);
  });

  it('oddiy matnni rad etadi', () => {
    expect(reactionSchema.safeParse({ emoji: 'salom' }).success).toBe(false);
    expect(reactionSchema.safeParse({ emoji: '' }).success).toBe(false);
  });

  it('juda uzun qiymatni rad etadi', () => {
    expect(reactionSchema.safeParse({ emoji: '👍'.repeat(20) }).success).toBe(false);
  });

  it("kim qo'yganini mijozdan qabul qilmaydi", () => {
    // Aks holda boshqa odam nomidan reaksiya qo'yish mumkin bo'lardi.
    expect(reactionSchema.parse({ emoji: '👍', userId: 'x' })).not.toHaveProperty('userId');
  });
});
