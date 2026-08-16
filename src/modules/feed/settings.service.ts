import { prisma } from '@/lib/prisma';
import { invalidateRecommendations } from '@/modules/feed/recommend.cache';
import type { PostCategoryName } from '@/modules/feed/feed.types';
import type { FeedSettingsInput } from '@/modules/feed/settings.schemas';
import {
  DEFAULT_FEED_SETTINGS,
  type AudienceScopeName,
  type FeedSettingsView,
  type NotifyKey,
} from '@/modules/feed/settings.types';

/**
 * Feed sozlamalari.
 *
 * ── Modulning ASOSIY qoidasi: sozlama HAQIQATAN ishlashi kerak ────────
 * Har bir tugmaning lentada ko'rinadigan natijasi bor:
 *   · qiziqishlar  → o'sha bo'limlar lentada yuqoriroq;
 *   · qizig'i emas → o'sha bo'limlar lentaga umuman tushmaydi;
 *   · hassos filtr → shikoyat qilingan postlar yashiriladi;
 *   · maxfiylik    → izoh va obuna ruxsatlari;
 *   · bildirishnoma → xabar umuman yuborilmaydi.
 *
 * Ishlamaydigan tugma qo'yish — foydalanuvchini aldash. Shuning uchun
 * "Jonli efir" bildirishnomasi ochiq holda O'CHIRILGAN: efirning o'zi
 * hali yo'q va buni ekran halol aytadi.
 */

const SELECT = {
  interests: true,
  notInterested: true,
  sensitiveFilter: true,
  profileVisibility: true,
  commentScope: true,
  followScope: true,
  notifyLike: true,
  notifyComment: true,
  notifyFollow: true,
  notifyMention: true,
  notifyLive: true,
  feedOnboardedAt: true,
  recommendationsResetAt: true,
} as const;

type SettingsRow = {
  interests: PostCategoryName[];
  notInterested: PostCategoryName[];
  sensitiveFilter: boolean;
  profileVisibility: AudienceScopeName;
  commentScope: AudienceScopeName;
  followScope: AudienceScopeName;
  notifyLike: boolean;
  notifyComment: boolean;
  notifyFollow: boolean;
  notifyMention: boolean;
  notifyLive: boolean;
  feedOnboardedAt: Date | null;
  recommendationsResetAt: Date | null;
};

function toView(row: SettingsRow): FeedSettingsView {
  return {
    interests: row.interests,
    notInterested: row.notInterested,
    sensitiveFilter: row.sensitiveFilter,
    profileVisibility: row.profileVisibility,
    commentScope: row.commentScope,
    followScope: row.followScope,
    notifyLike: row.notifyLike,
    notifyComment: row.notifyComment,
    notifyFollow: row.notifyFollow,
    notifyMention: row.notifyMention,
    notifyLive: row.notifyLive,
    feedOnboardedAt: row.feedOnboardedAt?.toISOString() ?? null,
    recommendationsResetAt: row.recommendationsResetAt?.toISOString() ?? null,
  };
}

/**
 * Sozlamalarni o'qiydi.
 *
 * Yozuv bo'lmasa — standart holat qaytadi. Yangi odam uchun bo'sh
 * qator yaratish shart emas: millionlab foydalanuvchida bu millionlab
 * keraksiz qator degani.
 */
export async function getFeedSettings(userId: string): Promise<FeedSettingsView> {
  const row = await prisma.feedSettings.findUnique({ where: { userId }, select: SELECT });

  return row ? toView(row) : { ...DEFAULT_FEED_SETTINGS };
}

/**
 * Sozlamalarni yangilaydi.
 *
 * ── Nima uchun `upsert` ───────────────────────────────────────────────
 * Yozuv hali bo'lmasligi mumkin (yuqoridagi izohga qarang). Avval
 * o'qib, keyin yozish ham mumkin edi, lekin ikki so'rov orasida
 * boshqa qurilma yozib ulgursa, ikkita qator paydo bo'lardi.
 * `upsert` buni bitta amalda hal qiladi.
 */
export async function updateFeedSettings(
  userId: string,
  input: FeedSettingsInput,
): Promise<FeedSettingsView> {
  const current = await getFeedSettings(userId);

  /**
   * "Yoqadi" va "yoqmaydi" KESISHMAYDI.
   *
   * ── Nima uchun bu shu yerda ─────────────────────────────────────────
   * Ekranda ikkita alohida ro'yxat bor va odam bir bo'limni ikkalasiga
   * ham qo'shishi mumkin. U holda lenta o'zini qanday tutishi
   * noaniq bo'lardi: ko'rsatsinmi yoki yashirsinmi?
   *
   * Qoida oddiy: OXIRGI tanlov ustun. Odam "Restoranlar qizig'i emas"
   * desa, u qiziqishlardan olib tashlanadi.
   */
  const interests = input.interests ?? current.interests;
  const notInterested = input.notInterested ?? current.notInterested;

  const cleaned =
    input.notInterested !== undefined
      ? { interests: interests.filter((item) => !notInterested.includes(item)), notInterested }
      : { interests, notInterested: notInterested.filter((item) => !interests.includes(item)) };

  const data = {
    ...cleaned,
    sensitiveFilter: input.sensitiveFilter ?? current.sensitiveFilter,
    profileVisibility: input.profileVisibility ?? current.profileVisibility,
    commentScope: input.commentScope ?? current.commentScope,
    followScope: input.followScope ?? current.followScope,
    notifyLike: input.notifyLike ?? current.notifyLike,
    notifyComment: input.notifyComment ?? current.notifyComment,
    notifyFollow: input.notifyFollow ?? current.notifyFollow,
    notifyMention: input.notifyMention ?? current.notifyMention,
    notifyLive: input.notifyLive ?? current.notifyLive,
  };

  const row = await prisma.feedSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: SELECT,
  });

  /**
   * Tavsiya keshi BEKOR qilinadi.
   *
   * Aks holda odam "Restoranlar qizig'i emas" deb belgilab, lentaga
   * qaytganda o'sha postlarni yana ko'rardi va sozlama ishlamayapti
   * deb o'ylardi.
   */
  await invalidateRecommendations(userId);

  return toView(row);
}

