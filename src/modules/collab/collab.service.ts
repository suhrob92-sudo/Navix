import { Prisma } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { openConversation } from '@/modules/chat/chat.service';
import { isBlockedBetween } from '@/modules/moderation/moderation.service';
import { notifyUser } from '@/modules/notification/notification.service';
import type {
  CollabOfferView,
  CollabPersonView,
  CreatorCardView,
} from '@/modules/collab/collab.types';
import type {
  CollabQuery,
  CreateCollabOfferInput,
  CreatorsQuery,
} from '@/modules/collab/collab.schemas';

/**
 * Hamkorlik — biznes va ijodkorni ULAYDIGAN modul.
 *
 * ── Modulning asosiy qoidasi: NAVIX PULGA ARALASHMAYDI ────────────────
 * Taklif — tanishtirish. Shartlar matn sifatida yoziladi, kelishuv
 * esa suhbatda davom etadi va pul platformadan tashqarida o'tadi.
 *
 * Bu ataylab qilingan: pulni o'tkazish soliq va litsenziya
 * masalalarini keltirib chiqaradi va ular alohida hal qilinishi
 * kerak.
 *
 * ── Modulning ikkinchi qoidasi: SPAMGA yo'l yo'q ──────────────────────
 * "Hamkorlikka ochiq" degan belgi ijodkorni ochiq nishonga
 * aylantirmasligi kerak. Uch qavat himoya bor:
 *   1. Faqat OCHIQ ijodkorga yozish mumkin;
 *   2. Bitta juftlikda faqat BITTA javobsiz taklif (baza sharti);
 *   3. So'rov chegarasi (`enforcePublicRateLimit`).
 */

const PERSON_SELECT = {
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { username: true, isVerified: true } },
} as const;

type PersonRow = Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>;

function toPerson(row: PersonRow): CollabPersonView {
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');

  return {
    username: row.profile?.username ?? '',
    fullName: fullName || null,
    avatarUrl: row.avatarUrl,
    isVerified: row.profile?.isVerified ?? false,
  };
}

const OFFER_SELECT = {
  id: true,
  subject: true,
  message: true,
  status: true,
  conversationId: true,
  createdAt: true,
  respondedAt: true,
  fromUserId: true,
  toUserId: true,
  fromUser: { select: PERSON_SELECT },
  toUser: { select: PERSON_SELECT },
} as const;

type OfferRow = Prisma.CollabOfferGetPayload<{ select: typeof OFFER_SELECT }>;

function toOfferView(row: OfferRow, viewerId: string): CollabOfferView {
  const isIncoming = row.toUserId === viewerId;

  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    isIncoming,
    // Ikkinchi tomon — qutiga qarab boshqa odam.
    person: toPerson(isIncoming ? row.fromUser : row.toUser),
    conversationId: row.conversationId,
    createdAt: row.createdAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? null,
  };
}

/**
 * Taklif yuboradi.
 *
 * ── Nima uchun qabul qiluvchi OCHIQ bo'lishi shart ────────────────────
 * "Hamkorlikka ochiqman" degan belgi — ijodkorning ruxsati. Usiz
 * taklif yuborish mumkin bo'lsa, belgi ma'nosini yo'qotardi va har
 * bir ijodkor spam olardi.
 *
 * Belgini o'chirish esa oqimni darhol to'xtatadi — bu ijodkorning
 * yagona ishonchli tugmasi.
 */
export async function sendCollabOffer(
  fromUserId: string,
  input: CreateCollabOfferInput,
): Promise<CollabOfferView> {
  const target = await prisma.user.findFirst({
    where: {
      profile: { username: input.username },
      deletedAt: null,
      status: { not: 'SUSPENDED' },
    },
    select: { id: true, profile: { select: { isOpenToCollab: true } } },
  });

  if (!target?.profile) {
    throw new NotFoundError('Ijodkor');
  }

  if (target.id === fromUserId) {
    throw new ConflictError("O'zingizga taklif yubora olmaysiz.");
  }

  if (!target.profile.isOpenToCollab) {
    throw new ConflictError('Bu ijodkor hozir hamkorlik takliflarini qabul qilmayapti.');
  }

  /**
   * Blok TEKSHIRILADI.
   *
   * Bloklangan odam xabar yoza olmaydi — taklif orqali chetlab
   * o'tish yo'li ochiq qolsa, bloklashning ma'nosi bo'lmasdi.
   */
  if (await isBlockedBetween(fromUserId, target.id)) {
    throw new NotFoundError('Ijodkor');
  }

  try {
    const row = await prisma.collabOffer.create({
      data: {
        fromUserId,
        toUserId: target.id,
        subject: input.subject,
        message: input.message,
      },
      select: OFFER_SELECT,
    });

    void notifyCollabOffer(target.id, row);

    return toOfferView(row, fromUserId);
  } catch (error) {
    /*
      Javobsiz taklif ALLAQACHON bor.

      Baza qisman noyob indeks bilan buni to'xtatadi. Xato matni
      esa aniq bo'lishi kerak: "yubormadi" emas, "avvalgisi hali
      javobsiz".
    */
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (isDuplicate) {
      throw new ConflictError('Bu ijodkorga yuborgan taklifingiz hali javobsiz.');
    }

    throw error;
  }
}

