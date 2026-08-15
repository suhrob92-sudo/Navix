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
import { extractHashtags, extractMentions, isValidHashtag } from '@/modules/feed/feed.text';
import type {
  CommentView,
  HashtagView,
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
        clickCount: true,
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
    /** Mavzular — matnda ko'k rangda, ro'yxatda qidiruv uchun. */
    hashtags: {
      select: { hashtag: { select: { tag: true } } },
      orderBy: { hashtag: { tag: 'asc' } },
    },
    likeCount: true,
    commentCount: true,
    shareCount: true,
    createdAt: true,
    editedAt: true,
    deletedAt: true,
    authorId: true,
    author: { select: AUTHOR_SELECT },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
    /** Yoqtirish kabi: faqat SO'RAGAN odamning saqlashi tekshiriladi. */
    saves: { where: { userId: viewerId }, select: { id: true }, take: 1 },
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
function toTaggedProduct(
  row: {
    id: string;
    name: string;
    slug: string;
    price: bigint;
    isActive: boolean;
    stock: number;
    shop: { name: string; isActive: boolean };
  },
  clickCount: number,
): TaggedProductView {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceTiyin: Number(row.price),
    shopName: row.shop.name,
    isAvailable: row.isActive && row.shop.isActive && row.stock > 0,
    clickCount,
  };
}

function toPostView(row: PostRow, viewerId: string): PostView {
  const isMine = row.authorId === viewerId;

  return {
    id: row.id,
    // O'chirilgan postning MATNI yuborilmaydi — u brauzerda ko'rinib qolmasligi kerak.
    body: row.deletedAt ? '' : row.body,
    // Rasm ham xuddi shunday.
    imageUrl: row.deletedAt ? null : row.imageUrl,
    videoUrl: row.deletedAt ? null : row.videoUrl,
    videoPosterUrl: row.deletedAt ? null : row.videoPosterUrl,
    videoSeconds: row.deletedAt ? null : row.videoSeconds,
    products: row.deletedAt
      ? []
      : /**
         * Bosishlar soni FAQAT postning egasiga yuboriladi.
         *
         * Begonaga `0` ketadi — ya'ni raqam brauzerga umuman
         * yetib bormaydi. Uni faqat ekranda yashirish yetarli
         * emasdi: so'rov javobini ko'rish oson.
         */
        row.products.map((link) => toTaggedProduct(link.product, isMine ? link.clickCount : 0)),
    viewCount: row.viewCount,
    hashtags: row.deletedAt ? [] : row.hashtags.map((link) => link.hashtag.tag),
    author: toAuthorView(row.author),
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    shareCount: row.shareCount,
    isLiked: row.likes.length > 0,
    isSaved: row.saves.length > 0,
    isMine,
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

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
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
      select: { id: true },
    });

    await syncHashtags(tx, created.id, data.body);

    return tx.post.findUniqueOrThrow({ where: { id: created.id }, select: postSelect(authorId) });
  });

  logger.info(
    { authorId, postId: row.id, hasVideo: Boolean(data.videoUrl), products: productIds.length },
    'Yangi post',
  );

  void notifyMentioned(authorId, row.id, data.body);

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

  const row = await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: postId },
      data: { body: body.trim(), editedAt: new Date() },
      select: { id: true },
    });

    // Matn o'zgardi — mavzular ham qayta hisoblanadi.
    await syncHashtags(tx, postId, body);

    return tx.post.findUniqueOrThrow({ where: { id: postId }, select: postSelect(userId) });
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
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.post.updateMany({
      where: { id: postId, deletedAt: null },
      // Rasm manzili ham tozalanadi — faylning o'zi quyida o'chiriladi.
      data: { deletedAt: new Date(), imageUrl: null },
    });

    if (claimed.count === 0) {
      throw new NotFoundError('Post');
    }

    /**
     * Mavzu bog'lanishlari ham uziladi.
     *
     * Aks holda "#poyabzal" ro'yxatida o'chirilgan postlar sanalib
     * turardi: mavzuda "12 ta post" deb yozilardi-yu, ochilganda
     * beshtasi ko'rinardi.
     */
    await syncHashtags(tx, postId, '');
  });

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
// Mavzular (xeshteg)
// ─────────────────────────────────────────────────────────────────────

