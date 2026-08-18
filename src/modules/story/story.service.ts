import { Prisma } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import { blockedUserIds, isBlockedBetween } from '@/modules/moderation/moderation.service';
import type { PostAuthorView, TaggedProductView } from '@/modules/feed/feed.types';
import type { CreateStoryInput } from '@/modules/story/story.schemas';
import {
  MAX_STORIES_PER_DAY,
  STORY_LIFETIME_HOURS,
  storyPostTitle,
  type StoryGroupView,
  type StoryView,
  type StoryViewerRow,
} from '@/modules/story/story.types';
import { deleteImageByUrl } from '@/modules/upload/upload.service';

/**
 * Hikoyalar moduli — 24 soatlik postlar.
 *
 * ── Modulning ENG NOZIK joyi: MUDDAT ──────────────────────────────────
 * Hikoya muddati o'tgach ko'rinmasligi kerak. Buni ikki yo'l bilan
 * qilish mumkin edi:
 *
 * 1. Vaqti-vaqti bilan ishlaydigan tozalovchi (cron) — muddati
 *    o'tganini o'chirib boradi.
 * 2. Har o'qishda `expiresAt > hozir` sharti.
 *
 * Faqat birinchisiga tayanish XAVFLI: tozalovchi bir marta ishlamay
 * qolsa, muddati o'tgan hikoya lentada paydo bo'lardi. Shuning uchun
 * HAR O'QISHDA shart tekshiriladi, tozalovchi esa faqat joy bo'shatadi.
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

function storySelect(viewerId: string) {
  return {
    id: true,
    caption: true,
    imageUrl: true,
    videoUrl: true,
    videoPosterUrl: true,
    videoSeconds: true,
    createdAt: true,
    expiresAt: true,
    viewCount: true,
    authorId: true,
    author: { select: AUTHOR_SELECT },
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
    /**
     * Ulashilgan post — FAQAT tugma uchun kerak bo'lgan maydonlar.
     *
     * `deletedAt` ham olinadi: o'chirilgan postga tugma
     * ko'rsatilmaydi, aks holda odam bo'sh sahifaga tushardi.
     */
    post: { select: { id: true, body: true, videoUrl: true, deletedAt: true } },
    /** Faqat SO'RAGAN odamning ko'rishi — hammasi emas. */
    views: { where: { viewerId }, select: { id: true }, take: 1 },
  } as const;
}

type StoryRow = Prisma.StoryGetPayload<{ select: ReturnType<typeof storySelect> }>;

function toProductView(row: NonNullable<StoryRow['product']>): TaggedProductView {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    priceTiyin: Number(row.price),
    shopName: row.shop.name,
    isAvailable: row.isActive && row.shop.isActive && row.stock > 0,
    // Bosishlar hikoyada sanalmaydi — u 24 soatlik va o'lchov bermaydi.
    clickCount: 0,
  };
}

function toStoryView(row: StoryRow, viewerId: string): StoryView {
  const isMine = row.authorId === viewerId;

  return {
    id: row.id,
    caption: row.caption ?? '',
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    videoPosterUrl: row.videoPosterUrl,
    videoSeconds: row.videoSeconds,
    product: row.product ? toProductView(row.product) : null,
    /*
      O'chirilgan post — tugma YO'Q.

      Post o'chirilganda ustun `null` ga o'tadi, lekin YUMSHOQ
      o'chirishda (`deletedAt`) qator o'z joyida qoladi. Ikkinchi
      holat ham tekshirilmasa, tugma "bu post o'chirilgan" degan
      sahifaga olib borardi.
    */
    post:
      row.post && !row.post.deletedAt
        ? {
            id: row.post.id,
            title: storyPostTitle(row.post.body, Boolean(row.post.videoUrl)),
            isVideo: Boolean(row.post.videoUrl),
          }
        : null,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    isSeen: row.views.length > 0,
    isMine,
    /**
     * Ko'rishlar soni FAQAT muallifga.
     *
     * Begonaga `0` ketadi — ya'ni son brauzerga umuman yetib
     * bormaydi. Uni faqat ekranda yashirish yetarli emasdi:
     * so'rov javobini ko'rish oson.
     */
    viewCount: isMine ? row.viewCount : 0,
  };
}

