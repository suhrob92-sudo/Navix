import { Prisma } from '@/generated/prisma/client';
import { formatTiyin } from '@/lib/money';
import type { PostAttachmentView, PostAuthorView, PostView } from '@/modules/feed/feed.types';

/**
 * Postni o'qish — MAYDONLAR va o'girish.
 *
 * ── Nima uchun `feed.service.ts` dan ajratildi ────────────────────────
 * Bu qismni uchta modul ishlatadi: asosiy lenta, qidiruv va tavsiya
 * tizimi. Ular `feed.service.ts` dan olsa, tavsiya moduli lentaga,
 * lenta esa tavsiyaga murojaat qilardi — AYLANMA bog'lanish.
 *
 * Aylanma bog'lanish TypeScript'da sezilmaydi, lekin ishga
 * tushirishda bir modul ikkinchisidan `undefined` olib qolishi
 * mumkin va sabab topish uchun soatlab qidirishga to'g'ri keladi.
 *
 * Bu fayl esa hech kimga bog'lanmaydi — u zanjirning eng pastida
 * turadi.
 */

export const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  profile: { select: { username: true, isVerified: true } },
} as const;

type AuthorRow = Prisma.UserGetPayload<{ select: typeof AUTHOR_SELECT }>;

export function toAuthorView(row: AuthorRow): PostAuthorView {
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
export function postSelect(viewerId: string) {
  return {
    id: true,
    body: true,
    imageUrl: true,
    videoUrl: true,
    videoPosterUrl: true,
    videoSeconds: true,
    videoStartSeconds: true,
    videoEndSeconds: true,
    ctaKind: true,
    ctaValue: true,
    ctaClickCount: true,
    pinnedAt: true,
    isSponsored: true,
    viewCount: true,
    category: true,
    placeName: true,
    latitude: true,
    longitude: true,
    /**
     * Biriktirilgan mahsulotlar — tugma uchun kerakli MINIMUM.
     *
     * To'liq mahsulot olinsa, lentadagi har bir video uchun tavsif,
     * zaxira va boshqa ustunlar ham o'qilardi. Tugmada esa faqat
     * nom va narx ko'rinadi.
     */
    attachments: {
      select: {
        id: true,
        kind: true,
        sortOrder: true,
        clickCount: true,
        product: {
          select: {
            name: true,
            slug: true,
            price: true,
            isActive: true,
            stock: true,
            shop: { select: { name: true, isActive: true } },
          },
        },
        /*
          Taomning O'Z sahifasi yo'q — havola restoranga olib boradi.
          Shuning uchun restoranning `slug` i ham o'qiladi.
        */
        menuItem: {
          select: {
            name: true,
            price: true,
            isAvailable: true,
            restaurant: { select: { name: true, slug: true, isActive: true } },
          },
        },
        restaurant: { select: { name: true, slug: true, isActive: true, cuisine: true } },
        vacancy: {
          select: {
            title: true,
            slug: true,
            city: true,
            salaryMin: true,
            salaryMax: true,
            isActive: true,
            company: { select: { name: true } },
          },
        },
        hotel: { select: { name: true, slug: true, city: true, isActive: true } },
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

export type PostRow = Prisma.PostGetPayload<{ select: ReturnType<typeof postSelect> }>;

/**
 * Narxni ekranga tayyor qatorga o'giradi.
 *
 * Narx bazada TIYINDA saqlanadi va `BigInt` bo'ladi. Uni brauzerga
 * xom holda yuborib, har ekranda qayta formatlash mumkin edi — lekin
 * unda bitta joyda "12000" deb, boshqasida "120 so'm" deb chiqib
 * qolishi aniq edi.
 */
function priceLine(value: bigint): string {
  return formatTiyin(Number(value));
}

/** Bo'sh bo'lmagan qismlarni nuqta bilan qo'shadi. */
function joinParts(...parts: (string | null | undefined)[]): string | null {
  const clean = parts.filter((part): part is string => Boolean(part && part.trim().length > 0));

  return clean.length > 0 ? clean.join(' · ') : null;
}

type AttachmentRow = PostRow['attachments'][number];

/**
 * Biriktirmani tugma uchun ko'rinishga o'giradi.
 *
 * ── Nima uchun "ochiq" ALOHIDA hisoblanadi ───────────────────────────
 * Nishon yopilgan bo'lishi mumkin: mahsulot sotuvdan olingan, do'kon
 * yopilgan, ish e'loni muddati tugagan, restoran vaqtincha
 * ishlamayapti. Har holatda tugma bosilsa, tomoshabin bo'sh
 * sahifaga tushardi.
 *
 * Video esa o'z joyida qoladi: u tugmasiz ham qiziqarli bo'lishi
 * mumkin.
 *
 * ── Nima uchun `null` qaytishi MUMKIN ────────────────────────────────
 * Baza shartlari turga mos ustun to'ldirilishini kafolatlaydi, lekin
 * TypeScript buni bila olmaydi: u uchun beshala ustun ham
 * `null` bo'lishi mumkin.
 *
 * Bu yerda tanlov ikkita edi: xato tashlash yoki qatorni tashlab
 * yuborish. Ikkinchisi tanlandi — bitta buzuq biriktirma tufayli
 * BUTUN lentaning yiqilishi eng yomon natija bo'lardi.
 */
function toAttachmentView(row: AttachmentRow, clickCount: number): PostAttachmentView | null {
  const base = { id: row.id, kind: row.kind, clickCount };

  if (row.kind === 'PRODUCT' && row.product) {
    const { product } = row;

    return {
      ...base,
      name: product.name,
      slug: product.slug,
      subtitle: joinParts(priceLine(product.price), product.shop.name),
      isAvailable: product.isActive && product.shop.isActive && product.stock > 0,
    };
  }

  if (row.kind === 'MENU_ITEM' && row.menuItem) {
    const { menuItem } = row;

    return {
      ...base,
      name: menuItem.name,
      // Taomning o'z sahifasi yo'q — havola restoranga olib boradi.
      slug: menuItem.restaurant.slug,
      subtitle: joinParts(priceLine(menuItem.price), menuItem.restaurant.name),
      isAvailable: menuItem.isAvailable && menuItem.restaurant.isActive,
    };
  }

  if (row.kind === 'RESTAURANT' && row.restaurant) {
    const { restaurant } = row;

    return {
      ...base,
      name: restaurant.name,
      slug: restaurant.slug,
      subtitle: restaurant.cuisine,
      isAvailable: restaurant.isActive,
    };
  }

  if (row.kind === 'VACANCY' && row.vacancy) {
    const { vacancy } = row;

    /*
      Maosh KO'RSATILMAGAN bo'lishi mumkin.

      "0 so'm" deb yozish yolg'on bo'lardi — shuning uchun bunday
      holda faqat shahar va kompaniya qoladi.
    */
    const salary =
      vacancy.salaryMin !== null || vacancy.salaryMax !== null
        ? [vacancy.salaryMin, vacancy.salaryMax]
            .filter((value): value is bigint => value !== null)
            .map(priceLine)
            .join(' — ')
        : null;

    return {
      ...base,
      name: vacancy.title,
      slug: vacancy.slug,
      subtitle: joinParts(salary, vacancy.company.name, vacancy.city),
      isAvailable: vacancy.isActive,
    };
  }

  if (row.kind === 'HOTEL' && row.hotel) {
    const { hotel } = row;

    return {
      ...base,
      name: hotel.name,
      slug: hotel.slug,
      subtitle: hotel.city,
      isAvailable: hotel.isActive,
    };
  }

  return null;
}

export function toPostView(row: PostRow, viewerId: string): PostView {
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
    videoStartSeconds: row.deletedAt ? null : row.videoStartSeconds,
    videoEndSeconds: row.deletedAt ? null : row.videoEndSeconds,
    /*
      Chaqiruv o'chirilgan postda YUBORILMAYDI.

      Post o'chirilgach uning matni ham, rasmi ham yuborilmaydi —
      muallifning telefon raqami ham xuddi shunday shaxsiy
      ma'lumot.
    */
    cta:
      row.deletedAt === null && row.ctaKind !== null
        ? {
            kind: row.ctaKind,
            value: row.ctaValue,
            clickCount: isMine ? row.ctaClickCount : 0,
          }
        : null,
    attachments: row.deletedAt
      ? []
      : /**
         * Bosishlar soni FAQAT postning egasiga yuboriladi.
         *
         * Begonaga `0` ketadi — ya'ni raqam brauzerga umuman
         * yetib bormaydi. Uni faqat ekranda yashirish yetarli
         * emasdi: so'rov javobini ko'rish oson.
         */
        row.attachments
          .map((link) => toAttachmentView(link, isMine ? link.clickCount : 0))
          .filter((item): item is PostAttachmentView => item !== null),
    viewCount: row.viewCount,
    category: row.deletedAt ? null : row.category,
    /**
     * Joylashuv o'chirilgan postda YUBORILMAYDI.
     *
     * Post o'chirilgach uning matni ham, rasmi ham yuborilmaydi —
     * joylashuv ham xuddi shunday shaxsiy ma'lumot.
     */
    place:
      row.deletedAt === null && row.placeName !== null && row.latitude !== null && row.longitude !== null
        ? { name: row.placeName, latitude: row.latitude, longitude: row.longitude }
        : null,
    hashtags: row.deletedAt ? [] : row.hashtags.map((link) => link.hashtag.tag),
    author: toAuthorView(row.author),
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    shareCount: row.shareCount,
    isLiked: row.likes.length > 0,
    isSaved: row.saves.length > 0,
    isPinned: row.deletedAt === null && row.pinnedAt !== null,
    /*
      O'chirilgan postda nishon ham YO'Q.

      O'chirilgan post ro'yxatda "post o'chirilgan" yozuvi bo'lib
      turadi: uning yonidagi "Reklama" nishoni faqat chalkashtirardi.
    */
    isSponsored: row.deletedAt === null && row.isSponsored,
    isMine,
    isDeleted: row.deletedAt !== null,
  };
}

/**
 * O'chirilgan va to'xtatilgan hisoblarning postlari ko'rinmaydi.
 *
 * Hisob to'xtatilganda uning postlarini alohida o'chirish kerak
 * bo'lardi va bittasi albatta qolib ketardi. Bu shart esa bir joyda
 * turadi va hech qachon unutilmaydi.
 */
export const LIVE_AUTHOR: Prisma.PostWhereInput = {
  deletedAt: null,
  author: { deletedAt: null, status: { not: 'SUSPENDED' } },
};

/**
 * "Qiziq emas" bosilgan postlar chiqarib tashlanadi.
 *
 * ── Nima uchun QAT'IY filtr, oddiy pasaytirish emas ───────────────────
 * Tavsiya bahosini pasaytirish yetarli emasdi: pastga tushgan post
 * ertaga yana yuqoriga chiqishi mumkin (boshqa postlar eskiradi).
 * Odam esa "yashirdim" degan tugmani bosgan — va'da aniq berilgan.
 *
 * ── Nima uchun bu shart PROFILDA qo'llanmaydi ─────────────────────────
 * Profilga kirgan odam AYNAN o'sha muallifning postlarini so'ragan.
 * U yerda ham yashirsak, "postim yo'qolib qoldimi?" degan chalkashlik
 * paydo bo'lardi. Shart faqat LENTAGA tegishli: lenta — taklif,
 * profil — aniq so'rov.
 */
export function notHiddenBy(viewerId: string): Prisma.PostWhereInput {
  return { hiddenBy: { none: { userId: viewerId } } };
}

