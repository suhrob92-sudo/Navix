import { ConversationKind, Prisma } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/api/errors';
import { toPrismaPagination } from '@/lib/api/pagination';
import { logger } from '@/lib/logger';
import { isOnline, isTyping, isViewing, markTyping } from '@/lib/presence';
import { prisma } from '@/lib/prisma';
import { listCallsForConversation } from '@/modules/call/call.service';
import { requireCanMessage } from '@/modules/moderation/moderation.service';
import { sendPush } from '@/modules/notification/push.service';
import { deleteImageByUrl } from '@/modules/upload/upload.service';
import { resolveWallpaper, type ChatWallpaperName } from '@/config/chat-wallpapers';
import type { ServiceColor } from '@/config/modules';
import { aggregateReactions, messageKindText, quotePreview } from '@/modules/chat/chat.types';
import type {
  ChatPeer,
  ConversationListItem,
  MessageKind,
  MessageReactionView,
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
          /**
           * `chatWallpaper` shu yerda olinadi.
           *
           * Ko'ruvchining o'zi ham a'zo, ya'ni bu yozuv baribir
           * o'qiladi. Fonni alohida so'rov bilan olish jonli oqimda
           * har 1.5 soniyada bitta ortiqcha murojaat degani bo'lardi.
           */
          profile: { select: { username: true, isVerified: true, chatWallpaper: true } },
        },
      },
    },
  },
  messages: {
    where: { deletedAt: null },
    select: { body: true, imageUrl: true, voiceUrl: true, senderId: true, createdAt: true },
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

/** Xabar turi: ro'yxatda matnsiz xabar o'rniga nima yozilishi uchun. */
function resolveMessageKind(message: { imageUrl: string | null; voiceUrl: string | null } | null): MessageKind {
  if (!message) return 'TEXT';
  if (message.voiceUrl) return 'VOICE';
  if (message.imageUrl) return 'IMAGE';

  return 'TEXT';
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
      lastMessageKind: resolveMessageKind(lastMessage),
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

/** Xabar o'qishda ishlatiladigan maydonlar. */
const MESSAGE_SELECT = {
  id: true,
  body: true,
  imageUrl: true,
  voiceUrl: true,
  voiceSeconds: true,
  senderId: true,
  createdAt: true,
  deliveredAt: true,
  deletedAt: true,
  editedAt: true,
  /**
   * Javob berilgan xabar — FAQAT ko'rsatish uchun kerakli maydonlar.
   *
   * To'liq yozuv olinsa, javoblar zanjirida bir xil ma'lumot bir necha
   * marta uzatilardi.
   */
  replyTo: {
    select: {
      id: true,
      body: true,
      senderId: true,
      imageUrl: true,
      voiceUrl: true,
      deletedAt: true,
      sender: { select: { firstName: true, lastName: true, profile: { select: { username: true } } } },
    },
  },
  /**
   * Reaksiyalar xabar bilan BIRGA olinadi.
   *
   * Alohida so'rov qilinsa, ular jonli oqimga tushmasdi: suhbatdosh
   * qo'ygan reaksiya faqat sahifa yangilangandan keyin ko'rinardi.
   *
   * `emoji` va `userId` yetarli — kim qo'ygani ekranda ko'rsatilmaydi.
   */
  reactions: { select: { emoji: true, userId: true } },
} as const;

type MessageRow = Prisma.MessageGetPayload<{ select: typeof MESSAGE_SELECT }>;

/** Iqtibosdagi ismni yasaydi: o'zimniki bo'lsa "Siz". */
function quoteAuthorName(
  sender: { firstName: string | null; lastName: string | null; profile: { username: string } | null },
  senderId: string,
  viewerId: string,
): string {
  if (senderId === viewerId) return 'Siz';

  const fullName = [sender.firstName, sender.lastName].filter(Boolean).join(' ');

  return fullName || (sender.profile?.username ? `@${sender.profile.username}` : 'Foydalanuvchi');
}

function toMessageView(row: MessageRow, viewerId: string, peerLastReadAt: Date | null): MessageView {
  return {
    id: row.id,
    // O'chirilgan xabar MATNI yuborilmaydi — u brauzerda ko'rinib qolmasligi kerak.
    body: row.deletedAt ? '' : row.body,
    // Rasm va ovoz ham xuddi shunday: o'chirilgan xabarda ko'rinmaydi.
    imageUrl: row.deletedAt ? null : row.imageUrl,
    voiceUrl: row.deletedAt ? null : row.voiceUrl,
    voiceSeconds: row.deletedAt ? null : row.voiceSeconds,
    replyTo: row.replyTo
      ? {
          id: row.replyTo.id,
          authorName: quoteAuthorName(row.replyTo.sender, row.replyTo.senderId, viewerId),
          preview: quotePreview(
            row.replyTo.body,
            row.replyTo.voiceUrl ? 'VOICE' : row.replyTo.imageUrl ? 'IMAGE' : 'TEXT',
            row.replyTo.deletedAt !== null,
          ),
          isDeleted: row.replyTo.deletedAt !== null,
        }
      : null,
    editedAt: row.editedAt?.toISOString() ?? null,
    /**
     * O'chirilgan xabarda reaksiyalar ham KO'RSATILMAYDI.
     *
     * Qatorlar bazada qoladi (xabar butunlay o'chirilmagani kabi),
     * lekin ekranda o'chirilgan xabar ostida osilib turgan emoji
     * mantiqsiz ko'rinardi.
     */
    reactions: row.deletedAt ? [] : aggregateReactions(row.reactions, viewerId),
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

/** Ko'ruvchi tanlagan suhbat foni. */
function viewerWallpaper(row: ConversationRow, viewerId: string): ChatWallpaperName {
  const own = row.members.find((member) => member.userId === viewerId);

  return resolveWallpaper(own?.user.profile?.chatWallpaper).value;
}

export async function getThread(conversationId: string, viewerId: string): Promise<ThreadView> {
  const row = await requireMembership(conversationId, viewerId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    select: MESSAGE_SELECT,
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
    wallpaper: viewerWallpaper(row, viewerId),
    calls,
  };
}

export interface SendMessagePayload {
  body: string;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  voiceSeconds?: number | null;
  replyToId?: string | null;
}

/**
 * Xabar yuboradi.
 *
 * ── Nima uchun ARGUMENTLAR obyektda ──────────────────────────────────
 * Ilgari ular ketma-ket yozilardi: `(id, senderId, body, imageUrl)`.
 * Ovoz qo'shilishi bilan ular oltitaga yetardi va chaqiruvda qaysi
 * biri qaysi joyda ekanini eslab qolish kerak bo'lardi — bu esa
 * "rasm o'rniga ovoz uzatib yuborish" kabi jimgina xatoga eng ochiq
 * joy.
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  payload: SendMessagePayload,
): Promise<MessageView> {
  const { body, imageUrl = null, voiceUrl = null, voiceSeconds = null, replyToId = null } = payload;

  const row = await requireMembership(conversationId, senderId);

  const otherId = peerUserId(row, senderId);

  /**
   * Javob berilayotgan xabar SHU suhbatdanmi.
   *
   * ── Nima uchun bu tekshiruv MAJBURIY ────────────────────────────────
   * `replyToId` brauzerdan keladi. Tekshiruvsiz begona suhbatdagi
   * xabarning ID'sini yuborish mumkin bo'lardi va uning MATNI
   * iqtibosda ko'rinardi — ya'ni begona yozishmani o'qish yo'li.
   */
  if (replyToId) {
    const quoted = await prisma.message.findFirst({
      where: { id: replyToId, conversationId },
      select: { id: true },
    });

    if (!quoted) {
      throw new NotFoundError('Javob berilayotgan xabar');
    }
  }

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
      data: { conversationId, senderId, body, imageUrl, voiceUrl, voiceSeconds, replyToId, deliveredAt },
      select: MESSAGE_SELECT,
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
    /**
     * Matnsiz xabarda push'da turining nomi ko'rinadi
     * ("Rasm", "Ovozli xabar") — bo'sh bildirishnoma foydasiz.
     */
    const preview = body || messageKindText(voiceUrl ? 'VOICE' : imageUrl ? 'IMAGE' : 'TEXT');

    void notifyNewMessage(otherId, conversationId, senderId, preview);
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
      body: body.length > 120 ? `${body.slice(0, 120)}…` : body,
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

/**
 * Xabarni tahrirlaydi.
 *
 * ── Nima uchun VAQT CHEGARASI yo'q ──────────────────────────────────
 * WhatsApp 15 daqiqa beradi, Telegram esa 48 soat. Ikkalasi ham
 * shartli chegara: asosiy himoya — "tahrirlangan" belgisi, u
 * suhbatdoshga matn o'zgarganini har doim aytadi.
 *
 * Chegara qo'yilsa, "kecha yozgan xatoimni tuzata olmayman" degan
 * ma'nosiz to'siq paydo bo'lardi.
 */
export async function editMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  body: string,
): Promise<MessageView> {
  const row = await requireMembership(conversationId, userId);

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
    select: { id: true, senderId: true, deletedAt: true, imageUrl: true, voiceUrl: true },
  });

  if (!message || message.deletedAt) {
    throw new NotFoundError('Xabar');
  }

  if (message.senderId !== userId) {
    throw new ForbiddenError("Faqat o'z xabaringizni tahrirlay olasiz.");
  }

  /**
   * Rasm va ovoz tahrirlanmaydi.
   *
   * Ularning "matni" yo'q — o'zgartirish uchun qayta yuborish kerak.
   * Tahrirlashga ruxsat berilsa, rasmli xabar matnli bo'lib qolardi.
   */
  if (message.imageUrl || message.voiceUrl) {
    throw new ValidationError("Rasm va ovozli xabarni tahrirlab bo'lmaydi.");
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { body, editedAt: new Date() },
    select: MESSAGE_SELECT,
  });

  logger.info({ conversationId, messageId, userId }, 'Xabar tahrirlandi');

  return toMessageView(updated, userId, peerLastRead(row, userId));
}