/** Muddati o'tmagan va o'chirilmagan hikoyalar. */
function liveStories(): Prisma.StoryWhereInput {
  return {
    deletedAt: null,
    expiresAt: { gt: new Date() },
    author: { deletedAt: null, status: { not: 'SUSPENDED' } },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Joylash
// ─────────────────────────────────────────────────────────────────────

export async function createStory(authorId: string, input: CreateStoryInput): Promise<StoryView> {
  /**
   * Kunlik chegara — muddati o'tganlari ham SANALADI.
   *
   * Aks holda odam ertalab yigirmata joylab, ular yo'qolgach yana
   * yigirmata joylardi va chegara ma'nosini yo'qotardi.
   */
  const since = new Date(Date.now() - STORY_LIFETIME_HOURS * 60 * 60 * 1000);
  const todayCount = await prisma.story.count({
    where: { authorId, createdAt: { gte: since }, deletedAt: null },
  });

  if (todayCount >= MAX_STORIES_PER_DAY) {
    throw new ConflictError(
      `Bir kunda ${MAX_STORIES_PER_DAY} tagacha hikoya joylash mumkin. Ertaga davom eting.`,
    );
  }

  /**
   * Mahsulot TEKSHIRILADI.
   *
   * ID brauzerdan keladi — uni istalgan qiymatga o'zgartirish mumkin.
   * Tekshirilmasa, yopilgan do'konning mahsuloti biriktirilib, tugma
   * bo'sh sahifaga olib borardi.
   */
  if (input.productId) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, isActive: true, shop: { isActive: true } },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError('Mahsulot');
    }
  }

  /**
   * Ulashilayotgan post ham TEKSHIRILADI.
   *
   * ── Nima uchun bu tekshiruv shart ───────────────────────────────────
   * ID brauzerdan keladi. Tekshirilmasa, o'chirilgan yoki umuman
   * mavjud bo'lmagan postga tugma yasalardi va odam bo'sh sahifaga
   * tushardi.
   *
   * ── Nima uchun BLOKLASH ham qaraladi ────────────────────────────────
   * Muallif bizni bloklagan bo'lsa, uning postini o'z hikoyamiz
   * orqali boshqalarga tarqatish — bloklashni chetlab o'tish
   * degani. Bloklash aynan buning oldini olish uchun bor.
   */
  if (input.postId) {
    const post = await prisma.post.findFirst({
      where: { id: input.postId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!post) {
      throw new NotFoundError('Post');
    }

    if (post.authorId !== authorId && (await isBlockedBetween(authorId, post.authorId))) {
      throw new ForbiddenError('Bu postni hikoyaga qo\'shib bo\'lmaydi.');
    }
  }

  const row = await prisma.story.create({
    data: {
      authorId,
      caption: input.caption.length > 0 ? input.caption : null,
      imageUrl: input.imageUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      videoPosterUrl: input.videoPosterUrl ?? null,
      videoSeconds: input.videoSeconds ?? null,
      productId: input.productId ?? null,
      postId: input.postId ?? null,
      /**
       * Muddat SAQLANADI, hisoblanmaydi.
       *
       * Ertaga muddat o'zgarsa, eski hikoyalar ham uzayib ketmasligi
       * kerak: odam joylagan paytdagi shart amal qilishi shart.
       */
      expiresAt: new Date(Date.now() + STORY_LIFETIME_HOURS * 60 * 60 * 1000),
    },
    select: storySelect(authorId),
  });

  logger.info({ authorId, storyId: row.id, hasVideo: Boolean(input.videoUrl) }, 'Yangi hikoya');

  return toStoryView(row, authorId);
}

// ─────────────────────────────────────────────────────────────────────
// Halqa (tray)
// ─────────────────────────────────────────────────────────────────────

/**
 * Lenta tepasidagi halqa: kimda yangi hikoya bor.
 *
 * ── Nima uchun MUALLIF bo'yicha guruhlanadi ──────────────────────────
 * Hikoyalar ro'yxat bo'lib chiqsa, bitta odamning beshta hikoyasi
 * beshta doira bo'lib turardi va halqa bitta odam bilan to'lib
 * ketardi.
 *
 * ── Kim ko'rinadi ────────────────────────────────────────────────────
 * Men kuzatadigan odamlar + O'ZIM. Notanish odamlarning hikoyasi
 * halqaga tushmaydi: u lentadan farqli o'laroq shaxsiyroq va
 * begonalar bilan to'lib ketmasligi kerak.
 */
export async function listStoryTray(viewerId: string): Promise<StoryGroupView[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });

  const authorIds = [...new Set([viewerId, ...following.map((row) => row.followingId)])];
  const hidden = await blockedUserIds(viewerId);
  const allowed = authorIds.filter((id) => !hidden.includes(id));

  const rows = await prisma.story.findMany({
    where: { ...liveStories(), authorId: { in: allowed } },
    orderBy: { createdAt: 'asc' },
    select: storySelect(viewerId),
  });

  const groups = new Map<string, StoryGroupView>();

  for (const row of rows) {
    const story = toStoryView(row, viewerId);
    const existing = groups.get(row.authorId);

    if (existing) {
      existing.stories.push(story);
      existing.isAllSeen = existing.isAllSeen && story.isSeen;
      existing.latestAt = story.createdAt;
      continue;
    }

    groups.set(row.authorId, {
      author: toAuthorView(row.author),
      stories: [story],
      isAllSeen: story.isSeen,
      latestAt: story.createdAt,
    });
  }

  const list = [...groups.values()];

  /**
   * Tartib: AVVAL ko'rilmaganlar, keyin yangilik bo'yicha.
   *
   * Ko'rilganlar tepada tursa, odam har safar ko'rgan hikoyalarini
   * o'tkazib, yangisini qidirishga majbur bo'lardi.
   *
   * O'z hikoyam esa doim BIRINCHI: u halqaning "joylash" tugmasi
   * bilan bir joyda turadi.
   */
  return list.sort((left, right) => {
    if (left.author.userId === viewerId) return -1;
    if (right.author.userId === viewerId) return 1;
    if (left.isAllSeen !== right.isAllSeen) return left.isAllSeen ? 1 : -1;

    return right.latestAt.localeCompare(left.latestAt);
  });
}

