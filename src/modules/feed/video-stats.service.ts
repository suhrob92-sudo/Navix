import { MarketOrderStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { VideoStatsResponse, VideoStatRow } from '@/modules/feed/feed.types';

/**
 * Video statistikasi — "videom sotuvga ishladimi?".
 *
 * ── Nima uchun bu modul ALOHIDA ───────────────────────────────────────
 * `feed.service.ts` postlar bilan ishlaydi: yozish, o'chirish,
 * yoqtirish. Bu yerdagi kod esa BUYURTMALARGA qaraydi — ya'ni
 * marketplace moduliga tegishli ma'lumotga.
 *
 * Ikkalasini bitta faylga qo'shsak, lenta moduli buyurtmalar
 * jadvalini ham bilishi kerak bo'lardi va ikki modul bir-biriga
 * yopishib qolardi.
 */

/**
 * Xaridni videoga bog'lash OYNASI (kun).
 *
 * ── Nima uchun chegara kerak ─────────────────────────────────────────
 * Chegarasiz bo'lsa, bir yil oldin videoni ko'rgan odam bugun
 * mahsulotni qidiruv orqali topib sotib olsa ham, u video "sotdi"
 * deb hisoblanardi. Bu yolg'on ko'rsatkich bo'lardi.
 *
 * Yetti kun — odam o'ylab ko'rishi va maoshini kutishi uchun yetadi,
 * lekin aloqani ham yo'qotmaydi.
 */
export const ATTRIBUTION_WINDOW_DAYS = 7;

/**
 * Xaridorning savatidagi mahsulotlarni videolarga bog'laydi.
 *
 * ── Nima uchun buyurtma YARATILAYOTGANDA bog'lanadi ──────────────────
 * Keyinroq hisoblash ham mumkin edi, lekin unda odam bosishni
 * o'chirsa yoki oyna o'tib ketsa, bog'lanish yo'qolardi. Buyurtma
 * paytida yozilgan qiymat esa O'ZGARMAYDI — u tarixiy fakt.
 *
 * @returns Mahsulot ID → post ID. Bog'lanmagan mahsulot ro'yxatda yo'q.
 */
export async function resolveVideoSources(
  userId: string,
  productIds: string[],
): Promise<Map<string, string>> {
  const sources = new Map<string, string>();

  if (productIds.length === 0) return sources;

  const since = new Date(Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const clicks = await prisma.postProductClick.findMany({
    where: {
      userId,
      productId: { in: productIds },
      clickedAt: { gte: since },
      // O'chirilgan videoga bog'lashning ma'nosi yo'q.
      post: { deletedAt: null },
    },
    select: { productId: true, postId: true },
  });

  for (const click of clicks) {
    sources.set(click.productId, click.postId);
  }

  return sources;
}

/**
 * Bekor qilingan buyurtma SOTUV emas.
 *
 * Uni sanasak, sotuvchi ekranda ko'rgan daromad hech qachon
 * qo'liga tushmaydigan pul bo'lardi.
 */
const SOLD_STATUSES = [
  MarketOrderStatus.PENDING,
  MarketOrderStatus.CONFIRMED,
  MarketOrderStatus.PACKING,
  MarketOrderStatus.SHIPPED,
  MarketOrderStatus.DELIVERED,
];

/**
 * Mening videolarim va ularning natijasi.
 *
 * ── Nima uchun hamma son BIR JOYDA ───────────────────────────────────
 * Sotuvchiga alohida "ko'rishlar" va alohida "buyurtmalar" sahifasi
 * kerak emas. Unga kerak bo'lgan javob — QAYSI video ishlayapti.
 * Bu javob esa faqat sonlar YONMA-YON turganda ko'rinadi.
 */
export async function listVideoStats(userId: string): Promise<VideoStatsResponse> {
  const posts = await prisma.post.findMany({
    where: { authorId: userId, deletedAt: null, videoUrl: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      body: true,
      videoPosterUrl: true,
      videoSeconds: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      attachments: {
        select: {
          clickCount: true,
          product: { select: { name: true } },
          menuItem: { select: { name: true } },
          restaurant: { select: { name: true } },
          vacancy: { select: { title: true } },
          hotel: { select: { name: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { saves: true } },
    },
  });

  if (posts.length === 0) {
    return { videos: [], totals: emptyTotals() };
  }

  const postIds = posts.map((post) => post.id);

  /**
   * Buyurtmalar BITTA so'rovda yig'iladi.
   *
   * Har video uchun alohida so'rov yuborilsa, o'nta videosi bor
   * sotuvchida o'nta so'rov ketardi.
   */
  const orderRows = await prisma.marketOrderItem.groupBy({
    by: ['sourcePostId'],
    where: {
      sourcePostId: { in: postIds },
      order: { status: { in: SOLD_STATUSES } },
    },
    _count: { _all: true },
    _sum: { lineTotal: true },
  });

  const orders = new Map<string, { count: number; revenueTiyin: number }>();

  for (const row of orderRows) {
    if (!row.sourcePostId) continue;

    orders.set(row.sourcePostId, {
      count: row._count._all,
      revenueTiyin: Number(row._sum.lineTotal ?? 0n),
    });
  }

  const videos: VideoStatRow[] = posts.map((post) => {
    const sold = orders.get(post.id) ?? { count: 0, revenueTiyin: 0 };
    const clickCount = post.attachments.reduce((sum, link) => sum + link.clickCount, 0);

    return {
      postId: post.id,
      // Sarlavha o'rniga matnning boshi — video nomi degan maydon yo'q.
      title: titleFor(post.body, post.createdAt),
      posterUrl: post.videoPosterUrl,
      videoSeconds: post.videoSeconds,
      createdAt: post.createdAt.toISOString(),
      /*
        Nom TURGA qarab boshqa maydondan olinadi.

        Ish e'lonida u `title`, qolganlarida `name`. Nomsiz qator
        ro'yxatda bo'sh joy bo'lib turardi, shuning uchun hech biri
        topilmasa bu biriktirma tashlab yuboriladi.
      */
      attachmentNames: post.attachments
        .map(
          (link) =>
            link.product?.name ??
            link.menuItem?.name ??
            link.restaurant?.name ??
            link.vacancy?.title ??
            link.hotel?.name ??
            null,
        )
        .filter((name): name is string => name !== null),
      viewCount: post.viewCount,
      clickCount,
      orderCount: sold.count,
      revenueTiyin: sold.revenueTiyin,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      saveCount: post._count.saves,
    };
  });

  return { videos, totals: sumTotals(videos) };
}

function emptyTotals(): VideoStatsResponse['totals'] {
  return {
    videoCount: 0,
    viewCount: 0,
    clickCount: 0,
    orderCount: 0,
    revenueTiyin: 0,
  };
}

function sumTotals(videos: VideoStatRow[]): VideoStatsResponse['totals'] {
  return {
    videoCount: videos.length,
    viewCount: videos.reduce((sum, row) => sum + row.viewCount, 0),
    clickCount: videos.reduce((sum, row) => sum + row.clickCount, 0),
    orderCount: videos.reduce((sum, row) => sum + row.orderCount, 0),
    revenueTiyin: videos.reduce((sum, row) => sum + row.revenueTiyin, 0),
  };
}

/**
 * Ro'yxatda ko'rinadigan nom.
 *
 * Matnsiz video ham bo'lishi mumkin — unda sana ishlatiladi, chunki
 * bo'sh qator ro'yxatni o'qib bo'lmas holga keltirardi.
 */
function titleFor(body: string, createdAt: Date): string {
  const text = body.trim().split('\n')[0];

  if (text.length > 0) return text.length > 60 ? `${text.slice(0, 57)}...` : text;

  const day = String(createdAt.getUTCDate()).padStart(2, '0');
  const month = String(createdAt.getUTCMonth() + 1).padStart(2, '0');

  return `Video ${day}.${month}`;
}
