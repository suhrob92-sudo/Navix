import { ConversationKind, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { logger } from '@/lib/logger';
import { isOnline, isTyping, isViewing, markTyping } from '@/lib/presence';
import { prisma } from '@/lib/prisma';
import { listCallsForConversation } from '@/modules/call/call.service';
import { requireCanMessage } from '@/modules/moderation/moderation.service';
import { sendPush } from '@/modules/notification/push.service';
import type { ServiceColor } from '@/config/modules';
import { IMAGE_MESSAGE_TEXT } from '@/modules/chat/chat.types';
import type {
  ChatPeer,
  ConversationListItem,
  MessageStatus,
  MessageView,
  OpenConversationResponse,
  ThreadView,
} from '@/modules/chat/chat.types';
import type { ConversationQuery, OpenConversationInput } from '@/modules/chat/chat.schemas';

/**
 * Chat moduli — suhbatlar.
 *
 * ── Modulning ENG NOZIK joyi: NUSXA suhbat ────────────────────────────
 * "Xabar" tugmasi ikki marta bosilsa yoki ikkita qurilmadan bir vaqtda
 * bosilsa, ikkita suhbat yaratilib qolishi mumkin. Natijada ro'yxatda
 * bir odam bilan ikkita chat turadi va xabarlar ikkiga bo'linadi.
 *
 * Buning oldini `pairKey` oladi: u suhbatni bir qiymatli aniqlaydi va
 * BAZADA yagona. Kod xato qilsa ham nusxa paydo bo'lmaydi — ikkinchi
 * urinish P2002 bilan tugaydi va mavjud suhbat qaytariladi.
 */

/**
 * Ikki odam uchun kalit.
 *
 * ID'lar TARTIBLANADI: kim birinchi yozganidan qat'i nazar kalit bir
 * xil bo'lishi kerak. Aks holda A→B va B→A ikkita alohida suhbat
 * yaratardi.
 */
function buildDirectKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(':');
}

/** Foydalanuvchi va biznes uchun kalit. */
function buildBusinessKey(userId: string, businessProfileId: string): string {
  return `${userId}:${businessProfileId}`;
}

const CONVERSATION_SELECT = {
  id: true,
  kind: true,
  lastMessageAt: true,
  createdAt: true,
  business: {
    select: {
      id: true,
      isVerified: true,
      restaurant: { select: { slug: true, name: true, color: true } },
      shop: { select: { slug: true, name: true, color: true } },
    },
  },
  members: {
    select: {
      userId: true,
      lastReadAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          profile: { select: { username: true, isVerified: true } },
        },
      },
    },
  },
  messages: {
    where: { deletedAt: null },
    select: { body: true, imageUrl: true, senderId: true, createdAt: true },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} as const;

type ConversationRow = Prisma.ConversationGetPayload<{ select: typeof CONVERSATION_SELECT }>;

/**
 * Suhbatdagi IKKINCHI tomonni aniqlaydi.
 *
 * Biznes suhbatida ikkinchi tomon — biznesning o'zi, foydalanuvchi
 * suhbatida esa boshqa a'zo.
 */
function resolvePeer(row: ConversationRow, viewerId: string): ChatPeer {
  if (row.kind === ConversationKind.BUSINESS) {
    const entity = row.business?.restaurant ?? row.business?.shop;

    if (!entity) {
      throw new NotFoundError('Suhbat');
    }

    return {
      kind: 'BUSINESS',
      handle: entity.slug,
      name: entity.name,
      avatarUrl: null,
      color: entity.color as ServiceColor,
      isVerified: row.business?.isVerified ?? false,
      profileUrl: `/b/${entity.slug}`,
    };
  }

  const other = row.members.find((member) => member.userId !== viewerId);

  if (!other) {
    throw new NotFoundError('Suhbat');
  }

  const fullName = [other.user.firstName, other.user.lastName].filter(Boolean).join(' ');
  const username = other.user.profile?.username ?? '';

  return {
    kind: 'DIRECT',
    handle: username,
    name: fullName || (username ? `@${username}` : 'Foydalanuvchi'),
    avatarUrl: other.user.avatarUrl,
    color: null,
    isVerified: other.user.profile?.isVerified ?? false,
    profileUrl: username ? `/u/${username}` : '/dashboard',
  };
}