/**
 * Bitta odamning hikoyalari — profildan ochilganda.
 *
 * Halqadan farqi: bu yerda obuna shart emas. Odam profilga kirib
 * hikoyasini ko'rmoqchi bo'lsa, unga to'sqinlik qilishning ma'nosi
 * yo'q — hikoya baribir ochiq.
 */
export async function listUserStories(
  username: string,
  viewerId: string,
): Promise<StoryGroupView | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { username: username.toLowerCase() },
    select: { userId: true },
  });

  if (!profile) return null;

  if (profile.userId !== viewerId && (await isBlockedBetween(viewerId, profile.userId))) {
    return null;
  }

  const rows = await prisma.story.findMany({
    where: { ...liveStories(), authorId: profile.userId },
    orderBy: { createdAt: 'asc' },
    select: storySelect(viewerId),
  });

  if (rows.length === 0) return null;

  const stories = rows.map((row) => toStoryView(row, viewerId));

  return {
    author: toAuthorView(rows[0].author),
    stories,
    isAllSeen: stories.every((story) => story.isSeen),
    latestAt: stories[stories.length - 1].createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Ko'rish
// ─────────────────────────────────────────────────────────────────────

/**
 * Hikoya ko'rildi deb belgilaydi.
 *
 * ── Nima uchun O'Z hikoyasi sanalmaydi ───────────────────────────────
 * Muallif hikoyasini o'zi ochib, ko'ruvchilar ro'yxatida o'zini
 * ko'rardi — bu ma'nosiz va sonni buzadi.
 */
export async function markStorySeen(storyId: string, viewerId: string): Promise<void> {
  const story = await prisma.story.findFirst({
    where: { id: storyId, ...liveStories() },
    select: { id: true, authorId: true },
  });

  if (!story || story.authorId === viewerId) return;

  if (await isBlockedBetween(viewerId, story.authorId)) return;

  try {
    /**
     * Yozuv va son BIRGA o'zgaradi.
     *
     * Alohida bajarilsa, ikkinchisi yiqilganda "ko'rgan bor, lekin
     * son nol" holati qolardi.
     */
    await prisma.$transaction(async (tx) => {
      await tx.storyView.create({ data: { storyId, viewerId } });

      await tx.story.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 } },
        select: { id: true },
      });
    });
  } catch (error) {
    /**
     * Allaqachon ko'rilgan — bu XATO emas.
     *
     * Odam hikoyani ikkinchi marta ochgan bo'lishi mumkin. Son esa
     * "necha KISHI ko'rdi" degani, "necha marta ochildi" emas.
     */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }
}

