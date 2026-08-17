import { Prisma } from '@/generated/prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { blockedUserIds, findBlock, isBlockedBetween } from '@/modules/moderation/moderation.service';
import { deleteImageByUrl } from '@/modules/upload/upload.service';
import { notifyUser } from '@/modules/notification/notification.service';
import { sendPush } from '@/modules/notification/push.service';
import {
  AUTHOR_SELECT,
  LIVE_AUTHOR,
  notHiddenBy,
  postSelect,
  toAuthorView,
  toPostView,
} from '@/modules/feed/feed.select';
import type { CommentsQuery, FeedQuery } from '@/modules/feed/feed.schemas';
import { MAX_PLACE_NAME_LENGTH, SHORT_VIDEO_SECONDS } from '@/modules/feed/feed.types';
import { MAX_ATTACHMENTS } from '@/config/attachments';
import { prepareAttachments, type AttachmentInput } from '@/modules/feed/attachment.service';
import { NEARBY_RADIUS_KM, blurCoordinate, boundingBox, isValidCoordinate } from '@/config/geo';
import { extractHashtags, extractMentions, isValidHashtag } from '@/modules/feed/feed.text';
import { invalidateRecommendations } from '@/modules/feed/recommend.cache';
import { isValidTrim, trimmedSeconds } from '@/modules/feed/video-trim';
import {
  CTA_HANDLE_PATTERN,
  POST_CTA_CONFIG,
  cleanHandle,
  type PostCtaKindName,
} from '@/config/post-cta';
import { normalizeUzPhone } from '@/lib/phone';
import { listRecommendedFeed } from '@/modules/feed/recommend.service';
import { getFeedSettings, isAllowedBy, isNotifyEnabled } from '@/modules/feed/settings.service';
import type { PostCategoryName } from '@/modules/feed/feed.types';
import type { CommentView, HashtagView, PostView } from '@/modules/feed/feed.types';

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


/** Men kuzatadigan odamlarning ID'lari. */
async function followingIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  return rows.map((row) => row.followingId);
}

/**
 * Qiziqishlarni lenta shartiga aylantiradi.
 *
 * ── Nima uchun "yuqoriroq ko'tarish" EMAS, filtr ─────────────────────
 * Tabiiy yechim "qiziqishlarni yuqoriga chiqarish" bo'lardi. Lekin
 * lenta vaqt bo'yicha tartiblangan va sahifalash ham vaqtga
 * bog'langan (`cursor`). Tartibni o'zgartirsak, ikkinchi sahifada
 * postlar takrorlanib yoki tushib qolardi.
 *
 * Shuning uchun sozlama HALOL va oddiy ishlaydi: tanlangan bo'limlar
 * lentaga tushadi, tanlanmaganlari tushmaydi. Ekranda ham aynan
 * shunday yozilgan — va'da bajarilishi kerak.
 *
 * ── Nima uchun bo'limsiz postlar HAR DOIM qoladi ─────────────────────
 * "Bugun havo yaxshi" degan post hech qaysi bo'limga tushmaydi. Uni
 * qiziqish tanlagan odamdan yashirsak, do'stlarining oddiy postlari
 * lentadan yo'qolardi.
 */
function buildPreferenceFilter(
  interests: PostCategoryName[],
  notInterested: PostCategoryName[],
): Prisma.PostWhereInput {
  if (interests.length > 0) {
    return { OR: [{ category: null }, { category: { in: interests } }] };
  }

  if (notInterested.length > 0) {
    return { OR: [{ category: null }, { category: { notIn: notInterested } }] };
  }

  return {};
}

