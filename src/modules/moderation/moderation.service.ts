import { Prisma } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { AuditAction, recordAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type {
  AdminReportQuery,
  ReportUserInput,
  ResolveReportInput,
} from '@/modules/moderation/moderation.schemas';
import {
  messageDenyText,
  type AdminReportView,
  type BlockedUserView,
  type MessageDenyReason,
  type ReportedContentView,
  type ReportPartyView,
  type ReportReasonName,
  type ReportStatusName,
} from '@/modules/moderation/moderation.types';

/**
 * Bloklash, shikoyat va "kim menga yoza oladi" qoidasi.
 *
 * ── Modulning asosiy g'oyasi ──────────────────────────────────────────
 * Chat, qo'ng'iroq, obuna va qidiruv — hammasi bitta savolga tayanadi:
 * "bu ikki odam bir-biri bilan aloqa qila oladimi?".
 *
 * Javob bir joyda hisoblanadi. Aks holda har modul o'z tekshiruvini
 * yozardi va bittasi unutilishi bilan bloklash chetlab o'tilardi.
 */

/**
 * Ikki odam orasida blok bormi (HAR IKKI yo'nalishda).
 *
 * ── Nima uchun ikki yo'nalish ─────────────────────────────────────────
 * Men uni bloklagan bo'lsam — men unga yoza olmasligim kerak (aks
 * holda bloklashning ma'nosi yarim qolardi).
 *
 * U meni bloklagan bo'lsa — men unga yoza olmayman.
 *
 * Ikkalasi bitta so'rov bilan tekshiriladi.
 */
export async function findBlock(
  userA: string,
  userB: string,
): Promise<{ blockedByMe: boolean; blockedByThem: boolean }> {
  const rows = await prisma.userBlock.findMany({
    where: {
      OR: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    },
    select: { blockerId: true },
  });

  return {
    blockedByMe: rows.some((row) => row.blockerId === userA),
    blockedByThem: rows.some((row) => row.blockerId === userB),
  };
}

/** Har qanday yo'nalishda blok bormi. */
export async function isBlockedBetween(userA: string, userB: string): Promise<boolean> {
  const block = await findBlock(userA, userB);

  return block.blockedByMe || block.blockedByThem;
}

/**
 * Yozish (va qo'ng'iroq qilish) mumkinmi.
 *
 * ── Nima uchun qo'ng'iroq ham SHU qoidaga bo'ysunadi ──────────────────
 * "Menga yozmasin" degan odam qo'ng'iroqni ham istamaydi. Ikkita
 * alohida sozlama qilinsa, odam ikkalasini ham to'g'rilashi kerak
 * bo'lardi va bittasini unutib qolardi.
 *
 * @returns Ruxsat bo'lsa `null`, aks holda sabab.
 */
export async function checkCanMessage(senderId: string, recipientId: string): Promise<MessageDenyReason | null> {
  // O'ziga yozish har doim mumkin (masalan saqlangan xabarlar uchun).
  if (senderId === recipientId) return null;

  const [block, recipient] = await Promise.all([
    findBlock(senderId, recipientId),
    prisma.userProfile.findUnique({
      where: { userId: recipientId },
      select: { messagePrivacy: true },
    }),
  ]);

  if (block.blockedByMe) return 'BLOCKED_BY_ME';
  if (block.blockedByThem) return 'BLOCKED_BY_THEM';

  const privacy = recipient?.messagePrivacy ?? 'EVERYONE';

  if (privacy === 'NOBODY') return 'NOBODY';

  if (privacy === 'FOLLOWERS') {
    /**
     * "Faqat men kuzatadiganlar" — ya'ni QABUL QILUVCHI yozuvchiga
     * obuna bo'lgan bo'lishi kerak.
     *
     * Yo'nalishni chalkashtirish oson: agar teskarisi tekshirilsa,
     * istalgan odam obuna bo'lib olib, sozlamani chetlab o'tardi.
     */
    const follows = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: recipientId, followingId: senderId } },
      select: { id: true },
    });

    if (!follows) return 'FOLLOWERS_ONLY';
  }

  return null;
}

/**
 * Yozib bo'lmasa xato tashlaydi.
 *
 * Chaqiruvchi modullar shu yordamchini ishlatadi — matn va status
 * bitta joyda turadi.
 */
export async function requireCanMessage(senderId: string, recipientId: string): Promise<void> {
  const reason = await checkCanMessage(senderId, recipientId);

  if (reason) {
    throw new ForbiddenError(messageDenyText(reason));
  }
}

/** `username` bo'yicha foydalanuvchini topadi. */
async function requireUserByUsername(username: string): Promise<string> {
  const row = await prisma.user.findFirst({
    where: { profile: { username }, deletedAt: null },
    select: { id: true },
  });

  if (!row) {
    throw new NotFoundError('Profil');
  }

  return row.id;
}

