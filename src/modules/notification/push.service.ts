import webpush from 'web-push';

import { Prisma } from '@/generated/prisma/client';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import type { PushPayload, PushSubscriptionInput } from '@/modules/notification/push.types';

/**
 * Brauzerga "turtki" (push) yuborish.
 *
 * ── Push QANDAY ishlaydi ──────────────────────────────────────────────
 * Biz to'g'ridan-to'g'ri telefonga xabar yubora olmaymiz. Xabar
 * brauzer ishlab chiqaruvchisining serveri orqali o'tadi:
 *
 *   Navix serveri → Google/Mozilla push xizmati → telefondagi brauzer
 *
 * Brauzer obuna bo'lganda bizga o'z "manzilini" (endpoint) va ikkita
 * shifrlash kalitini beradi. Xabar aynan o'sha kalitlar bilan
 * shifrlanadi — ya'ni oraliqdagi push xizmati uning MAZMUNINI o'qiy
 * olmaydi.
 *
 * ── Nima uchun xatolik yutiladi ───────────────────────────────────────
 * Push — qo'shimcha qulaylik. U yetkazilmasa ham xabar ilova ichida
 * baribir turadi. Shuning uchun bu yerdagi hech qanday xato chaqiruvchi
 * amalni (xabar yuborish, qo'ng'iroq) to'xtatmasligi kerak.
 */

/**
 * Push xizmatiga so'rovning eng uzun muddati (millisekundlarda).
 *
 * ── Nima uchun ZARUR ──────────────────────────────────────────────────
 * Muddatsiz so'rov javob kelmasa CHEKSIZ kutadi. Serversiz muhitda
 * funksiyaning umri cheklangan: osilib qolgan push butun vaqtni yeb,
 * asosiy amalga (xabar yuborish, qo'ng'iroq) joy qoldirmasdi.
 *
 * Sinovda aynan shunday holat uchradi: tarmoq push xizmatiga
 * chiqarmaganda so'rov daqiqalab osilib turdi.
 */
const PUSH_TIMEOUT_MS = 8_000;

/** Push sozlanganmi. Sozlanmagan bo'lsa hamma narsa jimgina o'tkazib yuboriladi. */
export function isPushConfigured(): boolean {
  const env = serverEnv();

  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

/** Brauzerga beriladigan ochiq kalit. Sozlanmagan bo'lsa `null`. */
export function pushPublicKey(): string | null {
  return serverEnv().VAPID_PUBLIC_KEY ?? null;
}

/**
 * Kalitlarni kutubxonaga BIR MARTA beradi.
 *
 * `web-push` kalitlarni global holatda saqlaydi. Har yuborishda qayta
 * o'rnatish keraksiz ish, shuning uchun bayroq bilan cheklanadi.
 */
let isConfigured = false;

function configure(): void {
  if (isConfigured) return;

  const env = serverEnv();

  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

  isConfigured = true;
}

/**
 * Obunani saqlaydi (yoki mavjudini yangilaydi).
 *
 * Bir xil brauzer qayta obuna bo'lishi odatiy hol — masalan ruxsat
 * qaytadan berilganda. Shuning uchun `upsert`: ikkinchi nusxa paydo
 * bo'lmaydi va odam bitta xabarni ikki marta olmaydi.
 */
export async function saveSubscription(userId: string, input: PushSubscriptionInput): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      deviceLabel: input.deviceLabel,
    },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      deviceLabel: input.deviceLabel,
    },
  });

  logger.info({ userId }, 'Push obunasi saqlandi');
}

/** Obunani o'chiradi (odam bildirishnomalarni o'chirganda). */
export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Foydalanuvchining shu qurilmadagi obunasi bormi. */
export async function hasSubscription(userId: string, endpoint: string): Promise<boolean> {
  const row = await prisma.pushSubscription.findFirst({
    where: { userId, endpoint },
    select: { id: true },
  });

  return row !== null;
}

/**
 * Foydalanuvchining BARCHA qurilmalariga xabar yuboradi.
 *
 * ── Nima uchun barchasiga ─────────────────────────────────────────────
 * Odam telefonini qo'yib, kompyuterga o'tishi mumkin. Qaysi qurilma
 * qo'lida ekanini bilmaymiz, shuning uchun hammasiga yuboriladi —
 * brauzer esa bir xil `tag` li xabarni almashtirib turadi, ya'ni
 * ekranda nusxalar to'planib qolmaydi.
 */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) return;

  try {
    configure();

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) return;

    const body = JSON.stringify(payload);

    /**
     * Barchasiga BIR VAQTDA yuboriladi.
     *
     * Ketma-ket yuborilsa, uchta qurilmali odamda xabar sekin
     * yetardi — qo'ng'iroqda esa har soniya muhim.
     */
    const results = await Promise.allSettled(
      subscriptions.map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
          { TTL: payload.ttlSeconds ?? 60, timeout: PUSH_TIMEOUT_MS },
        ),
      ),
    );

    const expired: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return;

      const statusCode = (result.reason as { statusCode?: number } | undefined)?.statusCode;

      /**
       * 404 va 410 — obuna endi mavjud emas.
       *
       * Odam ilovani o'chirgan yoki brauzer ma'lumotlarini tozalagan.
       * Bunday yozuvlar bazada qolsa, har safar bekorga urinib
       * ko'rilardi. Shuning uchun ular darhol o'chiriladi.
       */
      if (statusCode === 404 || statusCode === 410) {
        expired.push(subscriptions[index].id);
        return;
      }

      logger.warn({ err: result.reason, userId, statusCode }, "Push yuborib bo'lmadi");
    });

    if (expired.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
      logger.info({ userId, count: expired.length }, "Eskirgan push obunalari o'chirildi");
    }

    const delivered = results.filter((result) => result.status === 'fulfilled').length;

    if (delivered > 0) {
      await prisma.pushSubscription.updateMany({
        where: { userId, id: { notIn: expired } },
        data: { lastUsedAt: new Date() },
      });
    }
  } catch (error) {
    // Push — qo'shimcha qulaylik. Uning xatosi asosiy amalni to'xtatmaydi.
    logger.error({ err: error, userId }, 'Push yuborishda kutilmagan xato');
  }
}

/** Qurilmalar ro'yxati — sozlamalar sahifasi uchun. */
export async function listSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, deviceLabel: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export type PushSubscriptionRow = Prisma.PushSubscriptionGetPayload<{
  select: { id: true; deviceLabel: true; createdAt: true; lastUsedAt: true };
}>;
