import { ConversationKind, Prisma } from '@/generated/prisma/client';
import { ConflictError, NotFoundError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { ServiceColor } from '@/config/modules';
import type { ChatPeer, ConversationListItem, OpenConversationResponse } from '@/modules/chat/chat.types';
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
    select: { body: true, senderId: true, createdAt: true },
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
      lastMessage: lastMessage?.body ?? null,
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
