import { Prisma } from '@/generated/prisma/client';
import { MAX_QUESTIONS_PER_DAY, type QuestionBlockReason } from '@/config/product-detail';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { startOfTashkentDay } from '@/lib/date';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type {
  AnswerQuestionInput,
  AskQuestionInput,
  QuestionListQuery,
} from '@/modules/product/product-qa.schemas';
import type {
  AnswerView,
  QuestionView,
  QuestionsResponse,
} from '@/modules/product/product-qa.types';
import { shortAuthorName } from '@/modules/review/review.types';

/**
 * Mahsulot savol-javoblari.
 *
 * ── BAHODAN eng katta farqi: KIM yoza oladi ───────────────────────────
 * Bahoni faqat sotib olgan odam qo'yadi — aks holda reyting soxta
 * bo'lardi.
 *
 * Savolni esa istalgan kirgan odam bera oladi. Savol aynan SOTIB
 * OLISHDAN OLDIN tug'iladi: "zaryadlagichi bormi?" degan savolni
 * mahsulotni olgan odam bermaydi.
 *
 * "Faqat xaridor so'rasin" degan qoida bu bo'limni butunlay
 * ma'nosiz qilardi.
 *
 * ── Nima uchun kunlik CHEGARA bor ─────────────────────────────────────
 * Aynan shu ochiqlik uni eng oson spam yo'liga aylantiradi:
 * raqobatchi o'nlab "bu yomonmi?" degan savol yozib, sahifani
 * buzib qo'yishi mumkin.
 */

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const;

const ANSWER_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  authorId: true,
  isFromSeller: true,
  author: { select: AUTHOR_SELECT },
} satisfies Prisma.ProductAnswerSelect;

/**
 * ── Nima uchun `as const` EMAS, `satisfies` ───────────────────────────
 * `as const` ichkaridagi `orderBy` massivini ham "o'zgarmas"
 * (`readonly`) qilib qo'yadi va Prisma uni qabul qilmaydi.
 *
 * `satisfies` esa shaklni tekshiradi-yu, turini o'zgartirmaydi.
 */
const QUESTION_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  authorId: true,
  author: { select: AUTHOR_SELECT },
  answers: {
    select: ANSWER_SELECT,
    /**
     * DO'KON javobi birinchi turadi.
     *
     * Xaridor uchun eng ishonchli javob — sotuvchidan kelgani.
     * U ro'yxatning oxirida qolsa, odam uni ko'rmasdi.
     */
    orderBy: [{ isFromSeller: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ProductQuestionSelect;

type QuestionRow = Prisma.ProductQuestionGetPayload<{ select: typeof QUESTION_SELECT }>;
type AnswerRow = Prisma.ProductAnswerGetPayload<{ select: typeof ANSWER_SELECT }>;

function toAnswerView(row: AnswerRow, viewerId: string | null): AnswerView {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      name: shortAuthorName(row.author.firstName, row.author.lastName),
      avatarUrl: row.author.avatarUrl,
    },
    isFromSeller: row.isFromSeller,
    isMine: viewerId !== null && row.authorId === viewerId,
  };
}

function toQuestionView(row: QuestionRow, viewerId: string | null): QuestionView {
  const answers = row.answers.map((answer) => toAnswerView(answer, viewerId));

  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    author: {
      id: row.author.id,
      name: shortAuthorName(row.author.firstName, row.author.lastName),
      avatarUrl: row.author.avatarUrl,
    },
    isMine: viewerId !== null && row.authorId === viewerId,
    answers,
    hasMyAnswer: answers.some((answer) => answer.isMine),
  };
}

/** Mahsulot va uning egasi. */
async function loadProduct(productId: string): Promise<{ id: string; ownerId: string | null }> {
  const row = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, shop: { select: { ownerId: true } } },
  });

  if (!row) {
    throw new NotFoundError('Mahsulot');
  }

  return { id: row.id, ownerId: row.shop.ownerId };
}

/**
 * Bugun nechta savol berilgan.
 *
 * ── Nima uchun TOSHKENT kuni ──────────────────────────────────────────
 * "Oxirgi 24 soat" ham mumkin edi, lekin u chalkash: odam kecha
 * kechqurun savol berib, bugun ertalab yana bera olmasdi.
 *
 * "Bugun" esa tushunarli va u Toshkent bo'yicha hisoblanadi —
 * server qayerda turishidan qat'i nazar.
 */
async function countTodayQuestions(userId: string): Promise<number> {
  return prisma.productQuestion.count({
    where: { authorId: userId, createdAt: { gte: startOfTashkentDay() } },
  });
}

/** Savol berishga ruxsat bormi. */
async function checkAskPermission(
  userId: string | null,
): Promise<{ canAsk: boolean; reason: QuestionBlockReason | null }> {
  if (!userId) return { canAsk: false, reason: 'GUEST' };

  const today = await countTodayQuestions(userId);

  if (today >= MAX_QUESTIONS_PER_DAY) {
    return { canAsk: false, reason: 'DAILY_LIMIT' };
  }

  return { canAsk: true, reason: null };
}