/** O'qilmagan xabarlar sonini hisoblaydi. */
async function countUnread(
  conversationIds: string[],
  viewerId: string,
  lastReadByConversation: Map<string, Date | null>,
): Promise<Map<string, number>> {
  if (conversationIds.length === 0) return new Map();

  /**
   * Har bir suhbat uchun ALOHIDA so'rov yuborilmaydi.
   *
   * Bitta `groupBy` bilan hammasi sanaladi, `lastReadAt` esa har xil
   * bo'lgani uchun shart `OR` orqali yig'iladi.
   */
  const conditions: Prisma.MessageWhereInput[] = conversationIds.map((id) => {
    const lastRead = lastReadByConversation.get(id) ?? null;

    return {
      conversationId: id,
      ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
    };
  });

  const rows = await prisma.message.groupBy({
    by: ['conversationId'],
    where: {
      deletedAt: null,
      // O'z xabarim o'qilmagan hisoblanmaydi.
      senderId: { not: viewerId },
      OR: conditions,
    },
    _count: { _all: true },
  });

  return new Map(rows.map((row) => [row.conversationId, row._count._all]));
}

export async function listConversations(
  viewerId: string,
  query: ConversationQuery,
): Promise<{ conversations: ConversationListItem[]; total: number; totalUnread: number }> {
  const { skip, take } = toPrismaPagination(query);

  const where: Prisma.ConversationWhereInput = {
    members: { some: { userId: viewerId } },
    ...(query.filter === 'BUSINESS' ? { kind: ConversationKind.BUSINESS } : {}),
    ...(query.filter === 'DIRECT' ? { kind: ConversationKind.DIRECT } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.conversation.findMany({
      where,
      select: CONVERSATION_SELECT,
      /**
       * Oxirgi xabar bo'yicha, keyin yaratilish vaqti bo'yicha.
       *
       * Ikkinchi shart kerak: hali xabar yozilmagan suhbatda
       * `lastMessageAt` bo'sh va ular tartibsiz chiqib qolardi.
       */
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    prisma.conversation.count({ where }),
  ]);

  const lastReadByConversation = new Map(
    rows.map((row) => [row.id, row.members.find((member) => member.userId === viewerId)?.lastReadAt ?? null]),
  );

  const unread = await countUnread(
    rows.map((row) => row.id),
    viewerId,
    lastReadByConversation,
  );

  let conversations: ConversationListItem[] = rows.map((row) => {
    const lastMessage = row.messages[0] ?? null;

    return {
      id: row.id,
      peer: resolvePeer(row, viewerId),
      /**
       * Rasmli xabarda matn bo'sh bo'lishi mumkin — u BO'SH SATR
       * bo'lib qaytadi, `null` emas. Farqi muhim: `null` "hali xabar
       * yo'q" degani, bo'sh satr esa "xabar bor, lekin matnsiz".
       */
      lastMessage: lastMessage ? lastMessage.body : null,
      lastMessageIsMine: lastMessage?.senderId === viewerId,
      lastMessageAt: (row.lastMessageAt ?? row.createdAt).toISOString(),
      unreadCount: unread.get(row.id) ?? 0,
    };
  });

  /**
   * Qidiruv va "o'qilmagan" filtri XOTIRADA qo'llanadi.
   *
   * Ikkalasi ham hisoblangan qiymatlarga tayanadi: suhbat nomi ikki
   * xil jadvaldan (odam yoki biznes) yig'iladi, o'qilmaganlar soni esa
   * alohida so'rovdan keladi. Ularni SQL'ga tushirish uchun sxemani
   * ancha murakkablashtirish kerak bo'lardi.
   *
   * Bitta odamda minglab suhbat bo'lmaydi, shuning uchun bu yechim
   * yetarli. Kerak bo'lsa keyinchalik ustunga chiqariladi.
   */
  if (query.filter === 'UNREAD') {
    conversations = conversations.filter((item) => item.unreadCount > 0);
  }

  if (query.search) {
    const needle = query.search.toLowerCase();

    conversations = conversations.filter(
      (item) =>
        item.peer.name.toLowerCase().includes(needle) ||
        item.peer.handle.toLowerCase().includes(needle) ||
        (item.lastMessage ?? '').toLowerCase().includes(needle),
    );
  }

  const totalUnread = [...unread.values()].reduce((sum, value) => sum + value, 0);

  return {
    conversations,
    total: query.filter === 'UNREAD' || query.search ? conversations.length : total,
    totalUnread,
  };
}

/** Suhbatni ochadi: mavjud bo'lsa qaytaradi, bo'lmasa yaratadi. */
export async function openConversation(
  viewerId: string,
  input: OpenConversationInput,
): Promise<OpenConversationResponse> {
  if (input.username) {
    return openDirectConversation(viewerId, input.username);
  }

  return openBusinessConversation(viewerId, input.businessSlug!);
}

async function openDirectConversation(viewerId: string, username: string): Promise<OpenConversationResponse> {
  const target = await prisma.user.findFirst({
    where: { profile: { username }, deletedAt: null, status: { not: 'SUSPENDED' } },
    select: { id: true },
  });

  if (!target) {
    throw new NotFoundError('Profil');
  }

  if (target.id === viewerId) {
    throw new ConflictError("O'zingizga xabar yozib bo'lmaydi.");
  }

  /**
   * Blok va maxfiylik SUHBAT OCHILISHIDAN OLDIN tekshiriladi.
   *
   * Aks holda begona odam suhbat yaratib qo'yardi va u qabul
   * qiluvchining ro'yxatida bo'sh satr bo'lib turardi — xabar
   * yozilmasa ham bezovta qiladi.
   */
  await requireCanMessage(viewerId, target.id);

  const pairKey = buildDirectKey(viewerId, target.id);

  const existing = await prisma.conversation.findUnique({ where: { pairKey }, select: { id: true } });

  if (existing) {
    return { conversationId: existing.id, isNew: false };
  }

  try {
    const created = await prisma.conversation.create({
      data: {
        kind: ConversationKind.DIRECT,
        pairKey,
        members: { create: [{ userId: viewerId }, { userId: target.id }] },
      },
      select: { id: true },
    });

    logger.info({ viewerId, targetId: target.id }, 'Yangi suhbat ochildi');

    return { conversationId: created.id, isNew: true };
  } catch (error) {
    return recoverFromDuplicate(error, pairKey);
  }
}

async function openBusinessConversation(
  viewerId: string,
  businessSlug: string,
): Promise<OpenConversationResponse> {
  const business = await prisma.businessProfile.findFirst({
    where: {
      OR: [
        { restaurant: { slug: businessSlug, isActive: true } },
        { shop: { slug: businessSlug, isActive: true } },
      ],
    },
    select: { id: true },
  });

  if (!business) {
    throw new NotFoundError('Biznes');
  }

  const pairKey = buildBusinessKey(viewerId, business.id);

  const existing = await prisma.conversation.findUnique({ where: { pairKey }, select: { id: true } });

  if (existing) {
    return { conversationId: existing.id, isNew: false };
  }

  try {
    const created = await prisma.conversation.create({
      data: {
        kind: ConversationKind.BUSINESS,
        pairKey,
        businessProfileId: business.id,
        /**
         * Biznes suhbatida a'zo faqat BITTA — mijoz.
         *
         * Biznes tomonidan kim javob berishi hozircha aniqlanmagan
         * (egasi bo'lmasligi ham mumkin). Xabarlar biznesga tegishli
         * va uni egasi kabinetdan ko'radi — bu keyingi bosqichda.
         */
        members: { create: [{ userId: viewerId }] },
      },
      select: { id: true },
    });

    logger.info({ viewerId, businessSlug }, 'Biznes bilan suhbat ochildi');

    return { conversationId: created.id, isNew: true };
  } catch (error) {
    return recoverFromDuplicate(error, pairKey);
  }
}

/**
 * Ayni shu oniyda boshqa so'rov suhbatni yaratib ulgurdi.
 *
 * Yuqoridagi tekshiruv bu holatni ushlay olmaydi: o'qish va yozish
 * orasida vaqt bor. Yagona ishonchli to'siq — bazadagi `@unique`.
 */
async function recoverFromDuplicate(error: unknown, pairKey: string): Promise<OpenConversationResponse> {
  const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

  if (!isDuplicate) throw error;

  const row = await prisma.conversation.findUnique({ where: { pairKey }, select: { id: true } });

  if (!row) throw error;

  return { conversationId: row.id, isNew: false };
}

// ─────────────────────────────────────────────────────────────────────
// Suhbat oynasi
// ─────────────────────────────────────────────────────────────────────

/** Bitta so'rovda olinadigan eng ko'p xabar. */
const MAX_THREAD_MESSAGES = 100;

/**
 * Foydalanuvchi shu suhbatning a'zosimi.
 *
 * ── Nima uchun HAR AMALDA tekshiriladi ────────────────────────────────
 * Suhbat ID manzilda ochiq turadi. Tekshiruvsiz uni almashtirib,
 * begona odamlarning yozishmasini o'qib olish mumkin bo'lardi — bu
 * eng jiddiy turdagi ma'lumot sizib chiqishi.
 */
async function requireMembership(conversationId: string, userId: string): Promise<ConversationRow> {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, members: { some: { userId } } },
    select: CONVERSATION_SELECT,
  });

  if (!row) {
    /**
     * ATAYLAB "topilmadi", "ruxsat yo'q" emas.
     *
     * "Ruxsat yo'q" javobi begona odamga suhbat MAVJUDLIGINI aytib
     * qo'yardi.
     */
    throw new NotFoundError('Suhbat');
  }

  return row;
}