/**
 * Xabarni o'chiradi.
 *
 * ── Nima uchun QATOR o'chirilmaydi ──────────────────────────────────
 * Suhbatning tartibi buzilmasligi kerak: o'chirilgan xabar o'rnida
 * "Xabar o'chirilgan" turadi. Bundan tashqari unga berilgan javoblar
 * ham havolasiz qolmaydi.
 *
 * ── Nima uchun HAMMA uchun o'chadi ──────────────────────────────────
 * "Faqat menda o'chirish" ham bor imkoniyat, lekin u har xabar uchun
 * kim ko'rgan-ko'rmaganini alohida saqlashni talab qiladi. Odam esa
 * odatda "u ko'rmasin" deb o'chiradi — ya'ni kerakli xulq aynan shu.
 */
export async function deleteMessage(
  conversationId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  await requireMembership(conversationId, userId);

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
    select: { id: true, senderId: true, deletedAt: true, imageUrl: true, voiceUrl: true },
  });

  if (!message || message.deletedAt) {
    throw new NotFoundError('Xabar');
  }

  if (message.senderId !== userId) {
    throw new ForbiddenError("Faqat o'z xabaringizni o'chira olasiz.");
  }

  await prisma.message.update({
    where: { id: messageId },
    /**
     * Rasm va ovoz manzillari ham TOZALANADI.
     *
     * Ular qolsa, manzilni bilgan odam faylni baribir ocha olardi —
     * ya'ni "o'chirdim" degani yolg'on bo'lardi.
     */
    data: { deletedAt: new Date(), imageUrl: null, voiceUrl: null, voiceSeconds: null },
  });

  // Fayllarning o'zi ham o'chiriladi (kutilmaydi — javob tez bo'lishi kerak).
  void deleteImageByUrl(message.imageUrl);
  void deleteImageByUrl(message.voiceUrl);

  logger.info({ conversationId, messageId, userId }, "Xabar o'chirildi");
}

