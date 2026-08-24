import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import {
  REMINDER_AFTER_HOURS,
  REMINDER_BATCH,
  REMINDER_BEFORE_HOURS,
  REMINDER_COOLDOWN_HOURS,
  reminderSubject,
} from '@/config/cart';
import { notifyUser } from '@/modules/notification/notification.service';

/**
 * Savat eslatmasi.
 *
 * ── Nima uchun bu bosqichning eng qimmatli qismi ──────────────────────
 * Savatga mahsulot solgan odam sotib olishga eng yaqin turgan odam:
 * u tanladi, narxni ko'rdi, qaror qildi va biror sabab bilan
 * to'xtadi — telefon jiringladi, interneti uzildi, kechqurun
 * o'ylab ko'rmoqchi bo'ldi.
 *
 * Unga oddiy eslatma yuborish yangi xaridor topishdan ancha arzon.
 *
 * ── Nima uchun JADVAL (cron) ishlatilmaydi ────────────────────────────
 * Ilova serverssiz muhitda ishlaydi: doim yonib turgan jarayon yo'q,
 * ya'ni "har soatda bajar" degan buyruqni qo'yadigan joy yo'q.
 *
 * Xuddi hikoyalarni tozalash kabi (`story.service.ts`), bu ish ham
 * odamlar ilovadan foydalanganda o'zi ishlaydi. Redisdagi qulf esa
 * uni soatiga bir martadan ko'p ishlatmaydi.
 *
 * ── Nima uchun bu YETARLI ─────────────────────────────────────────────
 * Ilovada har soatda kamida bitta so'rov bo'ladi — bo'lmasa,
 * eslatma yuboradigan odam ham yo'q degani.
 */

/** Redisdagi qulf kaliti — bir vaqtda faqat bitta o'tish ishlaydi. */
const SWEEP_LOCK_KEY = 'navix:cart:reminder-lock';

/** O'tishlar orasidagi eng kam vaqt. */
const SWEEP_INTERVAL_SECONDS = 60 * 60;

/** Bitta odamga qayta eslatmaslik uchun kalit. */
function cooldownKey(userId: string): string {
  return `navix:cart:reminded:${userId}`;
}

/**
 * Eslatmani FON REJIMIDA ishga tushiradi.
 *
 * ── Nima uchun KUTILMAYDI ────────────────────────────────────────────
 * Uni chaqirgan so'rov (savat ochilishi) DARHOL javob berishi kerak.
 * Eslatma esa hech kimni kutmaydigan ish: u orqada bajariladi va
 * xatosi ham yutiladi.
 */
export function scheduleCartReminders(): void {
  void (async () => {
    try {
      const redis = getRedis();

      /**
       * `NX` — qulf FAQAT bo'sh bo'lsa qo'yiladi.
       *
       * Ikki so'rov bir vaqtda kelsa, ulardan faqat bittasi qulfni
       * oladi va faqat o'sha eslatma yuboradi.
       */
      const locked = await redis.set(SWEEP_LOCK_KEY, '1', 'EX', SWEEP_INTERVAL_SECONDS, 'NX');

      if (locked !== 'OK') return;

      await sendCartReminders();
    } catch (error) {
      logger.warn({ err: error }, "Savat eslatmasini yuborib bo'lmadi");
    }
  })();
}

/**
 * Unutilgan savatlar egalariga eslatma yuboradi.
 *
 * @returns Nechta odamga eslatma yuborildi.
 */
export async function sendCartReminders(now: Date = new Date()): Promise<number> {
  const hour = 60 * 60 * 1000;

  /*
    Vaqt oralig'i IKKI tomondan chegaralangan.

    Pastki chegara: bir necha soatdan keyin eslatish bezorilik.
    Yuqori chegarasi: ikki hafta oldingi savat haqida eslatish
    foydasiz va faqat asabga tegadi.
  */
  const newest = new Date(now.getTime() - REMINDER_AFTER_HOURS * hour);
  const oldest = new Date(now.getTime() - REMINDER_BEFORE_HOURS * hour);

  /*
    Qaysi odamlarning savati qimirlamagan.

    `groupBy` ishlatiladi: bitta odamning savatida o'nta qator
    bo'lishi mumkin va ularning har biri uchun alohida eslatma
    yuborish mumkin emas.
  */
  const candidates = await prisma.cartItem.groupBy({
    by: ['userId'],
    where: {
      savedForLater: false,
      updatedAt: { lte: newest, gte: oldest },
    },
    _count: { _all: true },
    _max: { updatedAt: true },
    /*
      Eng UZOQ qimirlamagan savat birinchi.

      Bir o'tishda hammaga yetib bo'lmaydi (`REMINDER_BATCH`), va
      oynadan chiqib ketish arafasidagi savatlar birinchi navbatda
      eslatilishi kerak — ular boshqa imkoniyat olmaydi.
    */
    orderBy: { _max: { updatedAt: 'asc' } },
    take: REMINDER_BATCH,
  });

  if (candidates.length === 0) return 0;

  const redis = getRedis();
  let sent = 0;

  for (const candidate of candidates) {
    /*
      ── Nima uchun savat YANA tekshiriladi ──────────────────────
      Yuqoridagi so'rov qatorlarni ALOHIDA tekshirgan. Odamning
      savatida bitta eski va bitta yangi qator bo'lsa, u ro'yxatga
      tushardi — aslida savati bugun qimirlagan bo'lsa ham.
    */
    const latest = candidate._max.updatedAt;

    if (!latest || latest > newest) continue;

    try {
      /*
        Qayta eslatmaslik uchun qulf. `NX` tufayli u faqat bir
        marta qo'yiladi va muddati tugagunicha ushlab turadi.

        ── Nima uchun bazada emas ────────────────────────────────
        Buning uchun `cart_items` ga ustun qo'shish yoki alohida
        jadval kerak bo'lardi. Redis o'chib qolsa, eng yomon
        holatda odam bitta ortiqcha eslatma oladi — bu ustun
        qo'shish narxiga arzimaydi.
      */
      const fresh = await redis.set(
        cooldownKey(candidate.userId),
        '1',
        'EX',
        REMINDER_COOLDOWN_HOURS * 60 * 60,
        'NX',
      );

      if (fresh !== 'OK') continue;

      const first = await prisma.cartItem.findFirst({
        where: { userId: candidate.userId, savedForLater: false },
        orderBy: { createdAt: 'asc' },
        select: { product: { select: { name: true, isActive: true } } },
      });

      // Mahsulot sotuvdan olingan — eslatishning ma'nosi yo'q.
      if (!first || !first.product.isActive) continue;

      await notifyUser(candidate.userId, 'market.cart_reminder', {
        subject: reminderSubject(first.product.name, candidate._count._all - 1),
        itemCount: candidate._count._all,
      });

      sent += 1;
    } catch (error) {
      // Bitta odamdagi xato qolganlarni to'xtatmasligi kerak.
      logger.warn({ err: error, userId: candidate.userId }, 'Savat eslatmasi yuborilmadi');
    }
  }

  return sent;
}