/** Tranzaksiya ichidagi Prisma mijozi. */
type TxClient = Prisma.TransactionClient;

/**
 * Post matnidagi mavzularni bazaga moslashtiradi.
 *
 * ── Nima uchun "moslashtirish", oddiy qo'shish emas ───────────────────
 * Post tahrirlanganda mavzu qo'shilishi ham, olib tashlanishi ham
 * mumkin. Faqat qo'shsak, olib tashlangan mavzu bazada qolib,
 * "#poyabzal" ro'yxatida umuman aloqasiz post ko'rinardi.
 *
 * ── Nima uchun `postCount` alohida saqlanadi ──────────────────────────
 * Har safar sanash mumkin edi, lekin "mashhur mavzular" ro'yxati
 * lentaning har ochilishida chiziladi va u paytda o'nlab mavzuni
 * sanash kerak bo'lardi.
 */
async function syncHashtags(tx: TxClient, postId: string, body: string): Promise<void> {
  const wanted = extractHashtags(body);

  const current = await tx.postHashtag.findMany({
    where: { postId },
    select: { hashtagId: true, hashtag: { select: { tag: true } } },
  });

  const currentTags = current.map((link) => link.hashtag.tag);
  const toRemove = current.filter((link) => !wanted.includes(link.hashtag.tag));
  const toAdd = wanted.filter((tag) => !currentTags.includes(tag));

  if (toRemove.length > 0) {
    const removeIds = toRemove.map((link) => link.hashtagId);

    await tx.postHashtag.deleteMany({ where: { postId, hashtagId: { in: removeIds } } });
    await tx.hashtag.updateMany({
      where: { id: { in: removeIds } },
      data: { postCount: { decrement: 1 } },
    });
  }

  if (toAdd.length === 0) return;

  /**
   * `skipDuplicates` — poyga uchun.
   *
   * Ikki odam bir vaqtda `#yangi` yozgan bo'lsa, ikkalasi ham
   * "bunday mavzu yo'q" deb ko'rib, ikkalasi ham yaratishga
   * urinadi. Bittasi xato olardi — `skipDuplicates` bilan esa
   * ikkalasi ham muvaffaqiyatli tugaydi.
   */
  await tx.hashtag.createMany({
    data: toAdd.map((tag) => ({ tag })),
    skipDuplicates: true,
  });

  const rows = await tx.hashtag.findMany({ where: { tag: { in: toAdd } }, select: { id: true } });

  await tx.postHashtag.createMany({
    data: rows.map((row) => ({ postId, hashtagId: row.id })),
    skipDuplicates: true,
  });

  await tx.hashtag.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { postCount: { increment: 1 } },
  });
}

/**
 * Mashhur mavzular.
 *
 * Postsiz qolgan mavzular ko'rsatilmaydi: ular post o'chirilganda
 * paydo bo'ladi va ro'yxatni bo'sh havolalar bilan to'ldirardi.
 */
export async function listTrendingHashtags(limit = 12): Promise<HashtagView[]> {
  const rows = await prisma.hashtag.findMany({
    where: { postCount: { gt: 0 } },
    orderBy: [{ postCount: 'desc' }, { tag: 'asc' }],
    take: limit,
    select: { tag: true, postCount: true },
  });

  return rows.map((row) => ({ tag: row.tag, postCount: row.postCount }));
}

/**
 * Bitta mavzudagi postlar.
 *
 * ── Nima uchun bloklash bu yerda ham tekshiriladi ────────────────────
 * Mavzu sahifasi lentani chetlab o'tadigan ikkinchi yo'l. Bu yerda
 * tekshirilmasa, bloklagan odam o'zi bloklagan odamning postlarini
 * mavzu orqali bemalol ko'rardi.
 */