/**
 * Xabarga reaksiya qo'yadi, almashtiradi yoki olib tashlaydi.
 *
 * ── Nima uchun BITTA amal, uchtasi emas ──────────────────────────────
 * Brauzer tomonida bularning uchalasi ham bitta harakat: emoji
 * bosiladi. Uchta alohida endpoint bo'lsa, brauzer avval "qaysi
 * reaksiyam bor?" deb so'rab, keyin qaysi birini chaqirishni hal
 * qilishi kerak bo'lardi — ikkita so'rov va ikkisi orasida
 * o'zgarishga ochiq oraliq.
 *
 * Shuning uchun qaror SERVERDA qabul qilinadi:
 *   yo'q edi          → qo'yiladi
 *   o'sha emoji bor   → olib tashlanadi (ikkinchi bosish — bekor qilish)
 *   boshqa emoji bor  → almashtiriladi
 *
 * @returns Xabarning YANGI reaksiyalari — brauzer qayta so'ramaydi.
 */
export async function toggleReaction(
  conversationId: string,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<MessageReactionView[]> {
  await requireMembership(conversationId, userId);

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
    select: { id: true, senderId: true, deletedAt: true, body: true, imageUrl: true, voiceUrl: true },
  });

  if (!message || message.deletedAt) {
    throw new NotFoundError('Xabar');
  }

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId: { messageId, userId } },
    select: { id: true, emoji: true },
  });

  let isNew = false;

  if (!existing) {
    /**
     * `create` P2002 bilan tugashi mumkin: ikkita qurilmadan bir
     * vaqtda bosilsa, ikkalasi ham "yo'q ekan" deb ko'radi.
     *
     * Bazadagi yagona indeks ikkinchisini rad etadi — bu XATO emas,
     * kutilgan holat. Shuning uchun uni "allaqachon qo'yilgan" deb
     * qabul qilamiz.
     */
    try {
      await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
      isNew = true;
    } catch (error) {
      const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (!isDuplicate) throw error;
    }
  } else if (existing.emoji === emoji) {
    // Ikkinchi marta bosish — bekor qilish.
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.update({ where: { id: existing.id }, data: { emoji } });
  }

  const rows = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });

  /**
   * Xabar egasiga turtki — faqat YANGI reaksiyada.
   *
   * Almashtirish va bekor qilishda bildirishnoma yuborilmaydi: odam
   * emojini bir necha marta almashtirib ko'rishi mumkin va har
   * bosishda telefon jiringlashi bezovta qilardi.
   */
  if (isNew && message.senderId !== userId) {
    void notifyReaction(message.senderId, conversationId, userId, emoji, {
      body: message.body,
      imageUrl: message.imageUrl,
      voiceUrl: message.voiceUrl,
    });
  }

  logger.info({ conversationId, messageId, userId }, "Reaksiya o'zgardi");

  return aggregateReactions(rows, userId);
}