/** Xabarning holatini aniqlaydi. */
function resolveStatus(
  message: { senderId: string; deliveredAt: Date | null; createdAt: Date },
  viewerId: string,
  peerLastReadAt: Date | null,
): MessageStatus {
  // Begona xabarda holat ko'rsatilmaydi — u har doim "o'qilgan".
  if (message.senderId !== viewerId) return 'SEEN';

  if (peerLastReadAt && peerLastReadAt >= message.createdAt) return 'SEEN';

  return message.deliveredAt ? 'DELIVERED' : 'SENT';
}

function toMessageView(
  row: {
    id: string;
    body: string;
    imageUrl: string | null;
    senderId: string;
    createdAt: Date;
    deliveredAt: Date | null;
    deletedAt: Date | null;
  },
  viewerId: string,
  peerLastReadAt: Date | null,
): MessageView {
  return {
    id: row.id,
    // O'chirilgan xabar MATNI yuborilmaydi — u brauzerda ko'rinib qolmasligi kerak.
    body: row.deletedAt ? '' : row.body,
    // Rasm ham xuddi shunday: o'chirilgan xabarda u ko'rinmasligi kerak.
    imageUrl: row.deletedAt ? null : row.imageUrl,
    isMine: row.senderId === viewerId,
    createdAt: row.createdAt.toISOString(),
    status: resolveStatus(row, viewerId, peerLastReadAt),
    isDeleted: row.deletedAt !== null,
  };
}