export async function listPostsByHashtag(
  tag: string,
  viewerId: string,
  cursor?: string,
  limit = 20,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  if (!isValidHashtag(tag)) {
    throw new NotFoundError('Mavzu');
  }

  const hidden = await blockedUserIds(viewerId);

  const rows = await prisma.post.findMany({
    where: {
      ...LIVE_AUTHOR,
      ...olderThan(cursor),
      hashtags: { some: { hashtag: { tag: tag.toLowerCase() } } },
      ...(hidden.length > 0 ? { authorId: { notIn: hidden } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: postSelect(viewerId),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((row) => toPostView(row, viewerId)),
    nextCursor: hasMore && page.length > 0 ? buildCursor(page[page.length - 1]) : null,
  };
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

/** Izohni o'qishda kerak bo'ladigan maydonlar. */
function commentSelect(viewerId: string) {
  return {
    id: true,
    body: true,
    createdAt: true,
    authorId: true,
    parentId: true,
    likeCount: true,
    replyCount: true,
    author: { select: AUTHOR_SELECT },
    likes: { where: { userId: viewerId }, select: { id: true }, take: 1 },
  } as const;
}

type CommentRow = Prisma.PostCommentGetPayload<{ select: ReturnType<typeof commentSelect> }>;

function toCommentView(row: CommentRow, viewerId: string): CommentView {
  return {
    id: row.id,
    body: row.body,
    author: toAuthorView(row.author),
    createdAt: row.createdAt.toISOString(),
    isMine: row.authorId === viewerId,
    parentId: row.parentId,
    likeCount: row.likeCount,
    isLiked: row.likes.length > 0,
    replyCount: row.replyCount,
  };
}

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
      /**
       * Javoblar asosiy ro'yxatga ARALASHMAYDI.
       *
       * `parentId` berilmasa faqat asosiy izohlar chiqadi; berilsa —
       * faqat o'sha izohning javoblari.
       */
      parentId: query.parentId ?? null,
      ...newerThan(query.cursor),
    },
    select: commentSelect(viewerId),
    // Izohlar suhbat kabi o'qiladi: eskisidan yangisiga.
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: query.limit + 1,
  });

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    comments: page.map((row) => toCommentView(row, viewerId)),
    nextCursor: hasMore && page.length > 0 ? buildCursor(page[page.length - 1]) : null,
  };
}

export async function addComment(
  postId: string,
  authorId: string,
  body: string,
  parentId?: string,
): Promise<CommentView> {
  const post = await requireLivePost(postId, authorId);

  /**
   * Javob doim ASOSIY izohga biriktiriladi.
   *
   * Odam javobga javob yozsa, uning `parentId` si o'sha javobning
   * emas, uning otasining ID si bo'ladi. Aks holda suhbat
   * cheksiz chuqurlashib, telefon ekranida o'qib bo'lmas holga
   * kelardi (YouTube ham aynan shunday qiladi).
   */
  let rootId: string | null = null;

  if (parentId) {
    const parent = await prisma.postComment.findFirst({
      where: { id: parentId, postId, deletedAt: null },
      select: { id: true, parentId: true },
    });

    if (!parent) {
      throw new NotFoundError('Izoh');
    }

    rootId = parent.parentId ?? parent.id;
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.postComment.create({
      data: { postId, authorId, body, parentId: rootId },
      select: commentSelect(authorId),
    });

    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
      select: { id: true },
    });

    if (rootId) {
      await tx.postComment.update({
        where: { id: rootId },
        data: { replyCount: { increment: 1 } },
        select: { id: true },
      });
    }

    return created;
  });

  if (rootId) {
    void notifyCommentReplied(rootId, postId, authorId, body);
  } else if (post.authorId !== authorId) {
    void notifyPostCommented(post.authorId, postId, authorId, body);
  }

  void notifyMentioned(authorId, postId, body);

  return toCommentView(comment, authorId);
}

// ─────────────────────────────────────────────────────────────────────
// Izohni yoqtirish
// ─────────────────────────────────────────────────────────────────────

