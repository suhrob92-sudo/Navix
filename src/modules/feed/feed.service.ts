import { Prisma } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { blockedUserIds, findBlock, isBlockedBetween } from '@/modules/moderation/moderation.service';
import { deleteImageByUrl } from '@/modules/upload/upload.service';
import { notifyUser } from '@/modules/notification/notification.service';
import { sendPush } from '@/modules/notification/push.service';
import type { CommentsQuery, FeedQuery } from '@/modules/feed/feed.schemas';
import { MAX_TAGGED_PRODUCTS } from '@/modules/feed/feed.types';
import type {
  CommentView,
  PostAuthorView,
  PostView,
  TaggedProductView,
} from '@/modules/feed/feed.types';

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
    imageUrl: true,
    videoUrl: true,
    videoPosterUrl: true,
    videoSeconds: true,
    viewCount: true,
    /**
     * Biriktirilgan mahsulotlar — tugma uchun kerakli MINIMUM.
     *
     * To'liq mahsulot olinsa, lentadagi har bir video uchun tavsif,
     * zaxira va boshqa ustunlar ham o'qilardi. Tugmada esa faqat
     * nom va narx ko'rinadi.
     */
    products: {
      select: {
        sortOrder: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            isActive: true,
            stock: true,
            shop: { select: { name: true, isActive: true } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    },
    likeCount: true,
    commentCount: true,
    createdAt: true,
    editedAt: true,
    deletedAt: true,
    authorId: true,
    author: { select: AUTHOR_SELECT },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
  } as const;
}

type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

/**
 * Biriktirilgan mahsulotni tugma uchun ko'rinishga o'giradi.
 *
 * ── Nima uchun "sotuvda" ALOHIDA hisoblanadi ─────────────────────────
 * Mahsulot yopilgan bo'lishi, do'kon yopilgan bo'lishi yoki zaxira
 * tugagan bo'lishi mumkin. Uchala holatda ham tugma bosilsa,
 * foydalanuvchi bo'sh sahifaga tushardi.
 *
 * Video esa o'z joyida qoladi: u mahsulotsiz ham qiziqarli
 * bo'lishi mumkin.
 */
function toTaggedProduct(row: {
  id: string;
  name: string;
  slug: string;
  price: bigint;
  isActive: boolean;
  stock: number;
  shop: { name: string; isActive: boolean };
}): TaggedProductView {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceTiyin: Number(row.price),
    shopName: row.shop.name,
    isAvailable: row.isActive && row.shop.isActive && row.stock > 0,
  };
}