export async function blockUser(blockerId: string, username: string): Promise<void> {
  const blockedId = await requireUserByUsername(username);

  if (blockedId === blockerId) {
    throw new ConflictError("O'zingizni bloklab bo'lmaydi.");
  }

  try {
    await prisma.userBlock.create({ data: { blockerId, blockedId } });
  } catch (error) {
    /**
     * Allaqachon bloklangan — bu XATO emas.
     *
     * Tugma ikki marta bosilgan bo'lishi mumkin. Natija baribir
     * kerakli holat: blok bor.
     */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }

  /**
   * Obuna IKKI TOMONLAMA uziladi.
   *
   * Bloklangan odam obunachi bo'lib qolsa, u mening yangiliklarimni
   * ko'rib turardi — bloklashning ma'nosi yo'qolardi.
   */
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: blockerId, followingId: blockedId },
        { followerId: blockedId, followingId: blockerId },
      ],
    },
  });

  logger.info({ blockerId, blockedId }, 'Foydalanuvchi bloklandi');
}

export async function unblockUser(blockerId: string, username: string): Promise<void> {
  const blockedId = await requireUserByUsername(username);

  /**
   * `deleteMany` — `delete` emas.
   *
   * Blok bo'lmagan holatda `delete` xato tashlardi. Bu yerda esa
   * natija muhim: blok yo'q.
   */
  await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });

  logger.info({ blockerId, blockedId }, 'Blok olib tashlandi');
}

/** Men bloklagan odamlar ro'yxati. */
export async function listBlocked(userId: string): Promise<BlockedUserView[]> {
  const rows = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    select: {
      createdAt: true,
      blocked: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          profile: { select: { username: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => {
    const fullName = [row.blocked.firstName, row.blocked.lastName].filter(Boolean).join(' ');

    return {
      userId: row.blocked.id,
      username: row.blocked.profile?.username ?? '',
      fullName: fullName || null,
      avatarUrl: row.blocked.avatarUrl,
      blockedAt: row.createdAt.toISOString(),
    };
  });
}

/**
 * Meni bloklagan yoki men bloklagan odamlarning ID'lari.
 *
 * Qidiruv va ro'yxatlarda ularni chiqarib tashlash uchun ishlatiladi.
 */
export async function blockedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set<string>();

  for (const row of rows) {
    ids.add(row.blockerId === userId ? row.blockedId : row.blockerId);
  }

  return [...ids];
}

export async function reportUser(reporterId: string, username: string, input: ReportUserInput): Promise<void> {
  const targetId = await requireUserByUsername(username);

  if (targetId === reporterId) {
    throw new ConflictError("O'zingiz ustidan shikoyat qilib bo'lmaydi.");
  }

  try {
    await prisma.userReport.create({
      data: { reporterId, targetId, reason: input.reason, note: input.note ?? null },
    });
  } catch (error) {
    /**
     * Allaqachon ochiq shikoyat bor — bu XATO emas.
     *
     * Odam uchun natija bir xil: shikoyat moderatorda. Ikkinchi
     * yozuv esa faqat ro'yxatni to'ldirardi.
     */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }

  logger.warn({ reporterId, targetId, reason: input.reason }, 'Foydalanuvchi ustidan shikoyat');
}


/**
 * Post ustidan shikoyat.
 *
 * ── Nima uchun ODAM emas, POST ────────────────────────────────────────
 * Ilgari faqat odam ustidan shikoyat qilish mumkin edi. Lentada
 * haqoratli post ko'rgan odam "bu foydalanuvchi yomon" degan umumiy
 * shikoyat yozardi, moderator esa uning yuzta posti ichidan qaysi
 * biri haqida ekanini topa olmasdi va ko'pincha hech narsa qilmasdi.
 *
 * Endi shikoyat aniq yozuvga bog'lanadi va moderator uni bir bosishda
 * yashira oladi.
 *
 * ── Nima uchun `targetId` ham to'ldiriladi ────────────────────────────
 * U — post MUALLIFI. Shunda "bu odamga nechta shikoyat kelgan?"
 * degan savolga javob avvalgidek bitta so'rov bilan topiladi va
 * takroriy qoidabuzar ko'rinib qoladi.
 */
export async function reportPost(reporterId: string, postId: string, input: ReportUserInput): Promise<void> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!post) {
    throw new NotFoundError('Post');
  }

  if (post.authorId === reporterId) {
    throw new ConflictError("O'z postingiz ustidan shikoyat qilib bo'lmaydi.");
  }

  await createContentReport({
    reporterId,
    targetId: post.authorId,
    postId,
    reason: input.reason,
    note: input.note ?? null,
  });

  logger.warn({ reporterId, postId, authorId: post.authorId, reason: input.reason }, 'Post ustidan shikoyat');
}

