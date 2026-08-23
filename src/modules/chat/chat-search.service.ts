import { Prisma } from '@/generated/prisma/client';
import { buildSnippet, cleanSearchQuery, SEARCH_PAGE_SIZE } from '@/config/message-search';
import { toPrismaPagination } from '@/lib/api/pagination';
import { NotFoundError } from '@/lib/api/errors';
import { prisma } from '@/lib/prisma';
import type { MessageSearchHit, MessageSearchResult } from '@/modules/chat/chat-search.types';

/**
 * Xabarlarni qidirish.
 *
 * ── Modulning ENG MUHIM qoidasi: FAQAT o'z suhbatlarim ───────────────
 * Qidiruv butun `messages` jadvali bo'ylab boradi. Ya'ni bitta
 * unutilgan shart butun ilovaning barcha yozishmalarini ochib
 * yuborardi — bu tasavvur qilish mumkin bo'lgan eng og'ir sizish.
 *
 * Shuning uchun a'zolik sharti so'rovning O'ZIGA yozilgan va u
 * hech qanday yo'l bilan chetlab o'tilmaydi: `conversation.members`
 * ichida men bo'lishim SHART.
 */

/** Natijada ko'rsatiladigan maydonlar. */
const HIT_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  senderId: true,
  conversationId: true,
  sender: {
    select: {
      firstName: true,
      lastName: true,
      avatarUrl: true,
      profile: { select: { username: true } },
    },
  },
  conversation: {
    select: {
      kind: true,
      title: true,
      imageUrl: true,
      members: {
        select: {
          userId: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatarUrl: true,
              profile: { select: { username: true } },
            },
          },
        },
      },
      business: {
        select: {
          restaurant: { select: { name: true } },
          shop: { select: { name: true } },
        },
      },
    },
  },
} as const;

type HitRow = Prisma.MessageGetPayload<{ select: typeof HIT_SELECT }>;

type PersonRow = HitRow['sender'];

function displayName(person: PersonRow | null | undefined): string {
  if (!person) return 'Foydalanuvchi';

  const full = [person.firstName, person.lastName].filter(Boolean).join(' ');

  if (full) return full;

  return person.profile?.username ? `@${person.profile.username}` : 'Foydalanuvchi';
}

/** Suhbatning nomi — ro'yxatda qayerda topilganini ko'rsatish uchun. */
function conversationTitle(row: HitRow, viewerId: string): { title: string; imageUrl: string | null } {
  const conversation = row.conversation;

  if (conversation.kind === 'GROUP') {
    return { title: conversation.title ?? 'Guruh', imageUrl: conversation.imageUrl };
  }

  if (conversation.kind === 'BUSINESS') {
    const entity = conversation.business?.restaurant ?? conversation.business?.shop;

    return { title: entity?.name ?? 'Kompaniya', imageUrl: null };
  }

  const other = conversation.members.find((member) => member.userId !== viewerId);

  return { title: displayName(other?.user), imageUrl: other?.user.avatarUrl ?? null };
}

/**
 * Xabarlarni qidiradi.
 *
 * @param conversationId Berilsa — faqat SHU suhbat ichida qidiriladi.
 */
export async function searchMessages(
  viewerId: string,
  input: { query: string; conversationId?: string; page: number },
): Promise<MessageSearchResult> {
  const needle = cleanSearchQuery(input.query);

  const { skip, take } = toPrismaPagination({ page: input.page, pageSize: SEARCH_PAGE_SIZE });

  /**
   * Bitta suhbat ichida qidirilsa, a'zolik OLDIN tekshiriladi.
   *
   * ── Nima uchun alohida tekshiruv ────────────────────────────────────
   * Quyidagi shart baribir begona suhbatni topmasdi — u shunchaki
   * bo'sh natija qaytarardi. Lekin "hech narsa topilmadi" javobi
   * "bunday suhbat yo'q" javobidan farq qiladi: birinchisi suhbat
   * MAVJUDLIGINI tasdiqlab qo'yardi.
   */
  if (input.conversationId) {
    const member = await prisma.conversationMember.findFirst({
      where: { conversationId: input.conversationId, userId: viewerId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundError('Suhbat');
    }
  }

  const where: Prisma.MessageWhereInput = {
    /**
     * A'ZOLIK sharti — modulning eng muhim qatori.
     *
     * Usiz qidiruv butun ilovaning yozishmalarini qaytarardi.
     */
    conversation: { members: { some: { userId: viewerId } } },
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    /**
     * O'chirilgan xabarlar TOPILMAYDI.
     *
     * Ularning matni ekranda ham ko'rsatilmaydi — qidiruvda
     * chiqarish o'chirishning ma'nosini yo'q qilardi.
     */
    deletedAt: null,
    /**
     * Hodisa xabarlari ham TOPILMAYDI.
     *
     * "Ali guruhga qo'shdi" degan yozuvlarni hech kim qidirmaydi,
     * lekin ular natijalarni to'ldirib, haqiqiy xabarlarni pastga
     * surib yuborardi.
     */
    systemKind: null,
    body: { contains: needle, mode: 'insensitive' },
  };

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where,
      select: HIT_SELECT,
      /**
       * Yangilari OLDIN.
       *
       * Odam odatda yaqinda aytilgan narsani qidiradi: "kecha manzilni
       * yuborgan edingiz". Eskilardan boshlash uni varaqlashga
       * majbur qilardi.
       */
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.message.count({ where }),
  ]);

  const hits: MessageSearchHit[] = rows.map((row) => {
    const snippet = buildSnippet(row.body, needle);
    const conversation = conversationTitle(row, viewerId);

    return {
      messageId: row.id,
      conversationId: row.conversationId,
      conversationTitle: conversation.title,
      conversationImageUrl: conversation.imageUrl,
      senderName: displayName(row.sender),
      senderAvatarUrl: row.sender.avatarUrl,
      isMine: row.senderId === viewerId,
      snippet: snippet.text,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return { hits, total, query: needle };
}
