import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * Ulashilgan havolaning OLDINDAN KO'RINISHI.
 *
 * ── Nima uchun alohida xizmat ─────────────────────────────────────────
 * Bu ma'lumot TOKENSIZ o'qiladi. Telegram, WhatsApp va boshqa ilovalar
 * havolani o'z serverlari orqali ochadi — ularda hech qanday sessiya
 * yo'q va hech qachon bo'lmaydi ham.
 *
 * Oddiy `getPost` esa ko'ruvchi ID sini talab qiladi (yoqtirish,
 * saqlash, bloklash holatini hisoblaydi). Uni bu yerda ishlatib
 * bo'lmasdi.
 *
 * ── Nima uchun MA'LUMOT KAM ───────────────────────────────────────────
 * Faqat oldindan ko'rinish uchun kerakli minimum qaytariladi: matn
 * boshi, muallif nomi va video-yo'qligi.
 *
 * Yoqtirishlar soni, izohlar, biriktirmalar — bularning hech biri
 * ochiq havolaga chiqmasligi kerak. Ular ilovaning ichida, kirgan
 * odamga ko'rsatiladi.
 */

export interface SharePreview {
  /** Ulashish kartochkasidagi sarlavha. */
  title: string;
  /** Kartochka ostidagi matn. */
  description: string;
  /** Muallifning ko'rinadigan nomi. */
  authorName: string;
  /** Post videolimi — kartochkada belgi ko'rsatiladi. */
  isVideo: boolean;
}

/** Kartochkadagi matn uzunligi — undan uzog'i baribir kesiladi. */
export const PREVIEW_BODY_LENGTH = 160;

/**
 * ID SHAKLI to'g'rimi.
 *
 * ── Nima uchun oldindan tekshiriladi ──────────────────────────────────
 * Bu manzil OCHIQ: unga istalgan qiymat kelishi mumkin. Buzuq ID
 * bilan Prisma xato tashlardi va u har ulashilgan havolada jurnalga
 * yozilardi — jurnal esa foydasiz xatolarga to'lib ketardi.
 */
export function isPreviewId(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

/**
 * Kartochkadagi matnni yasaydi.
 *
 * ── Nima uchun SOF funksiya ───────────────────────────────────────────
 * Bu mantiqda uchta shart bor: bo'sh matn, qisqa matn va uzun matn.
 * Uni bazaga ulanmasdan sinash mumkin bo'lishi kerak — aks holda
 * "uzun matn qayerda kesiladi?" degan savolga faqat qo'lda
 * tekshirish orqali javob berilardi.
 */
export function previewDescription(body: string, isVideo: boolean): string {
  const clean = body.replace(/\s+/g, ' ').trim();

  if (clean.length === 0) return isVideo ? 'Navixda video' : 'Navixdagi post';
  if (clean.length <= PREVIEW_BODY_LENGTH) return clean;

  return `${clean.slice(0, PREVIEW_BODY_LENGTH - 1).trimEnd()}…`;
}

/**
 * Post haqida OCHIQ ma'lumot.
 *
 * `null` — post yo'q, o'chirilgan yoki muallifi bloklangan. Bunday
 * holatda sahifa umumiy Navix kartochkasini ko'rsatadi: "post
 * topilmadi" degan kartochka havolani ochishga undamasdi.
 */
export async function loadSharePreview(postId: string): Promise<SharePreview | null> {
  if (!isPreviewId(postId)) return null;

  try {
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
        author: { deletedAt: null, status: { not: 'SUSPENDED' } },
      },
      select: {
        body: true,
        videoUrl: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
            profile: { select: { username: true } },
          },
        },
      },
    });

    if (!post) return null;

    const fullName = [post.author.firstName, post.author.lastName].filter(Boolean).join(' ');
    const authorName = fullName || post.author.profile?.username || 'Navix';

    return {
      title: authorName,
      description: previewDescription(post.body, post.videoUrl !== null),
      authorName,
      isVideo: post.videoUrl !== null,
    };
  } catch (error) {
    /*
      Xato YUTILADI.

      Bu funksiya sahifa sarlavhasi uchun chaqiriladi. Baza bir
      lahzaga javob bermasa, butun sahifa 500 xatosi bilan
      yiqilardi — holbuki postning O'ZI brauzerda alohida
      so'rov bilan yuklanadi va u ishlashda davom etardi.
    */
    logger.warn({ err: error, postId }, "Ulashish ko'rinishini o'qib bo'lmadi");

    return null;
  }
}