export async function listFeed(
  viewerId: string,
  query: FeedQuery,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  /**
   * "Siz uchun" — BUTUNLAY boshqa yo'l.
   *
   * U vaqt bo'yicha emas, BAHO bo'yicha tartiblanadi va sahifalash
   * ham boshqacha ishlaydi. Ikkalasini bitta funksiyaga
   * tiqishtirsak, har bir shart ikki marta tekshirilishi kerak
   * bo'lardi va biri albatta unutilardi.
   */
  if (query.tab === 'FOR_YOU') {
    const settings = await getFeedSettings(viewerId);

    return listRecommendedFeed(viewerId, {
      cursor: query.cursor,
      limit: query.limit,
      // Har bir bo'lim o'z tartiblangan ro'yxatiga ega.
      scope: query.category ?? 'all',
      extraWhere: {
        ...(query.category ? { category: query.category } : {}),
        ...(settings.sensitiveFilter ? { reports: { none: { status: 'OPEN' } } } : {}),
        ...(query.category ? {} : buildPreferenceFilter(settings.interests, settings.notInterested)),
      },
    });
  }

  const [hidden, following, settings] = await Promise.all([
    blockedUserIds(viewerId),
    query.tab === 'FOLLOWING' ? followingIds(viewerId) : Promise.resolve<string[]>([]),
    getFeedSettings(viewerId),
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
  /**
   * Kategoriya filtri YORLIQDAN alohida qo'shiladi.
   *
   * Shu sababdan "Obunalarim + Restoranlar" ham ishlaydi: ikkalasi
   * bir-birini almashtirmaydi, balki qo'shiladi.
   */
  const categoryFilter: Prisma.PostWhereInput = query.category ? { category: query.category } : {};

  /**
   * Uzunlik filtri FAQAT video yorlig'ida.
   *
   * Matnli postda uzunlik yo'q: uni boshqa yorliqda qo'llasak,
   * lenta sababsiz bo'shab qolardi.
   *
   * Uzunligi noma'lum (eski) videolar QISQA deb hisoblanadi —
   * yuklash chegarasi baribir 60 soniya bo'lgan.
   */
  /**
   * Foydalanuvchi sozlamalari lentaga QO'LLANADI.
   *
   * ── Nima uchun "qizig'i emas" kategoriya tanlanganda ishlamaydi ─────
   * Odam ataylab "Restoranlar" doirasini bosgan bo'lsa, u aynan shuni
   * so'ragan. Sozlamaga qarab bo'sh ekran ko'rsatish — so'rovni
   * e'tiborsiz qoldirish bo'lardi.
   *
   * Ya'ni sozlama UMUMIY lentani tozalaydi, aniq so'rovni emas.
   */
  const settingsFilter: Prisma.PostWhereInput = query.category
    ? {}
    : buildPreferenceFilter(settings.interests, settings.notInterested);

  /**
   * Hassos filtr — shikoyat qilingan, lekin hali ko'rilmagan postlar.
   *
   * ── Nima uchun FAQAT "ko'rilmagan" ──────────────────────────────────
   * Moderator ko'rib chiqqan post ikki holatda bo'ladi: chora ko'rilgan
   * (u allaqachon o'chirilgan) yoki asos topilmagan (u toza). Ikkalasini
   * ham yashirishning ma'nosi yo'q.
   *
   * Xavf esa aynan ORALIQDA: shikoyat kelgan, lekin hali hech kim
   * ko'rmagan post. Filtr yoqilgan odam uni ko'rmaydi.
   */
  const sensitiveFilterWhere: Prisma.PostWhereInput = settings.sensitiveFilter
    ? { reports: { none: { status: 'OPEN' } } }
    : {};

  /**
   * "Yaqin atrofda" — koordinata oralig'i bo'yicha filtr.
   *
   * ── Nima uchun joylashuvsiz postlar CHIQARIB tashlanadi ─────────────
   * Boshqa filtrlarda bo'limsiz postlar qoldirilgan edi ("bugun havo
   * yaxshi" degan post hech qaysi bo'limga tushmaydi, lekin do'stning
   * posti sifatida ko'rinishi kerak).
   *
   * Bu yerda esa aksincha: odam AYNAN "menga yaqin nima bor?" deb
   * so'ragan. Joylashuvsiz postni ko'rsatsak, savolga javob
   * bermagan bo'lardik — u qayerdaligi noma'lum.
   */
  const nearbyFilter: Prisma.PostWhereInput =
    query.lat !== undefined && query.lng !== undefined
      ? (() => {
          const box = boundingBox({ latitude: query.lat, longitude: query.lng }, NEARBY_RADIUS_KM);

          return {
            latitude: { gte: box.minLatitude, lte: box.maxLatitude },
            longitude: { gte: box.minLongitude, lte: box.maxLongitude },
          };
        })()
      : {};

  const durationFilter: Prisma.PostWhereInput =
    query.tab === 'VIDEO' && query.duration
      ? query.duration === 'SHORT'
        ? { OR: [{ videoSeconds: { lte: SHORT_VIDEO_SECONDS } }, { videoSeconds: null }] }
        : { videoSeconds: { gt: SHORT_VIDEO_SECONDS } }
      : {};

  const rows = await prisma.post.findMany({
    where: {
      ...LIVE_AUTHOR,
      ...scope,
      ...categoryFilter,
      ...durationFilter,
      ...settingsFilter,
      ...sensitiveFilterWhere,
      ...nearbyFilter,
      /*
        "Qiziq emas" bosilgan postlar — BARCHA yorliqlarda.

        Obunalarim va Video bo'limlarida ham qo'llanadi: odam
        do'stining bitta postini yashirsa, u obunani bekor qilgani
        emas — faqat o'sha postni ko'rmoqchi emas.
      */
      ...notHiddenBy(viewerId),
      ...olderThan(query.cursor),
    },
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
  category?: PostCategoryName | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  videoSeconds?: number | null;
  /**
   * Kesish nuqtalari — video muharriridan.
   *
   * Ikkalasi BIRGA keladi yoki umuman kelmaydi: yarim ma'lumot
   * bilan pleyer qayerda to'xtashini bilmasdi.
   */
  videoStartSeconds?: number | null;
  videoEndSeconds?: number | null;
  /**
   * Biriktirilgan narsalar — mahsulot, taom, restoran, ish, mehmonxona.
   *
   * Faqat videoga qo'yiladi va nishonlar serverda tekshiriladi.
   */
  attachments?: AttachmentInput[];
  /**
   * Videoning chaqiruvi — bittasi.
   *
   * Qiymat SERVERDA tozalanadi: `@` olib tashlanadi, telefon
   * me'yorlashtiriladi va naqshga moslik tekshiriladi.
   */
  cta?: { kind: PostCtaKindName; value?: string } | null;
  /**
   * Joylashuv — ixtiyoriy.
   *
   * Uchalasi BIRGA keladi yoki umuman kelmaydi: nomsiz koordinata
   * ekranda ko'rsatib bo'lmaydigan raqam bo'lardi, koordinatasiz
   * nom esa "yaqin atrofda" da ishlamasdi.
   */
  place?: { name: string; latitude: number; longitude: number } | null;
}

/**
 * Joylashuvni saqlashga tayyorlaydi.
 *
 * Ikki ish qiladi: koordinata aniqligini pasaytiradi va nomni
 * chegaralaydi. Ikkalasi ham BRAUZERDAN kelgan ma'lumot ustida
 * bajariladi, ya'ni ularga ishonib bo'lmaydi.
 */
function normalizePlace(
  place: CreatePostData['place'],
): { name: string; latitude: number; longitude: number } | null {
  if (!place) return null;

  if (!isValidCoordinate(place.latitude, place.longitude)) {
    throw new ConflictError("Joylashuv noto'g'ri.");
  }

  const name = place.name.trim().slice(0, MAX_PLACE_NAME_LENGTH);

  if (name.length === 0) return null;

  return {
    name,
    latitude: blurCoordinate(place.latitude),
    longitude: blurCoordinate(place.longitude),
  };
}

/**
 * Kesim va davomiylikni KELISHTIRADI.
 *
 * ── Nima uchun davomiylik QAYTA hisoblanadi ──────────────────────────
 * Brauzer ikkala qiymatni ham yuboradi: kesim nuqtalarini va
 * davomiylikni. Ular bir-biriga mos kelishi SHART, chunki lentadagi
 * "0:12" yozuvi va "qisqa/uzun" filtri aynan davomiylikdan oladi.
 *
 * Ikkalasiga ham ishonsak, ular ajralib ketishi mumkin edi: ekranda
 * "0:12" ko'rinib, video 40 soniya o'ynardi. Buni chizmalarda
 * payqash deyarli imkonsiz.
 *
 * Shuning uchun kesim bo'lsa, davomiylik UNDAN hisoblanadi va
 * brauzerdan kelgan son e'tiborga olinmaydi.
 */
function normalizeVideo(data: CreatePostData): {
  videoStartSeconds: number | null;
  videoEndSeconds: number | null;
  videoSeconds: number | null;
} {
  const start = data.videoStartSeconds ?? null;
  const end = data.videoEndSeconds ?? null;

  // Videosiz postda video maydonlari umuman saqlanmaydi.
  if (!data.videoUrl || start === null || end === null) {
    return {
      videoStartSeconds: null,
      videoEndSeconds: null,
      videoSeconds: data.videoUrl ? (data.videoSeconds ?? null) : null,
    };
  }

  if (!isValidTrim(start, end)) {
    throw new ConflictError("Kesish nuqtalari noto'g'ri.");
  }

  const range = { start, end };

  return {
    videoStartSeconds: range.start,
    videoEndSeconds: range.end,
    videoSeconds: trimmedSeconds(range),
  };
}

/**
 * Chaqiruvni saqlashga tayyorlaydi.
 *
 * ── Nima uchun qiymat SERVERDA tozalanadi ────────────────────────────
 * Brauzerdagi tozalashni chetlab o'tish oson: so'rovni qo'lda yuborish
 * yetarli. Tozalanmagan qiymat esa bazaga tushib, ekranda buzuq
 * havolaga aylanardi.
 *
 * ── Nima uchun naqsh QAT'IY ──────────────────────────────────────────
 * Manzil `src/config/post-cta.ts` da nomdan quriladi. Nomga bo'sh joy
 * yoki `/` tushsa, hosil bo'lgan manzil butunlay boshqa sahifaga
 * olib borishi mumkin edi.
 */
function normalizeCta(data: CreatePostData): {
  ctaKind: PostCtaKindName | null;
  ctaValue: string | null;
} {
  const cta = data.cta ?? null;

  // Videosiz postda chaqiruv saqlanmaydi — sxema ham buni rad etadi.
  if (!cta || !data.videoUrl) {
    return { ctaKind: null, ctaValue: null };
  }

  const config = POST_CTA_CONFIG[cta.kind];

  /*
    `FOLLOW` va `MESSAGE` da qiymat BO'LMASLIGI kerak.

    Brauzer uni yuborgan bo'lsa ham tashlab yuboriladi: bazadagi
    shart bunday qatorni baribir rad etardi, lekin xato matni
    foydalanuvchiga tushunarsiz bo'lardi.
  */
  if (!config.needsValue) {
    return { ctaKind: cta.kind, ctaValue: null };
  }

  const raw = (cta.value ?? '').trim();

  if (raw.length === 0) {
    throw new ConflictError('Chaqiruv uchun nom yoki raqam kiriting.');
  }

  if (cta.kind === 'PHONE') {
    const phone = normalizeUzPhone(raw);

    if (!phone) {
      throw new ConflictError("Telefon raqami noto'g'ri. Namuna: +998 90 123 45 67");
    }

    return { ctaKind: cta.kind, ctaValue: phone };
  }

  const handle = cleanHandle(raw);

  if (!CTA_HANDLE_PATTERN.test(handle)) {
    throw new ConflictError(
      "Nom noto'g'ri. Faqat harflar, raqamlar, nuqta va pastki chiziq ishlatiladi.",
    );
  }

  return { ctaKind: cta.kind, ctaValue: handle };
}

export async function createPost(authorId: string, data: CreatePostData): Promise<PostView> {
  const attachments = data.attachments ?? [];

  /**
   * Biriktirmani faqat VIDEOGA qo'yish mumkin.
   *
   * Oddiy postda tugma qo'yadigan joy yo'q va u reklama uchun eng
   * oson yo'lga aylanardi: matnsiz post + beshta tugma.
   */
  if (attachments.length > 0 && !data.videoUrl) {
    throw new ConflictError('Biriktirmani faqat videoga qo\'yish mumkin.');
  }

  if (attachments.length > MAX_ATTACHMENTS) {
    throw new ConflictError(`Bitta videoga ko'pi bilan ${MAX_ATTACHMENTS} ta narsa biriktiriladi.`);
  }

  /*
    Nishonlar TEKSHIRILADI — mavjudmi va hozir ochiqmi.

    Batafsil sabab `attachment.service.ts` da.
  */
  const attachmentRows = await prepareAttachments(attachments);

  /**
   * Koordinata aniqligi SERVERDA pasaytiriladi.
   *
   * ── Nima uchun brauzerga ishonilmaydi ───────────────────────────────
   * Brauzerdagi yaxlitlashni chetlab o'tish oson: so'rovni qo'lda
   * yuborish yetarli. Aniq koordinata esa odamning uy manzilini
   * oshkor qiladi — bu qaytarib bo'lmaydigan zarar.
   *
   * Shuning uchun himoya aynan shu yerda, yozishdan oldin turadi.
   */
  const place = normalizePlace(data.place);
  const video = normalizeVideo(data);
  const cta = normalizeCta(data);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId,
        body: data.body,
        imageUrl: data.imageUrl ?? null,
        videoUrl: data.videoUrl ?? null,
        videoPosterUrl: data.videoPosterUrl ?? null,
        ...video,
        ...cta,
        category: data.category ?? null,
        placeName: place?.name ?? null,
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
        attachments: { create: attachmentRows },
      },
      select: { id: true },
    });

    await syncHashtags(tx, created.id, data.body);

    return tx.post.findUniqueOrThrow({ where: { id: created.id }, select: postSelect(authorId) });
  });

  logger.info(
    { authorId, postId: row.id, hasVideo: Boolean(data.videoUrl), attachments: attachmentRows.length },
    'Yangi post',
  );

  void notifyMentioned(authorId, row.id, data.body);

  /**
   * Muallifning tavsiya keshi BEKOR qilinadi.
   *
   * ── HAQIQIY MUAMMO, sinov topgan ────────────────────────────────────
   * Tavsiya ro'yxati o'n daqiqa saqlanadi. Odam post joylab, "Siz
   * uchun" ga o'tsa, o'z postini KO'RMASDI va "joylanmadimi?" deb
   * ikkinchi marta yozardi.
   *
   * Boshqalarning yangi postlari esa o'n daqiqagacha kutadi — bu
   * normal: lenta har soniyada qayta hisoblanishi shart emas.
   * Lekin O'Z posting darhol ko'rinishi kerak.
   */
  void invalidateRecommendations(authorId);

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
export async function updatePost(
  postId: string,
  userId: string,
  body: string,
  category?: PostCategoryName | null,
): Promise<PostView> {
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
      data: {
        body: body.trim(),
        editedAt: new Date(),
        /**
         * Bo'lim FAQAT yuborilgan bo'lsa o'zgaradi.
         *
         * `undefined` — tegilmasin, `null` — olib tashlansin. Ikkalasini
         * ajratmasak, faqat matnni tahrirlagan odam bo'limini ham
         * bilmasdan yo'qotardi.
         */
        ...(category === undefined ? {} : { category }),
      },
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
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null, videoUrl: { not: null }, authorId: { not: viewerId } },
    select: { id: true },
  });

  /**
   * Xato TASHLANMAYDI.
   *
   * Ko'rish — yordamchi ma'lumot. O'z videosi bo'lsa yoki post
   * o'chirilgan bo'lsa, brauzerga xato qaytarishning ma'nosi
   * yo'q: u baribir hech narsa qila olmaydi.
   */
  if (!post) return;

  /**
   * Ko'rish YOZIB BORILADI va son BIR MARTA oshadi.
   *
   * ── Nima uchun o'zgartirildi ────────────────────────────────────────
   * Ilgari son har ochilganda oshardi: bitta odam videoni o'n marta
   * qayta ochib, sonni sun'iy ko'tarib qo'yishi mumkin edi. Sotuvchi
   * uchun bunday son ma'nosiz.
   *
   * Endi son "NECHA KISHI ko'rdi" degan aniq ma'noga ega.
   *
   * ── Nima uchun yozuv ham kerak ──────────────────────────────────────
   * Tavsiya tizimidagi eng kuchli qoida — "ko'rganimni qayta
   * ko'rsatma". Usiz lenta har ochilganda bir xil videolarni
   * qaytarardi.
   *
   * ── Nima uchun `createMany` + `skipDuplicates` ──────────────────────
   * Bir vaqtda ikkita so'rov kelsa (ikki qurilma yoki tez ikki
   * bosish), oddiy "tekshir-keyin-yoz" ikkita qator yaratardi.
   * Bazadagi noyoblik sharti buni to'xtatadi va `skipDuplicates`
   * xatoni yutadi.
   */
  const inserted = await prisma.postSeen.createMany({
    data: [{ postId, userId: viewerId }],
    skipDuplicates: true,
  });

  if (inserted.count === 0) return;

  await prisma.post.update({
    where: { id: postId },
    data: { viewCount: { increment: 1 } },
    select: { id: true },
  });
}

