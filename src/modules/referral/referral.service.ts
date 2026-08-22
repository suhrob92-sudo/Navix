import { Prisma } from '@/generated/prisma/client';
import { NotFoundError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import {
  REFERRAL_ALPHABET,
  REFERRAL_CODE_ATTEMPTS,
  REFERRAL_CODE_LENGTH,
  REFERRAL_PAGE_SIZE,
  isReferralCode,
  referralLink,
} from '@/config/referral';
import { siteConfig } from '@/config/site';
import type {
  InvitedPersonView,
  ReferralInviterView,
  ReferralListResponse,
  ReferralOverview,
} from '@/modules/referral/referral.types';

/**
 * Taklif tizimi.
 *
 * ── Nima uchun MUKOFOT yo'q ───────────────────────────────────────────
 * Bu yerda faqat HISOB yuritiladi: kim kimni taklif qilgani va
 * nechta odam kelgani. Sababi `config/referral.ts` da batafsil.
 *
 * Bu qaror kodning shaklini ham belgilaydi: pul harakati yo'q,
 * ya'ni tranzaksiya, idempotentlik va hisob-kitob ham kerak emas.
 */

/**
 * Ismni ekran uchun tayyorlaydi.
 *
 * Ism yozilmagan bo'lsa foydalanuvchi nomi ishlatiladi: ro'yxatda
 * bo'sh qator turishi mumkin emas.
 */
function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  profile: { username: string } | null;
}): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();

  return full || (user.profile?.username ?? 'Foydalanuvchi');
}

/**
 * Tasodifiy kod yasaydi.
 *
 * ── Nima uchun `crypto`, `Math.random` emas ───────────────────────────
 * `Math.random` taxmin qilinadigan ketma-ketlik beradi. Bu kod
 * havolada ochiq yuradi va uni taxmin qilish katta zarar
 * keltirmaydi — lekin taxmin qilinadigan kod bilan boshqa odamning
 * kodini topib, uning statistikasini buzish mumkin bo'lardi.
 *
 * `crypto` esa har doim mavjud (Node va brauzerda) va tezligi
 * bu yerda ahamiyatsiz.
 */
function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REFERRAL_CODE_LENGTH));

  let code = '';

  for (const byte of bytes) {
    /*
      Qoldiq bo'yicha tanlash biroz noteng taqsimot beradi
      (alifbo 27 ta, bayt 256 ta). Bu yerda muhim emas: kod
      sir emas, u faqat noyob bo'lishi kerak.
    */
    code += REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length];
  }

  return code;
}

/**
 * Foydalanuvchining kodini qaytaradi, kerak bo'lsa yasaydi.
 *
 * ── Nima uchun DANGASA yasaladi ───────────────────────────────────────
 * Hammaga oldindan kod yasash mumkin edi, lekin ko'p foydalanuvchi
 * hech qachon hech kimni taklif qilmaydi. Ularga kod yasash
 * bekorga joy egallardi va mavjud hisoblarni ko'chirish
 * (migratsiya) ham kerak bo'lardi.
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (!existing) throw new NotFoundError('Foydalanuvchi');
  if (existing.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < REFERRAL_CODE_ATTEMPTS; attempt += 1) {
    const code = generateCode();

    try {
      await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });

      return code;
    } catch (error) {
      /*
        `P2002` — noyoblik sharti buzildi, ya'ni kod band.

        Bu deyarli bo'lmaydigan holat (8 milliard variant), lekin
        u yuz bersa yangisini yasab qayta uriniladi. Boshqa xato
        esa yashirilmaydi.
      */
      const isTaken =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

      if (!isTaken) throw error;

      logger.warn({ userId, attempt }, 'Taklif kodi band chiqdi, qayta urinilmoqda');
    }
  }

  throw new Error("Taklif kodini yasab bo'lmadi");
}

/**
 * Kod bo'yicha taklif qilgan odamni topadi.
 *
 * ── Nima uchun `null`, xato emas ──────────────────────────────────────
 * Bu funksiya ikki joyda chaqiriladi: taklif sahifasida va
 * ro'yxatdan o'tishda. Ikkinchisida noto'g'ri kod ro'yxatdan
 * o'tishni TO'XTATMASLIGI kerak — odam eski yoki buzilgan havola
 * bilan kelgan bo'lishi mumkin va u aybdor emas.
 */
export async function findByReferralCode(code: string): Promise<ReferralInviterView | null> {
  if (!isReferralCode(code)) return null;

  const user = await prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      firstName: true,
      lastName: true,
      avatarUrl: true,
      status: true,
      deletedAt: true,
      profile: { select: { username: true } },
    },
  });

  /*
    O'CHIRILGAN va TO'XTATILGAN hisoblarning havolasi ishlamaydi.

    Aks holda to'xtatilgan odam havola tarqatib, ilovaga odam
    yig'ishda davom etardi.
  */
  if (!user || user.deletedAt || user.status !== 'ACTIVE') return null;

  return {
    name: displayName(user),
    avatarUrl: user.avatarUrl,
    username: user.profile?.username ?? '',
  };
}

