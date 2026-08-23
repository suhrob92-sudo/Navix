import { FoodOrderStatus, MarketOrderStatus, BookingStatus, Prisma } from '@/generated/prisma/client';
import {
  averageRating,
  BLOCK_REASON_TEXT,
  TARGET_COLUMN,
  TARGET_LABEL,
  type ReviewBlockReason,
  type ReviewTarget,
} from '@/config/review';
import { ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { tashkentDateKey } from '@/lib/date';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { ReviewListQuery, UpsertReviewInput } from '@/modules/review/review.schemas';
import {
  emptyDistribution,
  shortAuthorName,
  type ReviewEligibility,
  type ReviewSummaryView,
  type ReviewView,
  type ReviewsResponse,
} from '@/modules/review/review.types';

/**
 * Baho va sharh.
 *
 * ── Modulning ENG MUHIM joyi: XARIDNI TEKSHIRISH ──────────────────────
 * Baho qo'yish huquqi bir joyda, `findPurchaseProof()` da hal
 * qilinadi. U "bu odam shu narsani rostdan sotib olganmi?" degan
 * savolga javob beradi va DALILNI qaytaradi.
 *
 * Tekshiruv brauzerga ISHONMAYDI: mijoz "men xaridorman" deb ayta
 * olmaydi, u faqat baho yuboradi va serverning o'zi tekshiradi.
 *
 * ── Nima uchun reyting NUSXASI saqlanadi ──────────────────────────────
 * Har bir katalog so'rovida o'rtachani sanash mumkin edi, lekin
 * 40 mahsulotli sahifa 40 marta sanashga majbur bo'lardi.
 *
 * Shuning uchun natija ota jadvalga (`products.rating` va boshqalar)
 * yoziladi va u har bir sharh o'zgarganda BIR TRANZAKSIYADA
 * yangilanadi — ya'ni haqiqatdan orqada qolmaydi.
 */

/**
 * Baho qo'yishga ruxsat yo'q.
 *
 * ── Nima uchun 403, 404 emas ──────────────────────────────────────────
 * Narsa mavjud va odam uni ko'rib turibdi — yashirishning ma'nosi
 * yo'q. 404 unga "mahsulot yo'qoldi" degan noto'g'ri xabar berardi.
 *
 * ── Nima uchun sabab MAYDONDA saqlanadi ───────────────────────────────
 * Xabar matni foydalanuvchi uchun, sabab esa dastur uchun: brauzer
 * unga qarab tugmani boshqacha ko'rsatadi ("buyurtma bering" yoki
 * "yetkazilishini kuting").
 */
export class ReviewNotAllowedError extends ForbiddenError {
  readonly reason: ReviewBlockReason;

  constructor(reason: ReviewBlockReason) {
    super(BLOCK_REASON_TEXT[reason]);
    this.reason = reason;
  }
}

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

const REVIEW_SELECT = {
  id: true,
  rating: true,
  body: true,
  createdAt: true,
  authorId: true,
  author: { select: AUTHOR_SELECT },
} as const;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof REVIEW_SELECT }>;

function toReviewView(row: ReviewRow, viewerId: string | null): ReviewView {
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      name: shortAuthorName(row.author.firstName, row.author.lastName),
      avatarUrl: row.author.avatarUrl,
    },
    isMine: viewerId !== null && row.authorId === viewerId,
  };
}

/** Turning ustunini `where` shartiga aylantiradi. */
function targetFilter(target: ReviewTarget, targetId: string): Prisma.ReviewWhereInput {
  return { [TARGET_COLUMN[target]]: targetId } as Prisma.ReviewWhereInput;
}

/**
 * Narsa umuman bormi.
 *
 * ── Nima uchun alohida tekshiriladi ───────────────────────────────────
 * Tekshiruvsiz mavjud bo'lmagan ID uchun ham bo'sh ro'yxat qaytardi
 * va sahifa "sharh yo'q" deb ochilardi — holbuki mahsulotning o'zi
 * yo'q. Bu izlovchi robotlar uchun cheksiz sahifa yasardi.
 */