/** Savollar ro'yxati. */
export async function listQuestions(
  productId: string,
  viewerId: string | null,
  query: QuestionListQuery,
): Promise<QuestionsResponse> {
  const product = await loadProduct(productId);

  const skip = (query.page - 1) * query.limit;

  const [rows, permission] = await Promise.all([
    prisma.productQuestion.findMany({
      where: { productId },
      select: QUESTION_SELECT,
      /**
       * ── Nima uchun JAVOBSIZLARI emas, eng YANGISI birinchi ──────────
       * "Javobsizlarni yuqoriga" degan tartib sotuvchi uchun qulay
       * bo'lardi, lekin bu sahifa XARIDOR uchun.
       *
       * Xaridor uchun eng yangi savol eng dolzarb: u odatda
       * mahsulotning hozirgi holati haqida bo'ladi.
       */
      orderBy: { createdAt: 'desc' },
      skip,
      /** Bittasi ortiqcha — keyingi sahifa borligini bilish uchun. */
      take: query.limit + 1,
    }),
    checkAskPermission(viewerId),
  ]);

  const hasMore = rows.length > query.limit;
  const visible = hasMore ? rows.slice(0, query.limit) : rows;

  return {
    questions: visible.map((row) => toQuestionView(row, viewerId)),
    hasMore,
    canAsk: permission.canAsk,
    blockReason: permission.reason,
    isSeller: viewerId !== null && product.ownerId === viewerId,
  };
}

/** Savol beradi. */
export async function askQuestion(
  productId: string,
  userId: string,
  input: AskQuestionInput,
): Promise<QuestionView> {
  await loadProduct(productId);

  const permission = await checkAskPermission(userId);

  if (!permission.canAsk) {
    throw new ForbiddenError(
      `Bugun ${MAX_QUESTIONS_PER_DAY} ta savol berdingiz. Ertaga davom eting.`,
    );
  }

  const created = await prisma.productQuestion.create({
    data: { productId, authorId: userId, body: input.body },
    select: QUESTION_SELECT,
  });

  logger.info({ productId, userId }, 'Mahsulot haqida savol berildi');

  return toQuestionView(created, userId);
}

/**
 * Savolga javob beradi.
 *
 * ── Nima uchun ISTALGAN odam javob bera oladi ─────────────────────────
 * Faqat sotuvchi javob bersin degan qoida ham mumkin edi va u
 * "rasmiy" ko'rinardi.
 *
 * Lekin amalda eng foydali javob boshqa XARIDORDAN keladi: u
 * mahsulotni qo'lida ushlab ko'rgan va savol beruvchi bilan bir
 * xil holatda bo'lgan.
 *
 * Do'kon javobi esa alohida belgilanadi va yuqorida turadi.
 */
export async function answerQuestion(
  questionId: string,
  userId: string,
  input: AnswerQuestionInput,
): Promise<QuestionView> {
  const question = await prisma.productQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, productId: true, product: { select: { shop: { select: { ownerId: true } } } } },
  });

  if (!question) {
    throw new NotFoundError('Savol');
  }

  const isFromSeller = question.product.shop.ownerId === userId;

  try {
    await prisma.productAnswer.create({
      data: { questionId, authorId: userId, body: input.body, isFromSeller },
      select: { id: true },
    });
  } catch (error) {
    /**
     * Bitta odam bitta savolga bir marta javob beradi.
     *
     * Usiz bahs boshlanardi va u bu bo'limni chatga aylantirardi.
     */
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Siz bu savolga allaqachon javob bergansiz');
    }

    throw error;
  }

  logger.info({ questionId, userId, isFromSeller }, 'Savolga javob berildi');

  const updated = await prisma.productQuestion.findUniqueOrThrow({
    where: { id: questionId },
    select: QUESTION_SELECT,
  });

  return toQuestionView(updated, userId);
}

/**
 * O'z savolini o'chiradi.
 *
 * ── Nima uchun JAVOBLARI ham o'chadi ──────────────────────────────────
 * Savolsiz javob ma'nosiz: "ha, bor" degan yozuv nima haqidaligi
 * noma'lum bo'lib qolardi.
 *
 * Buni baza o'zi qiladi (`onDelete: Cascade`).
 */
export async function removeQuestion(questionId: string, userId: string): Promise<void> {
  const { count } = await prisma.productQuestion.deleteMany({
    where: { id: questionId, authorId: userId },
  });

  if (count === 0) {
    /**
     * Savol yo'q yoki boshqa odamniki.
     *
     * Ikkalasi uchun bir xil javob: aks holda "bu savol bor, lekin
     * sizniki emas" degan ma'lumot ochilardi.
     */
    throw new NotFoundError('Savol');
  }

  logger.info({ questionId, userId }, "Savol o'chirildi");
}