/** Izoh mavjud va ko'rish mumkinmi. */
async function requireLiveComment(
  commentId: string,
  viewerId: string,
): Promise<{ id: string; postId: string; authorId: string }> {
  const comment = await prisma.postComment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, postId: true, authorId: true },
  });

  if (!comment) {
    throw new NotFoundError('Izoh');
  }

  // Postni ko'ra olmaydigan odam uning izohiga ham tegina olmaydi.
  await requireLivePost(comment.postId, viewerId);

  return comment;
}

export async function likeComment(
  commentId: string,
  userId: string,
): Promise<{ isLiked: boolean; likeCount: number }> {
  const comment = await requireLiveComment(commentId, userId);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.commentLike.create({ data: { commentId, userId } });

      return tx.postComment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });
    });

    if (comment.authorId !== userId) {
      void notifyCommentLiked(comment.authorId, comment.postId, userId);
    }

    return { isLiked: true, likeCount: updated.likeCount };
  } catch (error) {
    // Allaqachon yoqtirilgan — postdagi bilan bir xil qoida.
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;

    const current = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });

    return { isLiked: true, likeCount: current?.likeCount ?? 0 };
  }
}

export async function unlikeComment(
  commentId: string,
  userId: string,
): Promise<{ isLiked: boolean; likeCount: number }> {
  await requireLiveComment(commentId, userId);

  const removed = await prisma.commentLike.deleteMany({ where: { commentId, userId } });

  if (removed.count === 0) {
    const current = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: { likeCount: true },
    });

    return { isLiked: false, likeCount: current?.likeCount ?? 0 };
  }

  const updated = await prisma.postComment.update({
    where: { id: commentId },
    data: { likeCount: { decrement: 1 } },
    select: { likeCount: true },
  });

  return { isLiked: false, likeCount: updated.likeCount };
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
    select: {
      id: true,
      postId: true,
      authorId: true,
      parentId: true,
      deletedAt: true,
      post: { select: { authorId: true } },
    },
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
    const now = new Date();

    const claimed = await tx.postComment.updateMany({
      where: { id: commentId, deletedAt: null },
      data: { deletedAt: now },
    });

    if (claimed.count === 0) {
      throw new NotFoundError('Izoh');
    }

    /**
     * Asosiy izoh o'chirilsa — JAVOBLARI ham o'chadi.
     *
     * Aks holda javoblar otasiz qolardi: ular ro'yxatda umuman
     * ko'rinmaydi (chunki ro'yxat asosiy izohlar bo'yicha
     * quriladi), lekin `commentCount` da sanalib turardi va
     * "12 ta izoh" yozuvi ostida 4 tasi ko'rinardi.
     */
    const replies = comment.parentId
      ? { count: 0 }
      : await tx.postComment.updateMany({
          where: { parentId: commentId, deletedAt: null },
          data: { deletedAt: now },
        });

    await tx.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 + replies.count } },
      select: { id: true },
    });

    // Javob o'chirilsa — otasidagi javoblar soni kamayadi.
    if (comment.parentId) {
      await tx.postComment.update({
        where: { id: comment.parentId },
        data: { replyCount: { decrement: 1 } },
        select: { id: true },
      });
    }
  });

  logger.info({ userId, commentId, byPostAuthor: isPostAuthor && !isCommentAuthor }, "Izoh o'chirildi");
}

// ─────────────────────────────────────────────────────────────────────
// Saqlash (keyin ko'raman)
// ─────────────────────────────────────────────────────────────────────

/**
 * Postni saqlaydi.
 *
 * ── Nima uchun muallifga XABAR bermaydi ──────────────────────────────
 * Saqlash — shaxsiy belgi: "buni keyin ko'raman" yoki "buni sotib
 * olaman". Muallif buni bilsa, odam saqlashdan tortinardi.
 */
export async function savePost(postId: string, userId: string): Promise<{ isSaved: boolean }> {
  await requireLivePost(postId, userId);

  try {
    await prisma.postSave.create({ data: { postId, userId } });
  } catch (error) {
    // Ikki marta bosilgan — natija baribir kerakli holat.
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }

  return { isSaved: true };
}