/** Izoh ustidan shikoyat. */
export async function reportComment(
  reporterId: string,
  commentId: string,
  input: ReportUserInput,
): Promise<void> {
  const comment = await prisma.postComment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!comment) {
    throw new NotFoundError('Izoh');
  }

  if (comment.authorId === reporterId) {
    throw new ConflictError("O'z izohingiz ustidan shikoyat qilib bo'lmaydi.");
  }

  await createContentReport({
    reporterId,
    targetId: comment.authorId,
    commentId,
    reason: input.reason,
    note: input.note ?? null,
  });

  logger.warn({ reporterId, commentId, authorId: comment.authorId, reason: input.reason }, 'Izoh ustidan shikoyat');
}

/**
 * Hikoya ustidan shikoyat.
 *
 * ── Nima uchun muddati o'tgan hikoyaga ham shikoyat qilish mumkin ────
 * Odam hikoyani ko'rib, keyin shikoyat yozishga ulguradi — bu vaqtda
 * 24 soat tugagan bo'lishi mumkin. Shikoyatni rad etsak, u haqoratni
 * moderatorga umuman yetkaza olmasdi.
 */
export async function reportStory(
  reporterId: string,
  storyId: string,
  input: ReportUserInput,
): Promise<void> {
  const story = await prisma.story.findFirst({
    where: { id: storyId, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!story) {
    throw new NotFoundError('Hikoya');
  }

  if (story.authorId === reporterId) {
    throw new ConflictError("O'z hikoyangiz ustidan shikoyat qilib bo'lmaydi.");
  }

  await createContentReport({
    reporterId,
    targetId: story.authorId,
    storyId,
    reason: input.reason,
    note: input.note ?? null,
  });

  logger.warn(
    { reporterId, storyId, authorId: story.authorId, reason: input.reason },
    'Hikoya ustidan shikoyat',
  );
}

/**
 * Yozuvni yaratadi; takrorlanishni jimgina o'tkazadi.
 *
 * Odam uchun natija bir xil: shikoyat moderatorda. Ikkinchi yozuv
 * esa faqat ro'yxatni to'ldirardi.
 */
async function createContentReport(data: {
  reporterId: string;
  targetId: string;
  postId?: string;
  commentId?: string;
  storyId?: string;
  reason: ReportUserInput['reason'];
  note: string | null;
}): Promise<void> {
  try {
    await prisma.userReport.create({ data });
  } catch (error) {
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Moderator tomoni
// ─────────────────────────────────────────────────────────────────────

const MODULE = 'moderation';

const REPORT_PARTY_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  profile: { select: { username: true } },
} as const;

type ReportPartyRow = Prisma.UserGetPayload<{ select: typeof REPORT_PARTY_SELECT }>;

function toReportParty(row: ReportPartyRow): ReportPartyView {
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');

  return {
    userId: row.id,
    username: row.profile?.username ?? '',
    fullName: fullName || null,
  };
}

/** Matnni ro'yxatga sig'adigan qilib qisqartiradi. */
function shorten(text: string, maxLength = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();

  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean;
}

/** Shikoyat qilingan yozuvni umumiy ko'rinishga o'giradi. */
function toReportedContent(row: {
  post: { id: string; body: string; imageUrl: string | null; deletedAt: Date | null } | null;
  comment: { id: string; body: string; postId: string; deletedAt: Date | null } | null;
  story: {
    id: string;
    caption: string | null;
    videoUrl: string | null;
    deletedAt: Date | null;
    expiresAt: Date;
    author: { profile: { username: string } | null } | null;
  } | null;
}): ReportedContentView | null {
  if (row.post) {
    return {
      kind: 'POST',
      id: row.post.id,
      // Matnsiz post ham bo'ladi — unda rasm borligi yoziladi.
      preview: shorten(row.post.body) || (row.post.imageUrl ? "(faqat rasm)" : "(bo'sh)"),
      isVisible: row.post.deletedAt === null,
      href: `/feed/${row.post.id}`,
    };
  }

  if (row.comment) {
    return {
      kind: 'COMMENT',
      id: row.comment.id,
      preview: shorten(row.comment.body),
      isVisible: row.comment.deletedAt === null,
      href: `/feed/${row.comment.postId}`,
    };
  }

  if (row.story) {
    /**
     * Hikoya MUDDATI ham hisobga olinadi.
     *
     * "Ko'rinadi" degani — hozir odamlarga ko'rinyaptimi. Muddati
     * o'tgan hikoya o'chirilmagan bo'lsa ham hech kimga ko'rinmaydi
     * va moderator buni bilishi kerak: chora ko'rish shoshilinch
     * emasligini anglatadi.
     */
    const isLive = row.story.deletedAt === null && row.story.expiresAt.getTime() > Date.now();
    const username = row.story.author?.profile?.username ?? '';

    return {
      kind: 'STORY',
      id: row.story.id,
      preview:
        shorten(row.story.caption ?? '') || (row.story.videoUrl ? '(video hikoya)' : '(rasmli hikoya)'),
      isVisible: isLive,
      // Muddati o'tgan hikoyani ochib bo'lmaydi — muallif profiliga olib boradi.
      href: isLive && username ? `/stories/${username}` : `/u/${username}`,
    };
  }

  return null;
}

/**
 * Moderator uchun shikoyatlar ro'yxati.
 *
 * ── Nima uchun OCHIQ shikoyatlar soni ham qaytariladi ─────────────────
 * Bitta shikoyat hech narsani anglatmaydi: odamlar janjallashib
 * qolishi mumkin. O'nta har xil odamdan kelgan shikoyat esa boshqa
 * gap. Shu son bo'lmasa, moderator har bir ism bo'yicha alohida
 * qidirishga majbur bo'lardi.
 */
export async function listAdminReports(
  query: AdminReportQuery,
): Promise<{ reports: AdminReportView[]; total: number }> {
  const where: Prisma.UserReportWhereInput = query.status === 'ALL' ? {} : { status: query.status };

  const [rows, total] = await Promise.all([
    prisma.userReport.findMany({
      where,
      select: {
        id: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        reporter: { select: REPORT_PARTY_SELECT },
        target: { select: REPORT_PARTY_SELECT },
        /**
         * Shikoyat qilingan yozuv SHU YERDA olinadi.
         *
         * Moderator matnni ro'yxatning o'zida o'qiydi. Aks holda u
         * har bir shikoyat uchun alohida sahifa ochib, keyin
         * qaytishga majbur bo'lardi.
         */
        post: { select: { id: true, body: true, imageUrl: true, deletedAt: true } },
        comment: { select: { id: true, body: true, postId: true, deletedAt: true } },
        story: {
          select: {
            id: true,
            caption: true,
            videoUrl: true,
            deletedAt: true,
            expiresAt: true,
            author: { select: { profile: { select: { username: true } } } },
          },
        },
      },
      // Yangi shikoyatlar birinchi — indeks ham shu tartibda.
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.userReport.count({ where }),
  ]);

  if (rows.length === 0) {
    return { reports: [], total };
  }

  /**
   * Ochiq shikoyatlar soni BITTA so'rovda sanaladi.
   *
   * Har bir qator uchun alohida so'rov yuborilsa, yigirmata shikoyat
   * yigirmata qo'shimcha so'rov degani bo'lardi.
   */
  const counts = await prisma.userReport.groupBy({
    by: ['targetId'],
    where: { status: 'OPEN', targetId: { in: rows.map((row) => row.target.id) } },
    _count: { _all: true },
  });

  const openByTarget = new Map(counts.map((item) => [item.targetId, item._count._all]));

  return {
    reports: rows.map((row) => ({
      id: row.id,
      reason: row.reason as ReportReasonName,
      note: row.note,
      status: row.status as ReportStatusName,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reporter: toReportParty(row.reporter),
      target: toReportParty(row.target),
      targetOpenReports: openByTarget.get(row.target.id) ?? 0,
      content: toReportedContent(row),
    })),
    total,
  };
}

interface OperationMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Shikoyatni yopadi: chora ko'rildi yoki asos topilmadi.
 *
 * Amal audit jurnaliga yoziladi — bu moderatorning QARORI va u
 * keyinchalik tekshirilishi mumkin bo'lishi kerak.
 */
export async function resolveReport(
  actorId: string,
  reportId: string,
  input: ResolveReportInput,
  meta: OperationMeta = {},
): Promise<void> {
  const report = await prisma.userReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, targetId: true },
  });

  if (!report) {
    throw new NotFoundError('Shikoyat');
  }

  if (report.status !== 'OPEN') {
    throw new ConflictError("Bu shikoyat allaqachon ko'rib chiqilgan.");
  }

  await prisma.userReport.update({
    where: { id: reportId },
    data: { status: input.status, reviewedAt: new Date() },
  });

  await recordAudit({
    actorId,
    action: AuditAction.ADMIN_REPORT_RESOLVED,
    resourceType: 'UserReport',
    resourceId: reportId,
    module: MODULE,
    /**
     * Izoh metama'lumotga YOZILMAYDI.
     *
     * Audit jurnali admin panelda ochiq ko'rinadi, izohda esa
     * odamlarning shaxsiy nizosi yozilgan bo'lishi mumkin.
     */
    metadata: { status: input.status, targetId: report.targetId },
    ...meta,
  });

  logger.info({ actorId, reportId, status: input.status }, 'Shikoyat yopildi');
}
