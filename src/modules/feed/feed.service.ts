import { Prisma } from '@/generated/prisma/client';
import { ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { blockedUserIds, findBlock, isBlockedBetween } from '@/modules/moderation/moderation.service';
import { notifyUser } from '@/modules/notification/notification.service';
import { sendPush } from '@/modules/notification/push.service';
import type { CommentsQuery, FeedQuery } from '@/modules/feed/feed.schemas';
import type { CommentView, PostAuthorView, PostView } from '@/modules/feed/feed.types';

/**
 * Lenta moduli — postlar, yoqtirishlar va izohlar.
 *
 * ── Modulning ENG NOZIK joyi: SONLAR ──────────────────────────────────
 * `likeCount` va `commentCount` bazada ustun sifatida saqlanadi. Bu
 * lentani tez qiladi, lekin bitta shart bilan: son va qatorlar HAR
 * DOIM birga o'zgarishi kerak.
 *
 * Shuning uchun har bir o'zgarish `$transaction` ichida bajariladi.
 * Bittasi muvaffaqiyatsiz bo'lsa, ikkinchisi ham bekor qilinadi —
 * "yoqtirish bor, lekin son o'zgarmagan" holati bo'lishi mumkin emas.
 *
 * Qo'shimcha himoya bazada: son manfiy bo'lib qolsa, CHECK sharti
 * amalni to'xtatadi.
 */

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { username: true, isVerified: true } },
} as const;

type AuthorRow = Prisma.UserGetPayload<{ select: typeof AUTHOR_SELECT }>;

function toAuthorView(row: AuthorRow): PostAuthorView {
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');

  return {
    userId: row.id,
    username: row.profile?.username ?? '',
    fullName: fullName || null,
    avatarUrl: row.avatarUrl,
    isVerified: row.profile?.isVerified ?? false,
  };
}

/**
 * Postni o'qishda ishlatiladigan maydonlar.
 *
 * `likes` ichida FAQAT so'rov yuborgan odamning yoqtirishi olinadi.
 * Hammasini olish mumkin emas: mashhur postda minglab qator bo'lishi
 * mumkin, bizga esa "men yoqtirganmanmi?" degan javob yetarli.
 */
function postSelect(viewerId: string) {
  return {
    id: true,
    body: true,
    likeCount: true,
    commentCount: true,
    createdAt: true,
    deletedAt: true,
    authorId: true,
    author: { select: AUTHOR_SELECT },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
  } as const;
}

type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