export async function unsavePost(postId: string, userId: string): Promise<{ isSaved: boolean }> {
  /**
   * Bu yerda post TEKSHIRILMAYDI.
   *
   * Muallif postni o'chirgan bo'lishi mumkin, lekin u hali ham
   * mening "saqlanganlarim"da turadi. Tekshirsak, uni ro'yxatdan
   * olib tashlashning iloji qolmasdi.
   */
  await prisma.postSave.deleteMany({ where: { postId, userId } });

  return { isSaved: false };
}

/**
 * Saqlangan postlar — oxirgi saqlangani birinchi.
 *
 * ── Nima uchun POST vaqti emas, SAQLASH vaqti bo'yicha ───────────────
 * Odam bir yillik postni bugun saqlashi mumkin. Post vaqti bo'yicha
 * tartiblansa, u ro'yxatning eng tubida paydo bo'lardi va odam uni
 * umuman topa olmasdi.
 */
export async function listSavedPosts(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  const rows = await prisma.postSave.findMany({
    where: {
      userId,
      ...(cursor
        ? (() => {
            const { createdAt, id } = parseCursor(cursor);

            return { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] };
          })()
        : {}),
      // O'chirilgan post saqlanganlar ro'yxatida ham ko'rinmaydi.
      post: LIVE_AUTHOR,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: { id: true, createdAt: true, post: { select: postSelect(userId) } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((row) => toPostView(row.post, userId)),
    nextCursor: hasMore && page.length > 0 ? buildCursor(page[page.length - 1]) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Ulashish
// ─────────────────────────────────────────────────────────────────────

/**
 * Ulashishni sanaydi.
 *
 * ── Nima uchun "kim ulashdi" saqlanmaydi ─────────────────────────────
 * Ulashish brauzerda bajariladi: havola nusxalanadi yoki Telegramga
 * uzatiladi. Bizga faqat SON kerak — u muallifga "bu post tarqalyapti"
 * degan belgi beradi.
 *
 * O'z postini ulashish ham sanaladi: muallif havolani tarqatishi —
 * bu ham haqiqiy ulashish.
 */
export async function markShared(postId: string, viewerId: string): Promise<{ shareCount: number }> {
  await requireLivePost(postId, viewerId);

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { shareCount: { increment: 1 } },
    select: { shareCount: true },
  });

  return { shareCount: updated.shareCount };
}

// ─────────────────────────────────────────────────────────────────────
// Mahsulot tugmasi bosilishi
// ─────────────────────────────────────────────────────────────────────

/**
 * Bosishlar soni qaysi qiymatlarda muallifga XABAR beriladi.
 *
 * ── Nima uchun har bosishda emas ─────────────────────────────────────
 * Mashhur videoda kuniga yuzlab bosish bo'lishi mumkin. Har biri
 * uchun xabar kelsa, odam bildirishnomalarni butunlay o'chirib
 * qo'yardi va MUHIM xabarlarni ham yo'qotardi.
 *
 * Bosqichlar esa haqiqiy yangilik beradi: "10 marta bosildi" —
 * bu video ishlayotganini bildiradi.
 */
const CLICK_MILESTONES: readonly number[] = [1, 10, 50, 100, 500, 1_000];

/**
 * Videodagi mahsulot tugmasi bosilganini yozadi.
 *
 * ── Nima uchun O'Z bosishi sanalmaydi ────────────────────────────────
 * Ko'rishlar bilan bir xil sabab: muallif o'z tugmasini bosib,
 * sonni ko'tarib qo'ymasligi kerak.
 */
export async function markProductClicked(
  postId: string,
  productId: string,
  viewerId: string,
): Promise<void> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!post || post.authorId === viewerId) return;

  const updated = await prisma.postProduct.updateMany({
    where: { postId, productId },
    data: { clickCount: { increment: 1 } },
  });

  if (updated.count === 0) return;

  /**
   * Bosish KIM tomonidan qilingani ham yoziladi.
   *
   * Bu — xaridni videoga bog'lash uchun yagona yo'l: odam keyin
   * shu mahsulotni sotib olsa, buyurtma qaysi video keltirganini
   * aynan shu yozuvdan bilib olamiz.
   *
   * Bir odam + bir mahsulot uchun BITTA qator: har bosishda u
   * yangilanadi ("oxirgi bosish" qoidasi).
   */
  await prisma.postProductClick.upsert({
    where: { userId_productId: { userId: viewerId, productId } },
    create: { postId, productId, userId: viewerId },
    update: { postId, clickedAt: new Date() },
  });

  const link = await prisma.postProduct.findUnique({
    where: { postId_productId: { postId, productId } },
    select: { clickCount: true, product: { select: { name: true } } },
  });

  if (!link || !CLICK_MILESTONES.includes(link.clickCount)) return;

  void notifyProductClicked(post.authorId, postId, link.product.name, link.clickCount);
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

/**
 * Izohga javob haqida xabar — izoh MUALLIFIGA.
 *
 * Post egasiga alohida xabar YUBORILMAYDI: aks holda o'z postidagi
 * har bir javob uchun ikkita xabar kelardi.
 */
async function notifyCommentReplied(
  rootCommentId: string,
  postId: string,
  replierId: string,
  body: string,
): Promise<void> {
  try {
    const root = await prisma.postComment.findUnique({
      where: { id: rootCommentId },
      select: { authorId: true },
    });

    if (!root || root.authorId === replierId) return;

    const actor = await actorName(replierId);

    await notifyUser(root.authorId, 'feed.comment_replied', {
      postId,
      actorName: actor.name,
      preview: body.length > 80 ? `${body.slice(0, 80)}…` : body,
    });
  } catch (error) {
    logger.warn({ err: error, rootCommentId }, "Javob haqida xabar yuborib bo'lmadi");
  }
}

/** Izoh yoqtirilgani haqida xabar — push yo'q, yoqtirish bilan bir xil sabab. */
async function notifyCommentLiked(authorId: string, postId: string, likerId: string): Promise<void> {
  try {
    const actor = await actorName(likerId);

    await notifyUser(authorId, 'feed.comment_liked', { postId, actorName: actor.name });
  } catch (error) {
    logger.warn({ err: error, authorId }, "Izoh yoqtirilgani haqida xabar yuborib bo'lmadi");
  }
}

/**
 * Matnda eslangan odamlarga xabar.
 *
 * ── Nima uchun nom bazadan TEKSHIRILADI ──────────────────────────────
 * Matnda `@hechkim` deb yozish mumkin. Tekshirilmasa, har bir
 * yo'q nom uchun bo'sh so'rov ketardi.
 *
 * ── Nima uchun soni CHEKLANGAN ───────────────────────────────────────
 * Bitta postda 50 ta odamni eslab, ularning hammasiga xabar
 * yuborish — spamning eng oson yo'li.
 */
const MAX_MENTION_NOTIFICATIONS = 5;

async function notifyMentioned(actorId: string, postId: string, body: string): Promise<void> {
  try {
    const usernames = extractMentions(body).slice(0, MAX_MENTION_NOTIFICATIONS);

    if (usernames.length === 0) return;

    const profiles = await prisma.userProfile.findMany({
      where: { username: { in: usernames }, user: { deletedAt: null, status: { not: 'SUSPENDED' } } },
      select: { userId: true },
    });

    const actor = await actorName(actorId);

    for (const profile of profiles) {
      // O'zini eslash — xabar kerak emas.
      if (profile.userId === actorId) continue;

      await notifyUser(profile.userId, 'feed.mentioned', { postId, actorName: actor.name });
    }
  } catch (error) {
    logger.warn({ err: error, postId }, "Eslash haqida xabar yuborib bo'lmadi");
  }
}

/** Mahsulot tugmasi bosilgani haqida xabar — bosqichlarda. */
async function notifyProductClicked(
  authorId: string,
  postId: string,
  productName: string,
  clickCount: number,
): Promise<void> {
  try {
    await notifyUser(authorId, 'feed.product_clicked', { postId, productName, clickCount });
  } catch (error) {
    logger.warn({ err: error, authorId }, "Bosish haqida xabar yuborib bo'lmadi");
  }
}