/**
 * Reaksiya haqida xabar egasiga push yuboradi.
 *
 * Ochiq suhbatga yuborilmaydi: odam reaksiyani allaqachon ko'rib
 * turibdi.
 */
async function notifyReaction(
  recipientId: string,
  conversationId: string,
  reactorId: string,
  emoji: string,
  message: { body: string; imageUrl: string | null; voiceUrl: string | null },
): Promise<void> {
  try {
    if (await isViewing(recipientId, conversationId)) return;

    const reactor = await prisma.user.findUnique({
      where: { id: reactorId },
      select: { firstName: true, lastName: true, profile: { select: { username: true } } },
    });

    const name =
      [reactor?.firstName, reactor?.lastName].filter(Boolean).join(' ') ||
      (reactor?.profile?.username ? `@${reactor.profile.username}` : 'Foydalanuvchi');

    /**
     * Qaysi xabarga qo'yilgani ham yoziladi.
     *
     * Faqat "Aziz 👍 qo'ydi" deb yozilsa, o'nlab xabarli suhbatda
     * qaysi biriga ekani noma'lum qolardi.
     */
    const preview = message.body || messageKindText(message.voiceUrl ? 'VOICE' : message.imageUrl ? 'IMAGE' : 'TEXT');

    await sendPush(recipientId, {
      title: name,
      body: preview ? `${emoji} — «${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}»` : emoji,
      url: `/messages/${conversationId}`,
      /**
       * Nishon SUHBATNIKIDAN farq qiladi: reaksiya kelgan xabarni
       * yangi xabar bildirishnomasi bosib ketmasligi kerak.
       */
      tag: `reaction-${conversationId}`,
      // Reaksiya — ikkinchi darajali xabar, bir soatdan keyin ahamiyatsiz.
      ttlSeconds: 60 * 60,
    });
  } catch (error) {
    logger.warn({ err: error, recipientId }, "Reaksiya haqida push yuborib bo'lmadi");
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