function toPostView(row: PostRow, viewerId: string): PostView {
  return {
    id: row.id,
    // O'chirilgan postning MATNI yuborilmaydi — u brauzerda ko'rinib qolmasligi kerak.
    body: row.deletedAt ? '' : row.body,
    // Rasm ham xuddi shunday.
    imageUrl: row.deletedAt ? null : row.imageUrl,
    videoUrl: row.deletedAt ? null : row.videoUrl,
    videoPosterUrl: row.deletedAt ? null : row.videoPosterUrl,
    videoSeconds: row.deletedAt ? null : row.videoSeconds,
    products: row.deletedAt ? [] : row.products.map((link) => toTaggedProduct(link.product)),
    viewCount: row.viewCount,
    author: toAuthorView(row.author),
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
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

  if (query.tab === 'VIDEO') {
    /**
     * Video lentasi — hamma videolar, obunaga bog'liq emas.
     *
     * ── Nima uchun obunalarga cheklanmaydi ──────────────────────────
     * Yangi odamda obuna yo'q va uning video lentasi bo'sh bo'lardi.
     * Aynan shu lenta esa odamni ilovada ushlab turadigan joy:
     * u yerda hamma narsa qiziq bo'lishi kerak.
     */
    scope = {
      videoUrl: { not: null },
      ...(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}),
    };
  } else if (query.tab === 'FOLLOWING') {
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

export interface CreatePostData {
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  videoSeconds?: number | null;
  productIds?: string[];
}

export async function createPost(authorId: string, data: CreatePostData): Promise<PostView> {
  /** Takrorlangan ID lar olib tashlanadi — odam bir narsani ikki marta tanlashi mumkin. */
  const productIds = [...new Set(data.productIds ?? [])];

  /**
   * Mahsulotni faqat VIDEOGA biriktirish mumkin.
   *
   * Oddiy postda tugma qo'yadigan joy yo'q va u reklama uchun
   * eng oson yo'lga aylanardi: matnsiz post + mahsulot tugmasi.
   */
  if (productIds.length > 0 && !data.videoUrl) {
    throw new ConflictError('Mahsulotni faqat videoga biriktirish mumkin.');
  }

  if (productIds.length > MAX_TAGGED_PRODUCTS) {
    throw new ConflictError(`Bitta videoga ko'pi bilan ${MAX_TAGGED_PRODUCTS} ta mahsulot biriktiriladi.`);
  }

  /**
   * Mahsulotlar TEKSHIRILADI.
   *
   * ID brauzerdan keladi, ya'ni uni istalgan qiymatga o'zgartirish
   * mumkin. Tekshirilmasa, odam yopilgan do'konning mahsulotini
   * yoki umuman mavjud bo'lmagan ID ni biriktirib qo'yardi va
   * tugma bo'sh sahifaga olib borardi.
   *
   * Hammasi BITTA so'rovda tekshiriladi: beshta mahsulot uchun
   * beshta so'rov yuborish keraksiz.
   */
  if (productIds.length > 0) {
    const found = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, shop: { isActive: true } },
      select: { id: true },
    });

    if (found.length !== productIds.length) {
      throw new NotFoundError('Mahsulot');
    }
  }

  const row = await prisma.post.create({
    data: {
      authorId,
      body: data.body,
      imageUrl: data.imageUrl ?? null,
      videoUrl: data.videoUrl ?? null,
      videoPosterUrl: data.videoPosterUrl ?? null,
      videoSeconds: data.videoSeconds ?? null,
      // Tartib odam tanlagan tartibda saqlanadi.
      products: { create: productIds.map((id, index) => ({ productId: id, sortOrder: index })) },
    },
    select: postSelect(authorId),
  });

  logger.info(
    { authorId, postId: row.id, hasVideo: Boolean(data.videoUrl), products: productIds.length },
    'Yangi post',
  );

  return toPostView(row, authorId);
}

/**
 * Postni topadi (o'chirilgani ham).
 *
 * O'chirilgan post ATAYLAB qaytariladi: unga yozilgan izohlar
 * qolgan va odam ularni ochib ko'rishi mumkin.
 */
/**
 * Post matnini tahrirlaydi.
 *
 * ── Nima uchun faqat MATN ─────────────────────────────────────────────
 * Rasmni almashtirish boshqa ish: odamlar allaqachon eski rasmni
 * ko'rgan va yoqtirgan bo'lishi mumkin. Rasm o'zgarsa, post ma'nosi
 * butunlay boshqacha bo'lib qoladi — bu tuzatish emas, almashtirish.
 * Kerak bo'lsa yangi post yoziladi.
 *
 * ── Nima uchun VAQT CHEGARASI yo'q ────────────────────────────────────
 * Chatda tahrirlash cheklanmagan va bu yerda ham shunday: xatoni bir
 * yildan keyin ko'rish ham mumkin. Buning o'rniga "tahrirlangan"
 * belgisi qo'yiladi — o'quvchi matn o'zgarganini bilib turadi.
 */