/** Suhbatdagi ikkinchi tomonning foydalanuvchi ID'si (biznesda `null`). */
function peerUserId(row: ConversationRow, viewerId: string): string | null {
  if (row.kind === ConversationKind.BUSINESS) return null;

  return row.members.find((member) => member.userId !== viewerId)?.userId ?? null;
}

/** Ikkinchi tomon suhbatni qachon o'qigani. */
function peerLastRead(row: ConversationRow, viewerId: string): Date | null {
  return row.members.find((member) => member.userId !== viewerId)?.lastReadAt ?? null;
}

export async function getThread(conversationId: string, viewerId: string): Promise<ThreadView> {
  const row = await requireMembership(conversationId, viewerId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: {
      id: true,
      body: true,
      imageUrl: true,
      senderId: true,
      createdAt: true,
      deliveredAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_THREAD_MESSAGES,
  });

  const otherId = peerUserId(row, viewerId);

  const [online, typing, calls] = await Promise.all([
    otherId ? isOnline(otherId) : Promise.resolve(false),
    otherId ? isTyping(conversationId, otherId) : Promise.resolve(false),
    /**
     * Qo'ng'iroqlar suhbat bilan BIRGA olinadi.
     *
     * Alohida so'rov qilinsa, ular jonli oqimga tushmasdi: tugagan
     * qo'ng'iroq faqat sahifa yangilangandan keyin ko'rinardi.
     */
    listCallsForConversation(conversationId, viewerId),
  ]);

  const lastRead = peerLastRead(row, viewerId);

  return {
    id: row.id,
    peer: resolvePeer(row, viewerId),
    isPeerOnline: online,
    isPeerTyping: typing,
    messages: messages.map((message) => toMessageView(message, viewerId, lastRead)),
    calls,
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  imageUrl: string | null = null,
): Promise<MessageView> {
  const row = await requireMembership(conversationId, senderId);

  const otherId = peerUserId(row, senderId);

  /**
   * Blok HAR XABARDA tekshiriladi.
   *
   * Suhbat ochilganda tekshirish yetarli emas: odam allaqachon ochiq
   * suhbatda o'tirgan bo'lishi va shundan keyin bloklanishi mumkin.
   * O'sha ochiq oyna esa brauzerda soatlab turadi.
   */
  if (otherId) {
    await requireCanMessage(senderId, otherId);
  }

  /**
   * Qabul qiluvchi ilovada bo'lsa, xabar darhol "yetkazildi" deb
   * belgilanadi.
   *
   * Aks holda u jonli ulanish xabarni olganda belgilanadi
   * (`markDelivered`).
   */
  const deliveredAt = otherId && (await isOnline(otherId)) ? new Date() : null;

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId, body, imageUrl, deliveredAt },
      select: {
        id: true,
        body: true,
        imageUrl: true,
        senderId: true,
        createdAt: true,
        deliveredAt: true,
        deletedAt: true,
      },
    }),
    /**
     * `lastMessageAt` shu yerda yangilanadi.
     *
     * Ro'yxat aynan shu ustun bo'yicha saralanadi — yangilanmasa,
     * yangi xabar kelgan suhbat pastda qolib ketardi.
     */
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
      select: { id: true },
    }),
    /**
     * Yuboruvchi uchun suhbat AVTOMATIK o'qilgan hisoblanadi: u
     * hozir shu oynada turibdi.
     */
    prisma.conversationMember.updateMany({
      where: { conversationId, userId: senderId },
      data: { lastReadAt: new Date() },
    }),
  ]);

  logger.info({ conversationId, senderId }, 'Xabar yuborildi');

  /**
   * Telefonga turtki (push).
   *
   * ── Nima uchun bildirishnoma YOZILMAYDI ─────────────────────────────
   * Har bir xabar uchun bildirishnomalar ro'yxatiga yozuv qo'shilsa,
   * ellik xabarli suhbat ellikta yozuv qoldirardi va ro'yxat
   * ishlatib bo'lmas holga kelardi.
   *
   * Xabarlar allaqachon o'z joyida — suhbatlar ro'yxatida, o'qilmagan
   * nishoni bilan. Push esa boshqa vazifani bajaradi: ilova YOPIQ
   * bo'lganda xabar borligini bildirish.
   *
   * ── Nima uchun `void` ───────────────────────────────────────────────
   * Push yuborilishini kutmaymiz: u tashqi xizmatga murojaat qiladi va
   * bir necha yuz millisekund olishi mumkin. Xabar esa yuboruvchining
   * ekranida DARHOL paydo bo'lishi kerak.
   */
  if (otherId) {
    void notifyNewMessage(otherId, conversationId, senderId, body);
  }

  return toMessageView(message, senderId, peerLastRead(row, senderId));
}