/**
 * Hikoyani kim ko'rgani — FAQAT muallifga.
 *
 * ── Nima uchun begonaga berilmaydi ───────────────────────────────────
 * Bu ro'yxat — odamlarning xatti-harakati haqidagi ma'lumot. U faqat
 * o'sha hikoyani joylagan odamga tegishli.
 */
export async function listStoryViewers(
  storyId: string,
  requesterId: string,
): Promise<{ viewers: StoryViewerRow[]; viewCount: number }> {
  const story = await prisma.story.findFirst({
    where: { id: storyId, deletedAt: null },
    select: { id: true, authorId: true, viewCount: true },
  });

  if (!story) {
    throw new NotFoundError('Hikoya');
  }

  if (story.authorId !== requesterId) {
    throw new ForbiddenError("Bu ro'yxat faqat hikoya egasiga ko'rinadi.");
  }

  const rows = await prisma.storyView.findMany({
    where: { storyId },
    orderBy: { viewedAt: 'desc' },
    take: 200,
    select: { viewedAt: true, viewer: { select: AUTHOR_SELECT } },
  });

  return {
    viewers: rows.map((row) => ({
      author: toAuthorView(row.viewer),
      viewedAt: row.viewedAt.toISOString(),
    })),
    viewCount: story.viewCount,
  };
}

// ─────────────────────────────────────────────────────────────────────
// O'chirish va tozalash
// ─────────────────────────────────────────────────────────────────────

