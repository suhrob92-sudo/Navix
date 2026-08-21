import { ANALYTICS_PERIODS, changePercent, type AnalyticsPeriod } from '@/config/analytics';
import { startOfTashkentDaysAgo, tashkentDateKey } from '@/lib/date';
import { prisma } from '@/lib/prisma';
import type { CreatorGrowth, GrowthDay, GrowthMetric } from '@/modules/feed/growth.types';

/**
 * Ijodkorning O'SISHI.
 *
 * ── Nima uchun bu xizmat alohida ──────────────────────────────────────
 * `video-stats.service.ts` bitta savolga javob beradi: "qaysi videom
 * yaxshi ishladi?". Bu yerdagi savol boshqa: "men umuman
 * o'syapmanmi?".
 *
 * Ikkalasi bitta faylga sig'sa, u ikki xil hisobni bir joyda
 * saqlagan bo'lardi va biri o'zgarganda ikkinchisi tasodifan
 * buzilardi.
 *
 * ── Nima uchun KO'RISHLAR bu yerda YO'Q ───────────────────────────────
 * Video ko'rishlari `Post.viewCount` ustunida SANOQ sifatida
 * saqlanadi — har bir ko'rishning vaqti yozilmaydi. Ya'ni "shu
 * hafta nechta ko'rish bo'ldi?" degan savolga javob beradigan
 * ma'lumot yo'q.
 *
 * Uni qo'shish uchun har bir ko'rishga alohida qator kerak bo'lardi:
 * bu jadval eng tez o'sadigani bo'lib, million qatorga yetardi.
 * Foydasi esa shubhali — bloger uchun obunachi va yoqtirish
 * dinamikasi muhimroq.
 *
 * Shuning uchun ko'rishlar YIG'INDI sifatida "Videolarim natijasi"
 * bo'limida qoladi va bu yerda ataylab ko'rsatilmaydi.
 */

/** Bitta so'rovda o'qiladigan eng ko'p hodisa (diagramma uchun). */
const MAX_EVENTS = 5_000;

function metric(current: number, previous: number): GrowthMetric {
  return { current, previous, changePercent: changePercent(current, previous) };
}

/** Bo'sh kunlar ham qatorda turadi — diagramma uzilmasligi kerak. */
function emptyDays(days: number, now: Date): GrowthDay[] {
  return Array.from({ length: days }, (_, index) => ({
    date: tashkentDateKey(startOfTashkentDaysAgo(days - 1 - index, now)),
    followers: 0,
    likes: 0,
  }));
}

export async function getCreatorGrowth(
  userId: string,
  days: AnalyticsPeriod,
  now: Date = new Date(),
): Promise<CreatorGrowth> {
  if (!(ANALYTICS_PERIODS as readonly number[]).includes(days)) {
    // Sxema buni allaqachon tekshiradi; bu ikkinchi to'siq.
    throw new Error(`Noto'g'ri davr: ${days}`);
  }

  /*
    Chegaralar KUN BOSHIDAN olinadi.

    Aks holda "oxirgi 7 kun" har soatda boshqacha oraliqni
    bildirardi va bloger sahifani ikki marta ochib, ikki xil son
    ko'rardi.
  */
  const from = startOfTashkentDaysAgo(days - 1, now);
  const previousFrom = startOfTashkentDaysAgo(days * 2 - 1, now);

  const mine = { post: { authorId: userId, deletedAt: null } } as const;

  /*
    Hamma hisob BIR VAQTDA yuboriladi.

    Ular bir-biriga bog'liq emas: obunachilarni sanash
    yoqtirishlarni kutib turishi kerak emas.
  */
  const [
    followerTotal,
    followersNow,
    followersBefore,
    likesNow,
    likesBefore,
    commentsNow,
    commentsBefore,
    postsNow,
    postsBefore,
    followEvents,
    likeEvents,
  ] = await Promise.all([
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followingId: userId, createdAt: { gte: from } } }),
    prisma.follow.count({
      where: { followingId: userId, createdAt: { gte: previousFrom, lt: from } },
    }),
    prisma.postLike.count({ where: { ...mine, createdAt: { gte: from } } }),
    prisma.postLike.count({ where: { ...mine, createdAt: { gte: previousFrom, lt: from } } }),
    /*
      O'chirilgan izohlar SANALMAYDI.

      Aks holda o'chirilgan izoh o'sish ko'rsatkichida qolib
      ketardi va son haqiqatga mos kelmasdi.
    */
    prisma.postComment.count({ where: { ...mine, deletedAt: null, createdAt: { gte: from } } }),
    prisma.postComment.count({
      where: { ...mine, deletedAt: null, createdAt: { gte: previousFrom, lt: from } },
    }),
    prisma.post.count({ where: { authorId: userId, deletedAt: null, createdAt: { gte: from } } }),
    prisma.post.count({
      where: { authorId: userId, deletedAt: null, createdAt: { gte: previousFrom, lt: from } },
    }),
    prisma.follow.findMany({
      where: { followingId: userId, createdAt: { gte: from } },
      select: { createdAt: true },
      take: MAX_EVENTS,
    }),
    prisma.postLike.findMany({
      where: { ...mine, createdAt: { gte: from } },
      select: { createdAt: true },
      take: MAX_EVENTS,
    }),
  ]);

  const daily = emptyDays(days, now);
  const byDate = new Map(daily.map((day) => [day.date, day]));

  for (const row of followEvents) {
    const day = byDate.get(tashkentDateKey(row.createdAt));

    if (day) day.followers += 1;
  }

  for (const row of likeEvents) {
    const day = byDate.get(tashkentDateKey(row.createdAt));

    if (day) day.likes += 1;
  }

  return {
    days,
    followerTotal,
    followers: metric(followersNow, followersBefore),
    likes: metric(likesNow, likesBefore),
    comments: metric(commentsNow, commentsBefore),
    posts: metric(postsNow, postsBefore),
    daily,
  };
}