/**
 * Yangi xabar haqida telefonga push yuboradi.
 *
 * Ochiq suhbatga yuborilmaydi: odam xabarni allaqachon ko'rib turibdi.
 */
async function notifyNewMessage(
  recipientId: string,
  conversationId: string,
  senderId: string,
  body: string,
): Promise<void> {
  try {
    if (await isViewing(recipientId, conversationId)) return;

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { firstName: true, lastName: true, profile: { select: { username: true } } },
    });

    const name =
      [sender?.firstName, sender?.lastName].filter(Boolean).join(' ') ||
      (sender?.profile?.username ? `@${sender.profile.username}` : 'Foydalanuvchi');

    await sendPush(recipientId, {
      title: name,
      /**
       * Matn qisqartiriladi.
       *
       * Telefon ekranida uzun xabar baribir kesiladi, lekin uni to'liq
       * yuborish har bir push'ni og'irlashtiradi.
       */
      body: body.length === 0 ? IMAGE_MESSAGE_TEXT : body.length > 120 ? `${body.slice(0, 120)}…` : body,
      url: `/messages/${conversationId}`,
      /**
       * Nishon SUHBAT bo'yicha: bir suhbatdan kelgan o'nta xabar
       * ekranda o'nta bildirishnoma emas, bittasi bo'lib turadi.
       */
      tag: `chat-${conversationId}`,
      // Xabar kechikib yetsa ham foydali — sutkagacha saqlanadi.
      ttlSeconds: 60 * 60 * 24,
    });
  } catch (error) {
    logger.warn({ err: error, recipientId }, "Xabar haqida push yuborib bo'lmadi");
  }
}

/** Suhbatni o'qilgan deb belgilaydi. */
export async function markRead(conversationId: string, userId: string): Promise<void> {
  await requireMembership(conversationId, userId);

  await prisma.conversationMember.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

/**
 * Menga kelgan yetkazilmagan xabarlarni "yetkazildi" deb belgilaydi.
 *
 * Jonli ulanish xabarlarni uzatganda chaqiriladi: aynan shu payt
 * xabar qurilmaga yetib boradi.
 */
export async function markDelivered(conversationId: string, viewerId: string): Promise<number> {
  const result = await prisma.message.updateMany({
    where: { conversationId, senderId: { not: viewerId }, deliveredAt: null },
    data: { deliveredAt: new Date() },
  });

  return result.count;
}

/** "Yozmoqda" belgisini qo'yadi (a'zolikni tekshirib). */
export async function setTyping(conversationId: string, userId: string): Promise<void> {
  await requireMembership(conversationId, userId);

  await markTyping(conversationId, userId);
}