/**
 * Ro'yxatdan o'tayotgan odamga taklif qilganni bog'laydi.
 *
 * ── Nima uchun bu ALOHIDA funksiya ────────────────────────────────────
 * Uni `auth.service.ts` ichiga yozish mumkin edi, lekin u yerda
 * allaqachon parol, OTP va rol mantiqlari bor. Taklif esa butunlay
 * boshqa masala va u ertaga o'zgarishi mumkin (masalan mukofot
 * qo'shilsa).
 *
 * ── Nima uchun natija QAYTARILMAYDI ───────────────────────────────────
 * Chaqiruvchi uchun farqi yo'q: taklif bog'lansa ham, bog'lanmasa
 * ham ro'yxatdan o'tish davom etadi.
 */
export async function attachReferrer(userId: string, code: string | undefined): Promise<void> {
  if (!code) return;

  const inviter = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!inviter || inviter.deletedAt || inviter.status !== 'ACTIVE') return;

  /*
    O'ZINI o'zi taklif qila olmaydi.

    Bu holat haqiqatda yuz beradi: tasdiqlanmagan hisob bilan
    qaytib kelgan odam o'z havolasini ochib qo'yishi mumkin.
  */
  if (inviter.id === userId) return;

  /*
    Bog'lanish BIR MARTA yoziladi.

    `updateMany` sharti bilan: `referredById` hali bo'sh bo'lsagina
    yoziladi. Aks holda tasdiqlanmagan hisob bilan qayta-qayta
    ro'yxatdan o'tib, har safar boshqa odamni "taklif qilgan"
    qilib ko'rsatish mumkin bo'lardi.
  */
  const changed = await prisma.user.updateMany({
    where: { id: userId, referredById: null },
    data: { referredById: inviter.id, referredAt: new Date() },
  });

  if (changed.count > 0) {
    logger.info({ userId, inviterId: inviter.id }, 'Taklif bog\'landi');
  }
}

/** Mening taklif sahifam uchun umumiy ma'lumot. */
export async function getReferralOverview(userId: string): Promise<ReferralOverview> {
  const code = await ensureReferralCode(userId);

  const [joinedCount, pendingCount, me] = await Promise.all([
    /*
      Faqat TASDIQLANGAN hisoblar sanaladi.

      Telefon kodini kiritmagan odam hali haqiqiy foydalanuvchi
      emas. Uni sanasak, son chiroyli bo'lardi-yu, lekin yolg'on
      bo'lardi.
    */
    prisma.user.count({ where: { referredById: userId, status: 'ACTIVE', deletedAt: null } }),
    prisma.user.count({
      where: { referredById: userId, status: 'PENDING_VERIFICATION', deletedAt: null },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredBy: {
          select: {
            firstName: true,
            lastName: true,
            profile: { select: { username: true } },
          },
        },
      },
    }),
  ]);

  return {
    code,
    link: referralLink(siteConfig.url, code),
    joinedCount,
    pendingCount,
    invitedBy: me?.referredBy
      ? {
          name: displayName(me.referredBy),
          username: me.referredBy.profile?.username ?? '',
        }
      : null,
  };
}

/**
 * Men taklif qilgan odamlar — yangisidan eskisiga.
 *
 * ── Nima uchun TELEFON RAQAMI ko'rsatilmaydi ──────────────────────────
 * Taklif qilgan odam do'stining raqamini bilishi mumkin, lekin
 * ro'yxat orqali uni OLISH boshqa masala: havola begona odamga
 * ham yuborilishi mumkin va u orqali raqam to'plash mumkin
 * bo'lardi.
 *
 * Shuning uchun faqat ism, rasm va sana ko'rsatiladi.
 */
export async function listInvited(userId: string, page = 1): Promise<ReferralListResponse> {
  const rows = await prisma.user.findMany({
    where: { referredById: userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * REFERRAL_PAGE_SIZE,
    // Bittasi ortiqcha — "yana bormi" degan savolga javob.
    take: REFERRAL_PAGE_SIZE + 1,
    select: {
      firstName: true,
      lastName: true,
      avatarUrl: true,
      status: true,
      createdAt: true,
      profile: { select: { username: true } },
    },
  });

  const hasMore = rows.length > REFERRAL_PAGE_SIZE;
  const visible = hasMore ? rows.slice(0, REFERRAL_PAGE_SIZE) : rows;

  const people: InvitedPersonView[] = visible.map((row) => ({
    name: displayName(row),
    avatarUrl: row.avatarUrl,
    username: row.profile?.username ?? '',
    joinedAt: row.createdAt.toISOString(),
    isActive: row.status === 'ACTIVE',
  }));

  return { people, hasMore };
}