/**
 * Postni "ko'rilgan" deb belgilaydi — VIDEOSIZ postlar uchun ham.
 *
 * ── Nima uchun alohida ──────────────────────────────────────────────
 * `markVideoViewed` ko'rishlar SONINI ham oshiradi va u faqat
 * videoga tegishli: matnli postda "ko'rishlar" degan tushuncha yo'q.
 *
 * Tavsiya tizimiga esa matnli post ko'rilgani ham kerak — aks holda
 * u lentada abadiy qaytaverardi.
 */
export async function markPostSeen(postIds: string[], viewerId: string): Promise<void> {
  if (postIds.length === 0) return;

  await prisma.postSeen.createMany({
    data: [...new Set(postIds)].map((postId) => ({ postId, userId: viewerId })),
    skipDuplicates: true,
  });
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
   * Muallifning IZOH sozlamasi tekshiriladi.
   *
   * ── Nima uchun bu yerda, sahifada emas ──────────────────────────────
   * Ekranda izoh maydonini yashirish yetarli emas: so'rovni to'g'ridan
   * to'g'ri yuborish oson. Ruxsat qoidasi faqat SERVERDA haqiqiy
   * kuchga ega.
   */
  if (!(await isAllowedBy(post.authorId, authorId, 'commentScope'))) {
    throw new ForbiddenError('Bu postga izoh yozish mumkin emas.');
  }

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

// ─────────────────────────────────────────────────────────────────────
// "Qiziq emas"
// ─────────────────────────────────────────────────────────────────────

/**
 * Postni yashiradi va tavsiyaga MANFIY signal beradi.
 *
 * ── Nima uchun bu shikoyatdan boshqa narsa ───────────────────────────
 * Shikoyat — "bu post QOIDANI buzgan, uni hammadan olib tashlang".
 * Uni moderator ko'radi va u boshqalarga ham ta'sir qiladi.
 *
 * "Qiziq emas" esa — "bu post yomon emas, shunchaki MENGA kerak
 * emas". U hech kimga ko'rinmaydi va faqat bitta odamning lentasiga
 * ta'sir qiladi.
 *
 * Ikkalasini bitta tugmaga birlashtirsak, odam qiziqmagan postni
 * yashirish uchun begunoh muallifni shikoyat qilishga majbur
 * bo'lardi.
 *
 * ── Nima uchun O'Z postini yashirib bo'lmaydi ────────────────────────
 * Bu chalkashlik bo'lardi: odam o'z postini "yashirdim" deb o'ylab,
 * uni boshqalar ko'rishda davom etardi. O'z postini olib tashlash
 * uchun o'chirish bor.
 */
export async function hidePost(postId: string, userId: string): Promise<{ isHidden: boolean }> {
  const post = await requireLivePost(postId, userId);

  if (post.authorId === userId) {
    throw new ConflictError("O'z postingizni yashira olmaysiz. Uni o'chirishingiz mumkin.");
  }

  try {
    await prisma.postHidden.create({ data: { postId, userId } });
  } catch (error) {
    // Ikki marta bosilgan — natija baribir kerakli holat.
    const isDuplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

    if (!isDuplicate) throw error;
  }

  /**
   * Tartiblangan ro'yxat DARHOL bekor qilinadi.
   *
   * Aks holda odam postni yashirar, lentani yangilar va o'sha post
   * yana chiqib turardi — 10 daqiqa davomida. Bu tugmani butunlay
   * ishonchsiz qilardi.
   */
  void invalidateRecommendations(userId);

  return { isHidden: true };
}

/**
 * Yashirishni QAYTARADI.
 *
 * ── Nima uchun bu shart ──────────────────────────────────────────────
 * Tugma post menyusida turadi va tasodifan bosilishi juda oson.
 * Qaytarish yo'li bo'lmasa, bitta noto'g'ri bosish post bilan birga
 * uning izohlari va havolasini butunlay yo'qotardi.
 *
 * Post tekshirilmaydi: muallif uni o'chirgan bo'lsa ham, yozuvni
 * o'chirish mumkin bo'lishi kerak.
 */
export async function unhidePost(postId: string, userId: string): Promise<{ isHidden: boolean }> {
  await prisma.postHidden.deleteMany({ where: { postId, userId } });

  void invalidateRecommendations(userId);

  return { isHidden: false };
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

/**
 * Men yoqtirgan postlar.
 *
 * ── Nima uchun SAQLANGANLARDAN alohida ────────────────────────────────
 * "Yoqtirdim" — muallifga bildirilgan ochiq baho. "Saqladim" esa
 * o'zim uchun belgi: keyin ko'rish, sotib olish, eslab qolish.
 *
 * Ikkalasi bir ro'yxatga qo'shilsa, odam yoqtirgan yuzlab video
 * saqlaganlarini bosib ketardi va saqlash ma'nosini yo'qotardi.
 *
 * ── Nima uchun tartib YOQTIRISH vaqti bo'yicha ────────────────────────
 * Odam "kecha yoqtirgan videomni" izlaydi, "kecha joylangan" ni emas.
 */
export async function listLikedPosts(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  const rows = await prisma.postLike.findMany({
    where: {
      userId,
      ...(cursor
        ? (() => {
            const { createdAt, id } = parseCursor(cursor);

            return { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }] };
          })()
        : {}),
      // O'chirilgan post bu ro'yxatda ham ko'rinmaydi.
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

/**
 * Oxirgi ko'rganlarim.
 *
 * ── Nima uchun bu bo'lim KERAK ────────────────────────────────────────
 * Lentada surib ketayotgan odam qiziqarli videoni ko'radi-yu, uni
 * saqlashni unutadi. Keyin qidiruvdan topa olmaydi: video nomi ham,
 * muallifi ham esida qolmagan.
 *
 * "Oxirgi ko'rganlar" bu muammoni butunlay yechadi va u hech qanday
 * qo'shimcha harakat talab qilmaydi — ro'yxat o'zi to'ladi.
 *
 * ── Nima uchun tartib KO'RISH vaqti bo'yicha ──────────────────────────
 * Odam "bugun ko'rgan videomni" izlaydi, "bugun joylangan" ni emas.
 *
 * ── Nima uchun bu SAQLANGANLARDAN farq qiladi ─────────────────────────
 * Saqlash — ataylab qilingan tanlov va u abadiy qoladi. Ko'rish esa
 * o'z-o'zidan yoziladi va ro'yxat tez almashadi.
 */
export async function listSeenPosts(
  userId: string,
  cursor?: string,
  limit = 20,
): Promise<{ posts: PostView[]; nextCursor: string | null }> {
  const rows = await prisma.postSeen.findMany({
    where: {
      userId,
      ...(cursor
        ? (() => {
            const { createdAt, id } = parseCursor(cursor);

            return { OR: [{ seenAt: { lt: createdAt } }, { seenAt: createdAt, id: { lt: id } }] };
          })()
        : {}),
      // O'chirilgan post bu ro'yxatda ham ko'rinmaydi.
      post: LIVE_AUTHOR,
    },
    orderBy: [{ seenAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: { id: true, seenAt: true, post: { select: postSelect(userId) } },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((row) => toPostView(row.post, userId)),
    nextCursor:
      hasMore && page.length > 0
        ? buildCursor({ createdAt: page[page.length - 1].seenAt, id: page[page.length - 1].id })
        : null,
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
 * Videodagi biriktirma tugmasi bosilganini yozadi.
 *
 * ── Nima uchun O'Z bosishi sanalmaydi ────────────────────────────────
 * Ko'rishlar bilan bir xil sabab: muallif o'z tugmasini bosib,
 * sonni ko'tarib qo'ymasligi kerak.
 *
 * ── Nima uchun MAHSULOT uchun qo'shimcha yozuv ───────────────────────
 * Umumiy `clickCount` "necha marta bosilgan?" degan savolga javob
 * beradi. Mahsulotda esa ikkinchi savol ham bor: "bu bosish
 * XARIDGA aylandimi?".
 *
 * Unga javob berish uchun KIM bosgani kerak — keyin o'sha odam
 * mahsulotni sotib olsa, buyurtma qaysi video keltirganini aynan
 * shu yozuvdan bilib olamiz.
 *
 * Qolgan turlarda bunday zanjir yo'q: ish e'loniga ariza yoki
 * mehmonxonaga bron o'z modulida kuzatiladi.
 */
export async function markAttachmentClicked(
  postId: string,
  attachmentId: string,
  viewerId: string,
): Promise<void> {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true },
  });

  if (!post || post.authorId === viewerId) return;

  /*
    Son `updateMany` ichida oshiriladi.

    Avval o'qib, keyin yozsak, ikki odam bir vaqtda bosganda
    bittasining bosishi yo'qolardi.

    `postId` sharti ham qo'yiladi: biriktirma ID si to'g'ri, lekin
    boshqa postniki bo'lishi mumkin — u holda begona postning
    ko'rsatkichi oshib ketardi.
  */
  const updated = await prisma.postAttachment.updateMany({
    where: { id: attachmentId, postId },
    data: { clickCount: { increment: 1 } },
  });

  if (updated.count === 0) return;

  const link = await prisma.postAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      clickCount: true,
      kind: true,
      productId: true,
      product: { select: { name: true } },
      menuItem: { select: { name: true } },
      restaurant: { select: { name: true } },
      vacancy: { select: { title: true } },
      hotel: { select: { name: true } },
    },
  });

  if (!link) return;

  if (link.productId !== null) {
    await prisma.postProductClick.upsert({
      where: { userId_productId: { userId: viewerId, productId: link.productId } },
      create: { postId, productId: link.productId, userId: viewerId },
      update: { postId, clickedAt: new Date() },
    });
  }

  if (!CLICK_MILESTONES.includes(link.clickCount)) return;

  const name =
    link.product?.name ??
    link.menuItem?.name ??
    link.restaurant?.name ??
    link.vacancy?.title ??
    link.hotel?.name ??
    'Biriktirma';

  void notifyProductClicked(post.authorId, postId, name, link.clickCount);
}

/**
 * Chaqiruv tugmasi bosilganini yozadi.
 *
 * ── Nima uchun BIRIKTIRMADAN alohida ─────────────────────────────────
 * Biriktirma bosilishi "odam mahsulotni ochdi" degani va u sotuvchining
 * ko'rsatkichi. Chaqiruv esa MUALLIFNING o'zi haqida: "necha kishi
 * obuna bo'ldi, necha kishi yozdi".
 *
 * Ikkalasini bitta songa qo'shsak, muallif "videom sotdimi yoki
 * obunachi keltirdimi?" degan savolga javob topa olmasdi.
 *
 * ── Nima uchun O'Z bosishi sanalmaydi ────────────────────────────────
 * Muallif o'z tugmasini bosib, sonni ko'tarib qo'ymasligi kerak.
 */
export async function markCtaClicked(postId: string, viewerId: string): Promise<void> {
  /*
    Son `updateMany` ichida oshiriladi.

    Avval o'qib, keyin yozsak, ikki odam bir vaqtda bosganda
    bittasining bosishi yo'qolardi.

    Shartlar ham SHU YERDA: chaqiruvi bo'lmagan yoki o'chirilgan
    postda son oshmaydi va muallifning o'zi sanalmaydi.
  */
  await prisma.post.updateMany({
    where: {
      id: postId,
      deletedAt: null,
      ctaKind: { not: null },
      authorId: { not: viewerId },
    },
    data: { ctaClickCount: { increment: 1 } },
  });
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
    if (!(await isNotifyEnabled(authorId, 'notifyLike'))) return;

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
    if (!(await isNotifyEnabled(authorId, 'notifyComment'))) return;

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
    if (!(await isNotifyEnabled(root.authorId, 'notifyComment'))) return;

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
    if (!(await isNotifyEnabled(authorId, 'notifyLike'))) return;

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
      if (!(await isNotifyEnabled(profile.userId, 'notifyMention'))) continue;

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