export async function deleteStory(storyId: string, userId: string): Promise<void> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { id: true, authorId: true, deletedAt: true, imageUrl: true, videoUrl: true },
  });

  if (!story || story.deletedAt) {
    throw new NotFoundError('Hikoya');
  }

  if (story.authorId !== userId) {
    throw new ForbiddenError("Faqat o'z hikoyangizni o'chira olasiz.");
  }

  /**
   * O'chirish SHARTLI: tugma ikki marta bosilishi mumkin.
   *
   * Ikkinchi so'rov "muvaffaqiyat" javobini olib, `deletedAt` ni
   * QAYTA yozardi va o'chirilgan vaqt haqiqatdan ajralib qolardi.
   */
  const claimed = await prisma.story.updateMany({
    where: { id: storyId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (claimed.count === 0) {
    throw new NotFoundError('Hikoya');
  }

  // Fayllar ham o'chiriladi — javob kutilmaydi.
  void deleteImageByUrl(story.imageUrl);
  void deleteImageByUrl(story.videoUrl);

  logger.info({ userId, storyId }, "Hikoya o'chirildi");
}

/**
 * Tozalash qanchalik tez-tez ishga tushadi (soniya).
 *
 * Bir soatda bir marta yetadi: fayllar muddati o'tgach darhol
 * o'chishi shart emas, ular shundoq ham hech kimga ko'rinmaydi.
 */
const PURGE_INTERVAL_SECONDS = 60 * 60;

/** Redisdagi qulf kaliti — bir vaqtda faqat bitta tozalash ishlaydi. */
const PURGE_LOCK_KEY = 'navix:story:purge-lock';

/**
 * Tozalashni FON REJIMIDA ishga tushiradi.
 *
 * ── Nima uchun jadval (cron) EMAS ────────────────────────────────────
 * Ilova serverssiz muhitda ishlaydi: doim yonib turgan jarayon yo'q,
 * ya'ni "har soatda bajar" degan buyruqni qo'yadigan joy yo'q.
 *
 * Buning o'rniga tozalash odamlar ilovadan foydalanganda o'zi
 * ishlaydi. Redisdagi qulf esa uni soatiga bir martadan ko'p
 * ishlatmaydi — aks holda har bir so'rov omborga murojaat qilardi.
 *
 * ── Nima uchun KUTILMAYDI ────────────────────────────────────────────
 * Halqa DARHOL ochilishi kerak. Tozalash esa hech kimni kutmaydigan
 * ish: u orqada bajarilib, xatosi ham yutiladi.
 */
export function schedulePurge(): void {
  void (async () => {
    try {
      const redis = getRedis();

      /**
       * `NX` — qulf FAQAT bo'sh bo'lsa qo'yiladi.
       *
       * Ikki so'rov bir vaqtda kelsa, ulardan faqat bittasi qulfni
       * oladi va faqat o'sha tozalaydi.
       */
      const locked = await redis.set(PURGE_LOCK_KEY, '1', 'EX', PURGE_INTERVAL_SECONDS, 'NX');

      if (locked !== 'OK') return;

      await purgeExpiredStoryFiles();
    } catch (error) {
      logger.warn({ err: error }, "Hikoya fayllarini tozalab bo'lmadi");
    }
  })();
}

/**
 * Muddati o'tgan hikoyalarning FAYLLARINI o'chiradi.
 *
 * ── Nima uchun bu kerak ──────────────────────────────────────────────
 * Hikoya 24 soatdan keyin ko'rinmaydi, lekin rasmi va videosi
 * omborda qolib ketadi. Kuniga yuzta hikoya joylansa, bir yilda
 * o'ttiz mingta keraksiz fayl to'planadi va ular uchun pul to'lanadi.
 *
 * ── Nima uchun YOZUV o'chirilmaydi ───────────────────────────────────
 * Shikoyat kelgan bo'lsa, moderator tekshiradigan narsa qolishi
 * kerak. Yozuv kichkina — fayl esa megabaytlar.
 *
 * @returns Nechta hikoyaning fayli tozalandi.
 */
export async function purgeExpiredStoryFiles(limit = 100): Promise<number> {
  const rows = await prisma.story.findMany({
    where: {
      expiresAt: { lt: new Date() },
      OR: [{ imageUrl: { not: null } }, { videoUrl: { not: null } }],
    },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    select: { id: true, imageUrl: true, videoUrl: true },
  });

  if (rows.length === 0) return 0;

  for (const row of rows) {
    await deleteImageByUrl(row.imageUrl);
    await deleteImageByUrl(row.videoUrl);
  }

  /**
   * Manzillar TOZALANADI.
   *
   * Usiz keyingi tozalash yana shu qatorlarni topib, allaqachon
   * o'chirilgan fayllarni qayta o'chirishga urinardi.
   */
  await prisma.story.updateMany({
    where: { id: { in: rows.map((row) => row.id) } },
    data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
  });

  logger.info({ count: rows.length }, "Muddati o'tgan hikoya fayllari tozalandi");

  return rows.length;
}