function toPostView(row: PostRow, viewerId: string): PostView {
  return {
    id: row.id,
    // O'chirilgan postning MATNI yuborilmaydi — u brauzerda ko'rinib qolmasligi kerak.
    body: row.deletedAt ? '' : row.body,
    author: toAuthorView(row.author),
    createdAt: row.createdAt.toISOString(),
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    isLiked: row.likes.length > 0,
    isMine: row.authorId === viewerId,
    isDeleted: row.deletedAt !== null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Belgi (cursor)
// ─────────────────────────────────────────────────────────────────────

/**
 * Belgini yasaydi: vaqt va ID birga.
 *
 * Faqat vaqt yetarli emas — bir soniyada ikkita post yozilsa, ulardan
 * biri keyingi sahifada tushib qolardi.
 */
function buildCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}_${row.id}`;
}

function parseCursor(cursor: string): { createdAt: Date; id: string } {
  const separator = cursor.indexOf('_');

  return { createdAt: new Date(cursor.slice(0, separator)), id: cursor.slice(separator + 1) };
}

/** "Shu belgidan KEYINGI" (yangidan eskiga qarab). */
function olderThan(cursor: string | undefined): Prisma.PostWhereInput {
  if (!cursor) return {};

  const { createdAt, id } = parseCursor(cursor);

  return {
    OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
  };
}

/** Izohlar uchun: "shu belgidan KEYINGI" (eskidan yangiga qarab). */
function newerThan(cursor: string | undefined): Prisma.PostCommentWhereInput {
  if (!cursor) return {};

  const { createdAt, id } = parseCursor(cursor);

  return {
    OR: [{ createdAt: { gt: createdAt } }, { createdAt, id: { gt: id } }],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Lenta
// ─────────────────────────────────────────────────────────────────────

/**
 * O'chirilgan va to'xtatilgan hisoblarning postlari ko'rinmaydi.
 *
 * Hisob to'xtatilganda uning postlarini alohida o'chirish kerak
 * bo'lardi va bittasi albatta qolib ketardi. Bu shart esa bir joyda
 * turadi va hech qachon unutilmaydi.
 */
const LIVE_AUTHOR: Prisma.PostWhereInput = {
  deletedAt: null,
  author: { deletedAt: null, status: { not: 'SUSPENDED' } },
};

/** Men kuzatadigan odamlarning ID'lari. */
async function followingIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  return rows.map((row) => row.followingId);
}

export async function listFeed(
  viewerId: string,
  query: FeedQuery,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  const [hidden, following] = await Promise.all([
    blockedUserIds(viewerId),
    query.tab === 'FOLLOWING' ? followingIds(viewerId) : Promise.resolve<string[]>([]),
  ]);

  const hiddenSet = new Set(hidden);

  let scope: Prisma.PostWhereInput;

  if (query.tab === 'FOLLOWING') {
    /**
     * O'z postlarim ham "Obunalarim" bo'limida turadi.
     *
     * Yozgan odam o'z postini ko'rmasa, u "ketdimi yoki yo'qmi?" deb
     * ikkinchi marta yozardi.
     */
    const authorIds = [...following, viewerId].filter((id) => !hiddenSet.has(id));

    scope = { authorId: { in: authorIds } };
  } else {
    scope = hidden.length > 0 ? { authorId: { notIn: hidden } } : {};
  }

  /**
   * Chegaradan BITTA ko'p olinadi.
   *
   * Shu bitta qator "yana bormi?" degan savolga javob beradi — aks
   * holda alohida `count` so'rovi kerak bo'lardi va u butun jadvalni
   * sanardi.
   */
  const rows = await prisma.post.findMany({
    where: { ...LIVE_AUTHOR, ...scope, ...olderThan(query.cursor) },
    select: postSelect(viewerId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    posts: page.map((row) => toPostView(row, viewerId)),
    nextCursor: hasMore && page.length > 0 ? buildCursor(page[page.length - 1]) : null,
  };
}

/** Bitta odamning postlari — profil sahifasi uchun. */
export async function listUserPosts(
  viewerId: string,
  username: string,
  query: FeedQuery,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  const author = await prisma.user.findFirst({
    where: { profile: { username }, deletedAt: null },
    select: { id: true },
  });

  if (!author) {
    throw new NotFoundError('Profil');
  }

  if (author.id !== viewerId) {
    const block = await findBlock(viewerId, author.id);

    /**
     * Blok bo'lsa postlar ham ko'rinmaydi.
     *
     * Javob "topilmadi" — profil sahifasidagi bilan bir xil. Boshqa
     * javob berilsa, u bloklanganlikni oshkor qilardi.
     */
    if (block.blockedByMe || block.blockedByThem) {
      throw new NotFoundError('Profil');
    }
  }

  const rows = await prisma.post.findMany({
    where: { ...LIVE_AUTHOR, authorId: author.id, ...olderThan(query.cursor) },
    select: postSelect(viewerId),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    posts: page.map((row) => toPostView(row, viewerId)),
    nextCursor: hasMore && page.length > 0 ? buildCursor(page[page.length - 1]) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Post
// ─────────────────────────────────────────────────────────────────────

export async function createPost(authorId: string, body: string): Promise<PostView> {
  const row = await prisma.post.create({
    data: { authorId, body },
    select: postSelect(authorId),
  });

  logger.info({ authorId, postId: row.id }, 'Yangi post');

  return toPostView(row, authorId);
}

/**
 * Postni topadi (o'chirilgani ham).
 *
 * O'chirilgan post ATAYLAB qaytariladi: unga yozilgan izohlar
 * qolgan va odam ularni ochib ko'rishi mumkin.
 */
export async function getPost(postId: string, viewerId: string): Promise<PostView> {
  const row = await prisma.post.findFirst({
    where: { id: postId, author: { deletedAt: null } },
    select: postSelect(viewerId),
  });

  if (!row) {
    throw new NotFoundError('Post');
  }

  if (row.authorId !== viewerId && (await isBlockedBetween(viewerId, row.authorId))) {
    throw new NotFoundError('Post');
  }

  return toPostView(row, viewerId);
}

/**
 * Postni o'chiradi (faqat muallif).
 *
 * ── Nima uchun BUTUNLAY o'chirilmaydi ────────────────────────────────
 * Izohlar postga bog'langan. Post yo'qolsa, ular ham yo'qolardi va
 * izoh yozgan odamlarning mehnati bekorga ketardi. Bundan tashqari
 * shikoyat kelganda tekshiradigan narsa qolmasdi.
 */
export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, deletedAt: true },
  });

  if (!post || post.deletedAt) {
    throw new NotFoundError('Post');
  }

  if (post.authorId !== userId) {
    throw new ForbiddenError("Faqat o'z postingizni o'chira olasiz.");
  }

  await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });

  logger.info({ userId, postId }, "Post o'chirildi");
}

// ─────────────────────────────────────────────────────────────────────
// Yoqtirish
// ─────────────────────────────────────────────────────────────────────

/** Post mavjud, o'chirilmagan va ko'rish mumkinmi. */
async function requireLivePost(postId: string, viewerId: string): Promise<{ id: string; authorId: string }> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, author: { deletedAt: null, status: { not: 'SUSPENDED' } } },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (post.authorId !== viewerId && (await isBlockedBetween(viewerId, post.authorId))) {
    throw new NotFoundError('Post');
  }

  return post;
}

export async function likePost(postId: string, userId: string): Promise<{ isLiked: boolean; likeCount: number }> {
  const post = await requireLivePost(postId, userId);

  try {
    const [, updated] = await prisma.$transaction([
      prisma.postLike.create({ data: { postId, userId } }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }),
    ]);

    if (post.authorId !== userId) {
      void notifyPostLiked(post.authorId, postId, userId);
    }

    return { isLiked: true, likeCount: updated.likeCount };
  } catch (error) {
    /**
     * Allaqachon yoqtirilgan — bu XATO emas.
     *
     * Tugma ikki marta bosilgan bo'lishi mumkin. Natija baribir
     * kerakli holat: yoqtirish bor.
     */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;

    const current = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });

    return { isLiked: true, likeCount: current?.likeCount ?? 0 };
  }
}

export async function unlikePost(
  postId: string,
  userId: string,
): Promise<{ isLiked: boolean; likeCount: number }> {
  await requireLivePost(postId, userId);

  /**
   * Avval O'CHIRILADI, keyin son kamaytiriladi.
   *
   * `deleteMany` nechta qator o'chirilganini qaytaradi. Nol bo'lsa —
   * yoqtirish yo'q edi, demak sonni ham kamaytirmaslik kerak. Aks
   * holda ikki marta bosilganda son haqiqatdan pastga tushib ketardi.
   */
  const removed = await prisma.postLike.deleteMany({ where: { postId, userId } });

  if (removed.count === 0) {
    const current = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });

    return { isLiked: false, likeCount: current?.likeCount ?? 0 };
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { likeCount: { decrement: 1 } },
    select: { likeCount: true },
  });

  return { isLiked: false, likeCount: updated.likeCount };
}

// ─────────────────────────────────────────────────────────────────────
// Izohlar
// ─────────────────────────────────────────────────────────────────────

export async function listComments(
  postId: string,
  viewerId: string,
  query: CommentsQuery,
): Promise<{ comments: CommentView[]; nextCursor: string | null }> {
  // Postni ko'rish huquqi tekshiriladi — izohlar u orqali ochiladi.
  await getPost(postId, viewerId);

  const rows = await prisma.postComment.findMany({
    where: {
      postId,
      deletedAt: null,
      author: { deletedAt: null, status: { not: 'SUSPENDED' } },
      ...newerThan(query.cursor),
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      authorId: true,
      author: { select: AUTHOR_SELECT },
    },
    // Izohlar suhbat kabi o'qiladi: eskisidan yangisiga.
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    comments: page.map((row) => ({
      id: row.id,
      body: row.body,
      author: toAuthorView(row.author),
      createdAt: row.createdAt.toISOString(),
      isMine: row.authorId === viewerId,
    })),
    nextCursor: hasMore && page.length > 0 ? buildCursor(page[page.length - 1]) : null,
  };
}

export async function addComment(postId: string, authorId: string, body: string): Promise<CommentView> {
  const post = await requireLivePost(postId, authorId);

  const [comment] = await prisma.$transaction([
    prisma.postComment.create({
      data: { postId, authorId, body },
      select: {
        id: true,
        body: true,
        createdAt: true,
        authorId: true,
        author: { select: AUTHOR_SELECT },
      },
    }),
    prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
      select: { id: true },
    }),
  ]);

  if (post.authorId !== authorId) {
    void notifyPostCommented(post.authorId, postId, authorId, body);
  }

  return {
    id: comment.id,
    body: comment.body,
    author: toAuthorView(comment.author),
    createdAt: comment.createdAt.toISOString(),
    isMine: true,
  };
}

/**
 * Izohni o'chiradi.
 *
 * ── Nima uchun POST EGASI ham o'chira oladi ──────────────────────────
 * Izoh mening postimda turadi va uni mening obunachilarim o'qiydi.
 * Faqat izoh muallifi o'chira olsa, haqoratli izohni olib tashlashning
 * yagona yo'li shikoyat yozib, moderatorni kutish bo'lardi.
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, authorId: true, deletedAt: true, post: { select: { authorId: true } } },
  });

  if (!comment || comment.deletedAt) {
    throw new NotFoundError('Izoh');
  }

  const isCommentAuthor = comment.authorId === userId;
  const isPostAuthor = comment.post.authorId === userId;

  if (!isCommentAuthor && !isPostAuthor) {
    throw new ForbiddenError("Bu izohni o'chirishga ruxsatingiz yo'q.");
  }

  await prisma.$transaction([
    prisma.postComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } }),
    prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
      select: { id: true },
    }),
  ]);

  logger.info({ userId, commentId, byPostAuthor: isPostAuthor && !isCommentAuthor }, "Izoh o'chirildi");
}

// ─────────────────────────────────────────────────────────────────────
// Bildirishnomalar
// ─────────────────────────────────────────────────────────────────────

/** Bildirishnomada ko'rsatiladigan ism. */
async function actorName(userId: string): Promise<{ name: string; username: string }> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, profile: { select: { username: true } } },
  });

  const username = row?.profile?.username ?? '';
  const fullName = [row?.firstName, row?.lastName].filter(Boolean).join(' ');

  return { name: fullName || (username ? `@${username}` : 'Foydalanuvchi'), username };
}

/**
 * Yoqtirish haqida xabar.
 *
 * ── Nima uchun PUSH yuborilmaydi ─────────────────────────────────────
 * Yoqtirish — eng ko'p takrorlanadigan amal. Har biri uchun telefon
 * jiringlasa, odam bildirishnomalarni butunlay o'chirib qo'yardi va
 * shu bilan MUHIM xabarlarni ham yo'qotardi.
 *
 * Ilova ichidagi ro'yxatda esa u joyida turadi.
 */
async function notifyPostLiked(authorId: string, postId: string, likerId: string): Promise<void> {
  try {
    const actor = await actorName(likerId);

    await notifyUser(authorId, 'feed.post_liked', {
      postId,
      actorName: actor.name,
    });
  } catch (error) {
    logger.warn({ err: error, authorId }, "Yoqtirish haqida xabar yuborib bo'lmadi");
  }
}

/**
 * Izoh haqida xabar — bu yerda push HAM yuboriladi.
 *
 * Izoh yozish yoqtirishdan ancha kam uchraydi va u javob talab qiladi,
 * ya'ni odam undan darhol xabardor bo'lishi foydali.
 */
async function notifyPostCommented(
  authorId: string,
  postId: string,
  commenterId: string,
  body: string,
): Promise<void> {
  try {
    const actor = await actorName(commenterId);

    await notifyUser(authorId, 'feed.post_commented', {
      postId,
      actorName: actor.name,
      preview: body.length > 80 ? `${body.slice(0, 80)}…` : body,
    });

    await sendPush(authorId, {
      title: `${actor.name} izoh yozdi`,
      body: body.length > 120 ? `${body.slice(0, 120)}…` : body,
      url: `/feed/${postId}`,
      // Bir postdagi izohlar ekranda bitta bildirishnoma bo'lib turadi.
      tag: `post-${postId}`,
      ttlSeconds: 60 * 60 * 24,
    });
  } catch (error) {
    logger.warn({ err: error, authorId }, "Izoh haqida xabar yuborib bo'lmadi");
  }
}