export async function updatePost(postId: string, userId: string, body: string): Promise<PostView> {
  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, deletedAt: true, imageUrl: true },
  });

  if (!existing || existing.deletedAt) {
    throw new NotFoundError('Post');
  }

  if (existing.authorId !== userId) {
    throw new ForbiddenError("Faqat o'z postingizni tahrirlay olasiz.");
  }

  /**
   * Rasmsiz postning matni BO'SH bo'lib qolmasligi kerak.
   *
   * Aks holda lentada butunlay bo'sh kartochka paydo bo'lardi —
   * na matn, na rasm.
   */
  if (body.trim().length === 0 && !existing.imageUrl) {
    throw new ConflictError("Post bo'sh qololmaydi: matn yozing yoki postni o'chiring.");
  }

  const row = await prisma.post.update({
    where: { id: postId },
    data: { body: body.trim(), editedAt: new Date() },
    select: postSelect(userId),
  });

  logger.info({ userId, postId }, 'Post tahrirlandi');

  return toPostView(row, userId);
}

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
    select: { id: true, authorId: true, deletedAt: true, imageUrl: true },
  });

  if (!post || post.deletedAt) {
    throw new NotFoundError('Post');
  }

  if (post.authorId !== userId) {
    throw new ForbiddenError("Faqat o'z postingizni o'chira olasiz.");
  }

  /**
   * O'chirish SHARTLI — izohdagi bilan bir xil sabab.
   *
   * Postda sanaladigan son yo'q, shuning uchun bu yerda 500 xavfi
   * yo'q edi. Lekin ikkinchi so'rov "muvaffaqiyat" degan javob olib,
   * `deletedAt` ni QAYTA yozardi va o'chirilgan vaqt haqiqatdan
   * ajralib qolardi.
   */
  const claimed = await prisma.post.updateMany({
    where: { id: postId, deletedAt: null },
    // Rasm manzili ham tozalanadi — faylning o'zi quyida o'chiriladi.
    data: { deletedAt: new Date(), imageUrl: null },
  });

  if (claimed.count === 0) {
    throw new NotFoundError('Post');
  }

  /**
   * Rasm FAYLI ham o'chiriladi.
   *
   * ── Nima uchun kutilmaydi (`void`) ──────────────────────────────────
   * Fayl tashqi xizmatda (Vercel Blob) turadi va uni o'chirish bir
   * necha yuz millisekund olishi mumkin. Post esa ekrandan DARHOL
   * yo'qolishi kerak.
   *
   * Fayl o'chmay qolsa ham zarari yo'q: unga endi hech qanday havola
   * yo'q, ya'ni uni hech kim ocholmaydi.
   */
  void deleteImageByUrl(post.imageUrl);

  logger.info({ userId, postId }, "Post o'chirildi");
}

/**
 * Videoni ko'rilgan deb belgilaydi.
 *
 * ── Nima uchun sonni oshirishdan boshqa hech narsa qilinmaydi ─────────
 * "Kim ko'rdi" ni saqlash mumkin edi, lekin mashhur videoda bu
 * millionlab qator degani va bu ma'lumot hech kimga kerak emas:
 * sotuvchiga SON kerak — "videomni necha kishi ko'rdi".
 *
 * ── Nima uchun takrorlanish TEKSHIRILMAYDI ────────────────────────────
 * Bir odam videoni ikki marta ko'rsa, sanoq ikki marta oshadi. Buni
 * to'xtatish uchun har bir ko'rish yozib borilishi kerak bo'lardi —
 * ya'ni yuqoridagi millionlab qator.
 *
 * Instagram va TikTok ham xuddi shunday sanaydi: bu "ko'rishlar",
 * "ko'rgan odamlar" emas. Brauzer tomonida esa bitta video bitta
 * ochilishda BIR MARTA sanaladi.
 */
export async function markVideoViewed(postId: string, viewerId: string): Promise<void> {
  /**
   * O'Z videosi sanalmaydi.
   *
   * Aks holda muallif o'z videosini qayta-qayta ochib, sonni
   * ko'tarib qo'yardi — va bu son sotuvchi uchun ma'nosiz bo'lardi.
   */
  const updated = await prisma.post.updateMany({
    where: { id: postId, deletedAt: null, videoUrl: { not: null }, authorId: { not: viewerId } },
    data: { viewCount: { increment: 1 } },
  });

  if (updated.count === 0) {
    /**
     * Xato TASHLANMAYDI.
     *
     * Ko'rish — yordamchi ma'lumot. O'z videosi bo'lsa yoki post
     * o'chirilgan bo'lsa, brauzerga xato qaytarishning ma'nosi
     * yo'q: u baribir hech narsa qila olmaydi.
     */
    return;
  }
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

  /**
   * ── HAQIQIY XATO, sinovda topilgan ──────────────────────────────────
   * Ilgari bu yerda oddiy `update` turardi. Tugma ikki marta bosilsa
   * (yoki ikkita qurilmadan bir vaqtda), YUQORIDAGI tekshiruvdan
   * ikkala so'rov ham o'tib ketardi: ikkalasi ham izohni hali
   * "o'chirilmagan" ko'rardi.
   *
   * Natijada `commentCount` ikki marta kamayardi. Bazadagi CHECK
   * sharti buni to'xtatib qolardi — lekin foydalanuvchi "Serverda
   * kutilmagan xatolik" degan 500 javobini olardi.
   *
   * Endi o'chirish SHARTLI: `deletedAt IS NULL` bo'lgandagina
   * bajariladi. Nol qator o'zgarsa — kimdir ulgurgan va javob
   * tushunarli bo'ladi.
   */
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.postComment.updateMany({
      where: { id: commentId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw new NotFoundError('Izoh');
    }

    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
      select: { id: true },
    });
  });

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