/** Ijodkorga yangi taklif kelganini bildiradi. */
async function notifyCollabOffer(toUserId: string, row: OfferRow): Promise<void> {
  try {
    const person = toPerson(row.fromUser);

    await notifyUser(toUserId, 'collab.offer_received', {
      offerId: row.id,
      subject: row.subject,
      actorName: person.fullName ?? `@${person.username}`,
    });
  } catch (error) {
    // Bildirishnoma — qulaylik. Usiz ham taklif qutida turadi.
    logger.warn({ err: error, toUserId }, 'Hamkorlik bildirishnomasi yuborilmadi');
  }
}

/**
 * Taklifga javob beradi.
 *
 * ── Nima uchun uchala amal BITTA funksiyada ───────────────────────────
 * Ular bitta narsani o'zgartiradi: holatni. Farq faqat KIM qila
 * olishida va shu tekshiruv ham bir necha qatorlik.
 *
 * Alohida funksiyalar yasalsa, uchtasida ham bir xil "taklif bormi,
 * hali javobsizmi?" bloki takrorlanardi.
 */
export async function respondCollabOffer(
  offerId: string,
  viewerId: string,
  action: 'ACCEPT' | 'DECLINE' | 'WITHDRAW',
): Promise<CollabOfferView> {
  const offer = await prisma.collabOffer.findUnique({
    where: { id: offerId },
    select: OFFER_SELECT,
  });

  if (!offer || (offer.toUserId !== viewerId && offer.fromUserId !== viewerId)) {
    throw new NotFoundError('Taklif');
  }

  if (offer.status !== 'PENDING') {
    throw new ConflictError('Bu taklifga allaqachon javob berilgan.');
  }

  const isRecipient = offer.toUserId === viewerId;

  /*
    Kim nima qila oladi.

    Qabul qilish va rad etish — ijodkorning qarori. Qaytarib olish
    esa yuboruvchining. Aralashtirsak, biznes o'z taklifini "qabul
    qilingan" deb belgilab qo'yishi mumkin bo'lardi.
  */
  if ((action === 'WITHDRAW') === isRecipient) {
    throw new ForbiddenError('Bu amalni bajara olmaysiz.');
  }

  /**
   * Qabul qilinganda SUHBAT ochiladi.
   *
   * ── Nima uchun aynan shu paytda ─────────────────────────────────────
   * Taklif yuborilganda ochilsa, rad etilgan takliflar ham suhbat
   * yaratardi va ikkala tomonning ro'yxati bo'sh suhbatlarga
   * to'lib ketardi.
   *
   * ── Nima uchun xato YUTILADI ────────────────────────────────────────
   * Suhbat ochilmasa ham taklif qabul qilingan bo'lishi kerak:
   * kelishuv allaqachon bo'lgan. Odam suhbatni qo'lda ham ocha
   * oladi.
   */
  let conversationId: string | null = null;

  if (action === 'ACCEPT') {
    try {
      const person = toPerson(offer.fromUser);

      const result = await openConversation(viewerId, { username: person.username });

      conversationId = result.conversationId;
    } catch (error) {
      logger.warn({ err: error, offerId }, 'Hamkorlik suhbati ochilmadi');
    }
  }

  const status = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'WITHDRAWN';

  /*
    Yozish `updateMany` bilan, `status: PENDING` sharti ostida.

    Ikki qurilmadan bir vaqtda javob berilsa, ikkinchisi hech
    narsa o'zgartirmaydi — "qabul qildim, keyin rad etdim" degan
    holat paydo bo'lmaydi.
  */
  const updated = await prisma.collabOffer.updateMany({
    where: { id: offerId, status: 'PENDING' },
    data: { status, respondedAt: new Date(), conversationId },
  });

  if (updated.count === 0) {
    throw new ConflictError('Bu taklifga allaqachon javob berilgan.');
  }

  const fresh = await prisma.collabOffer.findUniqueOrThrow({
    where: { id: offerId },
    select: OFFER_SELECT,
  });

  if (action !== 'WITHDRAW') {
    void notifyCollabResponse(offer.fromUserId, fresh, action === 'ACCEPT');
  }

  return toOfferView(fresh, viewerId);
}

/** Yuboruvchiga javob kelganini bildiradi. */
async function notifyCollabResponse(
  toUserId: string,
  row: OfferRow,
  isAccepted: boolean,
): Promise<void> {
  try {
    const person = toPerson(row.toUser);

    await notifyUser(toUserId, 'collab.offer_answered', {
      offerId: row.id,
      subject: row.subject,
      actorName: person.fullName ?? `@${person.username}`,
      isAccepted,
    });
  } catch (error) {
    logger.warn({ err: error, toUserId }, 'Hamkorlik javobi bildirishnomasi yuborilmadi');
  }
}