/**
 * Tavsiyalarni noldan boshlaydi.
 *
 * ── Nima uchun MAXFIYLIK sozlamalari tegilmaydi ───────────────────────
 * "Tiklash" — tavsiyalar haqida. Odam "menga noto'g'ri narsa
 * ko'rsatilyapti" degani uchun bosadi, "profilimni hammaga ochib
 * yubor" degani uchun emas.
 *
 * Maxfiylik va bildirishnoma sozlamalari o'z joyida qoladi: ularni
 * bilmasdan qaytarib yuborish jiddiy zarar bo'lardi.
 */
export async function resetRecommendations(userId: string): Promise<FeedSettingsView> {
  const data = {
    interests: [],
    notInterested: [],
    recommendationsResetAt: new Date(),
  };

  const row = await prisma.feedSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: SELECT,
  });

  /**
   * Tavsiya keshi BEKOR qilinadi.
   *
   * Aks holda odam "Restoranlar qizig'i emas" deb belgilab, lentaga
   * qaytganda o'sha postlarni yana ko'rardi va sozlama ishlamayapti
   * deb o'ylardi.
   */
  await invalidateRecommendations(userId);

  return toView(row);
}

/**
 * Feed bilan tanishtirishni yakunlaydi.
 *
 * ── Nima uchun ALOHIDA funksiya ───────────────────────────────────────
 * Tanishtiruv oxirida ikki narsa birga bajarilishi kerak: tanlangan
 * qiziqishlar saqlanadi VA "tanishtirildi" belgisi qo'yiladi.
 *
 * Ikkita alohida so'rov qilsak, ular orasida aloqa uzilishi mumkin
 * edi: qiziqish saqlanib, belgi qo'yilmasdi — va odam ertaga yana
 * o'sha ekranni ko'rardi.
 *
 * ── Nima uchun qiziqish BO'SH bo'lishi mumkin ─────────────────────────
 * Odam "o'tkazib yuborish" ni tanlashi mumkin va bu to'liq haqiqiy
 * javob: "menga hammasi qiziq". Uni majburlash — birinchi
 * tanishuvdayoq to'siq qo'yish bo'lardi.
 */
export async function completeFeedOnboarding(
  userId: string,
  interests: PostCategoryName[],
): Promise<FeedSettingsView> {
  const data = { interests, feedOnboardedAt: new Date() };

  const row = await prisma.feedSettings.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
    select: SELECT,
  });

  /**
   * Tavsiya keshi BEKOR qilinadi.
   *
   * Aks holda odam "Restoranlar qizig'i emas" deb belgilab, lentaga
   * qaytganda o'sha postlarni yana ko'rardi va sozlama ishlamayapti
   * deb o'ylardi.
   */
  await invalidateRecommendations(userId);

  return toView(row);
}

/**
 * Bildirishnoma yuborilsinmi.
 *
 * ── Nima uchun xato bo'lganda RUXSAT beriladi ─────────────────────────
 * Baza javob bermasa, tanlov ikki xil: hech narsa yubormaslik yoki
 * hammasini yuborish. Birinchisida odam muhim xabarni (masalan
 * buyurtmasiga izoh) umuman olmasdi va buni bilmasdi ham.
 *
 * Ikkinchisida esa ortiqcha xabar keladi — bu bezovta qiladi, lekin
 * hech narsani yo'qotmaydi.
 */
export async function isNotifyEnabled(userId: string, key: NotifyKey): Promise<boolean> {
  try {
    const row = await prisma.feedSettings.findUnique({
      where: { userId },
      select: { [key]: true } as Record<NotifyKey, true>,
    });

    if (!row) return DEFAULT_FEED_SETTINGS[key];

    return (row as unknown as Record<NotifyKey, boolean>)[key];
  } catch {
    return true;
  }
}

/**
 * Amalga ruxsat bormi (izoh yozish, obuna bo'lish, profil ko'rish).
 *
 * @param ownerId  Sozlama EGASI — kimning qoidasi tekshirilyapti.
 * @param actorId  Amalni bajarmoqchi bo'lgan odam.
 */
export async function isAllowedBy(
  ownerId: string,
  actorId: string,
  field: 'profileVisibility' | 'commentScope' | 'followScope',
): Promise<boolean> {
  // O'z postiga izoh yozish va o'z profilini ko'rish har doim mumkin.
  if (ownerId === actorId) return true;

  const row = await prisma.feedSettings.findUnique({
    where: { userId: ownerId },
    select: { [field]: true } as Record<typeof field, true>,
  });

  const scope: AudienceScopeName =
    (row as unknown as Record<string, AudienceScopeName> | null)?.[field] ?? DEFAULT_FEED_SETTINGS[field];

  if (scope === 'EVERYONE') return true;
  if (scope === 'NOBODY') return false;

  /**
   * `FOLLOWERS` — EGAGA obuna bo'lganlar.
   *
   * Ya'ni "meni kuzatadiganlar". Teskarisi (men kuzatadiganlar) emas:
   * odam o'z auditoriyasiga ruxsat beradi, o'zi o'qiydiganlarga emas.
   */
  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: actorId, followingId: ownerId } },
    select: { id: true },
  });

  return follow !== null;
}