async function assertTargetExists(target: ReviewTarget, targetId: string): Promise<void> {
  const notFound = () => new NotFoundError(TARGET_LABEL[target]);

  switch (target) {
    case 'PRODUCT': {
      const row = await prisma.product.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'MENU_ITEM': {
      const row = await prisma.menuItem.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'RESTAURANT': {
      const row = await prisma.restaurant.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'SHOP': {
      const row = await prisma.shop.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }

    case 'HOTEL': {
      const row = await prisma.hotel.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!row) throw notFound();
      return;
    }
  }
}

/** Xaridni tasdiqlovchi dalil. */
interface PurchaseProof {
  marketOrderId?: string;
  foodOrderId?: string;
  bookingId?: string;
}

interface ProofResult {
  proof: PurchaseProof | null;
  reason: ReviewBlockReason | null;
}

/**
 * Bu odam shu narsani sotib olganmi.
 *
 * ── Nima uchun har bir tur uchun ALOHIDA so'rov ───────────────────────
 * Yo'llar butunlay boshqacha: mahsulot buyurtma qatori orqali,
 * restoran buyurtmaning o'zi orqali, mehmonxona esa xona va
 * bandlov orqali topiladi. Ularni bitta so'rovga yig'ish kodni
 * qisqartirmasdi, faqat o'qib bo'lmas holga keltirardi.
 *
 * ── Nima uchun YETKAZILGAN buyurtma talab qilinadi ────────────────────
 * Buyurtma berilgan zahoti baho qo'yish mumkin bo'lsa, u mahsulot
 * haqida emas, faqat kutish haqida bo'lardi. Bundan tashqari
 * buyurtmani berib, darhol bekor qilib, baho qoldirib ketish
 * mumkin bo'lardi.
 */
async function findPurchaseProof(
  target: ReviewTarget,
  targetId: string,
  userId: string,
): Promise<ProofResult> {
  switch (target) {
    case 'PRODUCT': {
      const item = await prisma.marketOrderItem.findFirst({
        where: {
          productId: targetId,
          order: { userId, status: MarketOrderStatus.DELIVERED },
        },
        select: { orderId: true },
        orderBy: { order: { deliveredAt: 'desc' } },
      });

      if (item) return { proof: { marketOrderId: item.orderId }, reason: null };

      /**
       * Buyurtma bor, lekin hali yetkazilmagan bo'lsa — sabab
       * BOSHQACHA aytiladi.
       *
       * "Avval buyurtma bering" degan matn allaqachon buyurtma
       * bergan odamga xato ko'rinardi va u tizim ishlamayapti deb
       * o'ylardi.
       */
      const pending = await prisma.marketOrderItem.findFirst({
        where: { productId: targetId, order: { userId } },
        select: { id: true },
      });

      return { proof: null, reason: pending ? 'NOT_DELIVERED' : 'NOT_PURCHASED' };
    }

    case 'SHOP': {
      const order = await prisma.marketOrder.findFirst({
        where: { shopId: targetId, userId, status: MarketOrderStatus.DELIVERED },
        select: { id: true },
        orderBy: { deliveredAt: 'desc' },
      });

      if (order) return { proof: { marketOrderId: order.id }, reason: null };

      const pending = await prisma.marketOrder.findFirst({
        where: { shopId: targetId, userId },
        select: { id: true },
      });

      return { proof: null, reason: pending ? 'NOT_DELIVERED' : 'NOT_PURCHASED' };
    }

    case 'MENU_ITEM': {
      const item = await prisma.foodOrderItem.findFirst({
        where: {
          menuItemId: targetId,
          order: { userId, status: FoodOrderStatus.DELIVERED },
        },
        select: { orderId: true },
        orderBy: { order: { deliveredAt: 'desc' } },
      });

      if (item) return { proof: { foodOrderId: item.orderId }, reason: null };

      const pending = await prisma.foodOrderItem.findFirst({
        where: { menuItemId: targetId, order: { userId } },
        select: { id: true },
      });

      return { proof: null, reason: pending ? 'NOT_DELIVERED' : 'NOT_PURCHASED' };
    }

    case 'RESTAURANT': {
      const order = await prisma.foodOrder.findFirst({
        where: { restaurantId: targetId, userId, status: FoodOrderStatus.DELIVERED },
        select: { id: true },
        orderBy: { deliveredAt: 'desc' },
      });

      if (order) return { proof: { foodOrderId: order.id }, reason: null };

      const pending = await prisma.foodOrder.findFirst({
        where: { restaurantId: targetId, userId },
        select: { id: true },
      });

      return { proof: null, reason: pending ? 'NOT_DELIVERED' : 'NOT_PURCHASED' };
    }

    case 'HOTEL': {
      /**
       * ── Mehmonxonada "yetkazildi" holati YO'Q ─────────────────────
       * Bandlov bekor qilinmasa `CONFIRMED` bo'lib qolaveradi:
       * "mehmon yashab chiqdi" degan qadam hech qayerda
       * belgilanmaydi.
       *
       * Shuning uchun mezon SANA: chiqish kuni o'tgan bo'lsa,
       * mehmon yashab chiqqan hisoblanadi.
       *
       * Sana Toshkent vaqtida olinadi — aks holda yarim tundan
       * keyin kun bir kunga surilib ketardi.
       */
      const todayKey = tashkentDateKey();
      const today = new Date(`${todayKey}T00:00:00Z`);

      const booking = await prisma.hotelBooking.findFirst({
        where: {
          room: { hotelId: targetId },
          userId,
          status: { not: BookingStatus.CANCELLED },
          checkOut: { lte: today },
        },
        select: { id: true },
        orderBy: { checkOut: 'desc' },
      });

      if (booking) return { proof: { bookingId: booking.id }, reason: null };

      const upcoming = await prisma.hotelBooking.findFirst({
        where: { room: { hotelId: targetId }, userId, status: { not: BookingStatus.CANCELLED } },
        select: { id: true },
      });

      return { proof: null, reason: upcoming ? 'NOT_STAYED' : 'NOT_PURCHASED' };
    }
  }
}

/** Baho qo'yish huquqi — brauzerga tugmani ko'rsatish uchun. */
export async function checkEligibility(
  target: ReviewTarget,
  targetId: string,
  userId: string | null,
): Promise<ReviewEligibility> {
  if (!userId) return { canReview: false, reason: 'GUEST' };

  const { proof, reason } = await findPurchaseProof(target, targetId, userId);

  return { canReview: proof !== null, reason };
}

/**
 * Reytingni QAYTA HISOBLAYDI va ota jadvalga yozadi.
 *
 * ── Nima uchun butun jadvaldan qayta sanaladi ─────────────────────────
 * "Yangi baho qo'shildi, o'rtachani biroz suramiz" degan yo'l ham
 * bor edi va u tezroq ishlardi.
 *
 * Lekin u XATOGA MOYIL: bir marta noto'g'ri hisoblansa, xato
 * abadiy qolib ketardi va uni topib bo'lmasdi. Sharh o'zgartirilsa
 * yoki o'chirilsa esa hisob yanada chalkashardi.
 *
 * Qayta sanash — bitta indeksli so'rov va u har doim to'g'ri
 * natija beradi.
 */
async function recomputeRating(
  tx: Prisma.TransactionClient,
  target: ReviewTarget,
  targetId: string,
): Promise<ReviewSummaryView> {
  const grouped = await tx.review.groupBy({
    by: ['rating'],
    where: targetFilter(target, targetId),
    _count: { _all: true },
  });

  const distribution = emptyDistribution();
  let total = 0;
  let sum = 0;

  for (const row of grouped) {
    const count = row._count._all;

    distribution[row.rating] = count;
    total += count;
    sum += row.rating * count;
  }

  const average = averageRating(sum, total);

  const data = { rating: average, ratingCount: total };

  switch (target) {
    case 'PRODUCT':
      await tx.product.update({ where: { id: targetId }, data, select: { id: true } });
      break;
    case 'MENU_ITEM':
      await tx.menuItem.update({ where: { id: targetId }, data, select: { id: true } });
      break;
    case 'RESTAURANT':
      await tx.restaurant.update({ where: { id: targetId }, data, select: { id: true } });
      break;
    case 'SHOP':
      await tx.shop.update({ where: { id: targetId }, data, select: { id: true } });
      break;
    case 'HOTEL':
      await tx.hotel.update({ where: { id: targetId }, data, select: { id: true } });
      break;
  }

  return { average, total, distribution };
}

/** Bahoning umumiy ko'rinishi — yozuvsiz o'qish uchun. */
async function readSummary(target: ReviewTarget, targetId: string): Promise<ReviewSummaryView> {
  const grouped = await prisma.review.groupBy({
    by: ['rating'],
    where: targetFilter(target, targetId),
    _count: { _all: true },
  });

  const distribution = emptyDistribution();
  let total = 0;
  let sum = 0;

  for (const row of grouped) {
    const count = row._count._all;

    distribution[row.rating] = count;
    total += count;
    sum += row.rating * count;
  }

  return { average: averageRating(sum, total), total, distribution };
}

/**
 * Sharhlar ro'yxati.
 *
 * ── Nima uchun O'Z sharhi ALOHIDA qaytadi ─────────────────────────────
 * Odam o'z sharhini ro'yxatning uchinchi sahifasidan izlab
 * yurmasligi kerak. U doim eng yuqorida, tahrirlash tugmasi bilan
 * turadi.
 */
export async function listReviews(
  target: ReviewTarget,
  targetId: string,
  viewerId: string | null,
  query: ReviewListQuery,
): Promise<ReviewsResponse> {
  await assertTargetExists(target, targetId);

  const where = targetFilter(target, targetId);
  const skip = (query.page - 1) * query.limit;

  const [summary, rows, mineRow, eligibility] = await Promise.all([
    readSummary(target, targetId),
    prisma.review.findMany({
      where: viewerId ? { ...where, authorId: { not: viewerId } } : where,
      select: REVIEW_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      /**
       * Bittasi ORTIQCHA olinadi.
       *
       * Umumiy sonni alohida so'rov bilan sanash o'rniga, keyingi
       * sahifa borligini shu bittadan bilib olamiz — bu bitta
       * so'rovni tejaydi.
       */
      take: query.limit + 1,
    }),
    viewerId
      ? prisma.review.findFirst({ where: { ...where, authorId: viewerId }, select: REVIEW_SELECT })
      : Promise.resolve(null),
    checkEligibility(target, targetId, viewerId),
  ]);

  const hasMore = rows.length > query.limit;
  const visible = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    summary,
    reviews: visible.map((row) => toReviewView(row, viewerId)),
    hasMore,
    mine: mineRow ? toReviewView(mineRow, viewerId) : null,
    eligibility,
  };
}

/**
 * Baho qo'yadi yoki o'zgartiradi.
 *
 * ── Nima uchun YANGI sharh emas, ALMASHTIRISH ─────────────────────────
 * Bitta odam bitta narsaga bir marta baho qo'yadi. Fikri
 * o'zgargan bo'lsa (mahsulot bir haftada buzildi), u bahosini
 * O'ZGARTIRADI — ikkinchisini qo'shmaydi.
 *
 * Aks holda bitta odam o'nta baho yozib, reytingni o'ziga
 * burib yuborardi.
 */
export async function upsertReview(
  target: ReviewTarget,
  targetId: string,
  userId: string,
  input: UpsertReviewInput,
): Promise<{ summary: ReviewSummaryView; mine: ReviewView }> {
  await assertTargetExists(target, targetId);

  const { proof, reason } = await findPurchaseProof(target, targetId, userId);

  if (!proof) {
    throw new ReviewNotAllowedError(reason ?? 'NOT_PURCHASED');
  }

  const where = targetFilter(target, targetId);
  const column = TARGET_COLUMN[target];

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.review.findFirst({
      where: { ...where, authorId: userId },
      select: { id: true },
    });

    const saved = existing
      ? await tx.review.update({
          where: { id: existing.id },
          data: { rating: input.rating, body: input.body ?? null, ...proof },
          select: REVIEW_SELECT,
        })
      : await tx.review.create({
          data: {
            authorId: userId,
            rating: input.rating,
            body: input.body ?? null,
            [column]: targetId,
            ...proof,
          } as Prisma.ReviewUncheckedCreateInput,
          select: REVIEW_SELECT,
        });

    const summary = await recomputeRating(tx, target, targetId);

    return { saved, summary };
  });

  logger.info({ target, targetId, userId, rating: input.rating }, "Baho qo'yildi");

  return { summary: result.summary, mine: toReviewView(result.saved, userId) };
}

/**
 * O'z bahosini o'chiradi.
 *
 * ── Nima uchun boshqaning bahosini o'chirib bo'lmaydi ─────────────────
 * Aks holda sotuvchi salbiy bahoni o'chirib tashlardi va butun
 * tizim ma'nosini yo'qotardi. Haqoratli sharh esa SHIKOYAT orqali
 * moderatorga boradi.
 */
export async function removeReview(
  target: ReviewTarget,
  targetId: string,
  userId: string,
): Promise<ReviewSummaryView> {
  await assertTargetExists(target, targetId);

  const where = targetFilter(target, targetId);

  const existing = await prisma.review.findFirst({
    where: { ...where, authorId: userId },
    select: { id: true },
  });

  if (!existing) {
    throw new NotFoundError('Baho');
  }

  const summary = await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: existing.id } });

    return recomputeRating(tx, target, targetId);
  });

  logger.info({ target, targetId, userId }, "Baho o'chirildi");

  return summary;
}