/** Takliflar ro'yxati — kelgan yoki yuborilgan. */
export async function listCollabOffers(
  viewerId: string,
  query: CollabQuery,
): Promise<{ offers: CollabOfferView[]; pendingCount: number }> {
  const where: Prisma.CollabOfferWhereInput =
    query.box === 'IN' ? { toUserId: viewerId } : { fromUserId: viewerId };

  const [rows, pendingCount] = await Promise.all([
    prisma.collabOffer.findMany({
      where,
      select: OFFER_SELECT,
      /*
        Javob kutayotganlar BIRINCHI.

        Vaqt bo'yicha tartiblasak, eski javobsiz taklif javob
        berilgan yangilar ostida qolib ketardi — ya'ni aynan
        harakat talab qiladigani ko'rinmasdi.
      */
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: query.limit,
    }),
    /*
      Belgi (badge) uchun son — FAQAT kelgan takliflarda.

      Yuborilgan taklifning javobsizligi harakat talab qilmaydi:
      kutishdan boshqa iloji yo'q.
    */
    prisma.collabOffer.count({ where: { toUserId: viewerId, status: 'PENDING' } }),
  ]);

  return { offers: rows.map((row) => toOfferView(row, viewerId)), pendingCount };
}

/**
 * Ijodkorlar katalogi — hamkorlikka OCHIQLARI.
 *
 * ── Nima uchun faqat ochiqlari ────────────────────────────────────────
 * Katalogning maqsadi — biznesga "kimga yozsam bo'ladi?" degan
 * savolga javob berish. Yopiq ijodkorni ko'rsatish faqat behuda
 * urinishga olib borardi: taklif baribir rad etilardi.
 *
 * ── Nima uchun KO'RISHLAR bo'yicha tartiblanadi ───────────────────────
 * Obunachilar soni bir marta yig'ilib, keyin o'zgarmasligi mumkin.
 * Ko'rishlar esa ijodkor HOZIR ishlayaptimi degan savolga javob
 * beradi — biznes uchun aynan shu muhim.
 */
export async function listCreators(
  viewerId: string,
  query: CreatorsQuery,
): Promise<CreatorCardView[]> {
  const term = query.q?.trim() ?? '';

  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: { not: 'SUSPENDED' },
      id: { not: viewerId },
      profile: {
        isOpenToCollab: true,
        ...(term.length >= 2
          ? {
              OR: [
                { username: { contains: term, mode: 'insensitive' } },
                { user: { firstName: { contains: term, mode: 'insensitive' } } },
                { user: { lastName: { contains: term, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      profile: { select: { username: true, isVerified: true, collabNote: true } },
    },
    /*
      Chegara ATAYLAB kengroq.

      Tartiblash ko'rishlar bo'yicha bo'ladi va u ikkinchi so'rovda
      hisoblanadi. Shuning uchun bu yerda kerakligidan ko'proq
      olinadi — aks holda eng ko'p ko'rilgan ijodkor ro'yxatga
      umuman tushmay qolishi mumkin edi.
    */
    take: query.limit * 4,
  });

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  /**
   * Sonlar IKKI so'rovda yig'iladi.
   *
   * Har bir ijodkor uchun alohida so'rov yuborish o'ttizta so'rov
   * degani. Guruhlash esa ikkitasi bilan tugaydi.
   */
  const [views, followers] = await Promise.all([
    prisma.post.groupBy({
      by: ['authorId'],
      where: { authorId: { in: ids }, deletedAt: null, videoUrl: { not: null } },
      _sum: { viewCount: true },
    }),
    prisma.follow.groupBy({
      by: ['followingId'],
      where: { followingId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const viewMap = new Map(views.map((row) => [row.authorId, row._sum.viewCount ?? 0]));
  const followerMap = new Map(followers.map((row) => [row.followingId, row._count._all]));

  return rows
    .map((row) => {
      const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ');

      return {
        username: row.profile?.username ?? '',
        fullName: fullName || null,
        avatarUrl: row.avatarUrl,
        isVerified: row.profile?.isVerified ?? false,
        collabNote: row.profile?.collabNote ?? null,
        followerCount: followerMap.get(row.id) ?? 0,
        videoViewCount: viewMap.get(row.id) ?? 0,
      };
    })
    /*
      Teng ko'rishda NOM bo'yicha tartiblanadi.

      Aks holda yangi ijodkorlar (hammasida nol) har so'rovda
      boshqa tartibda chiqardi va ro'yxat "sakrab" turgandek
      ko'rinardi.
    */
    .sort(
      (a, b) =>
        b.videoViewCount - a.videoViewCount ||
        b.followerCount - a.followerCount ||
        a.username.localeCompare(b.username),
    )
    .slice(0, query.limit);
}
