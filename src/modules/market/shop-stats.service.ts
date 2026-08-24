import { MarketOrderStatus } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  MIN_RESPONSE_SAMPLE,
  RESPONSE_WINDOW,
  hoursBetween,
  median,
} from '@/config/shop-stats';
import type { ShopResponseStats, ShopStatsView } from '@/config/shop-stats';

/**
 * Do'kon ko'rsatkichlarini HISOBLAYDI.
 *
 * ── Nima uchun alohida modul ──────────────────────────────────────────
 * `market.service.ts` allaqachon katta: unda katalog, savat va
 * buyurtmalar bor. Sotuvchi ko'rsatkichlari esa boshqa savolga javob
 * beradi va boshqa jadvallardan o'qiydi.
 *
 * Ular alohida turgani uchun do'kon sahifasini ochish katalog
 * so'rovini sekinlashtirmaydi va bu yerdagi og'ir hisob faqat
 * kerak bo'lganda ishga tushadi.
 *
 * ── Nima uchun sonlar SAQLANMAYDI ─────────────────────────────────────
 * `shops` jadvaliga `responseHours` ustuni qo'shsa bo'lardi va o'qish
 * tezroq bo'lardi.
 *
 * Lekin o'shanda uni kim va qachon yangilashi masalasi tug'ilardi:
 * har bir javobdami, kunigami, qo'ldami. Yangilash unutilgan joyda
 * odam ESKI songa qarab qaror qabul qilardi — bu esa yolg'onning
 * eng yomon turi, chunki u ishonchli ko'rinadi.
 *
 * Hozircha hisob to'g'ridan-to'g'ri qilinadi. Do'konda o'n minglab
 * savol to'planganda bu qaror qayta ko'riladi — o'sha paytda oyna
 * (`RESPONSE_WINDOW`) allaqachon joyida turibdi.
 */

/**
 * Savol-javob ko'rsatkichi.
 *
 * ── Nima uchun ikkita alohida son ─────────────────────────────────────
 * "Qancha tez javob beradi" va "umuman javob beradimi" — bu ikki xil
 * savol. Sotuvchi uchta savolga bir daqiqada javob berib, qolgan
 * yigirmatasini umuman o'qimagan bo'lishi mumkin.
 *
 * Faqat tezlik ko'rsatilsa, u "ajoyib sotuvchi" bo'lib ko'rinardi.
 */
async function getResponseStats(shopId: string): Promise<ShopResponseStats | null> {
  const [askedCount, answered] = await Promise.all([
    prisma.productQuestion.count({ where: { product: { shopId } } }),

    prisma.productQuestion.findMany({
      where: {
        product: { shopId },
        answers: { some: { isFromSeller: true } },
      },
      select: {
        createdAt: true,
        answers: {
          where: { isFromSeller: true },
          /*
            BIRINCHI javob olinadi: sotuvchi keyinroq qo'shimcha
            izoh yozgan bo'lsa, u "tezlik" emas, suhbat.
          */
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      // Eng yangi savollar — do'konning HOZIRGI holati.
      orderBy: { createdAt: 'desc' },
      take: RESPONSE_WINDOW,
    }),
  ]);

  // Savol umuman berilmagan bo'lsa, aytadigan gap yo'q.
  if (askedCount === 0) return null;

  const hours = answered
    .map((question) => {
      const first = question.answers[0];

      return first ? hoursBetween(question.createdAt, first.createdAt) : null;
    })
    .filter((value): value is number => value !== null);

  return {
    askedCount,
    answeredCount: answered.length,
    /*
      Yetarli javob bo'lmasa tezlik KO'RSATILMAYDI. Bir-ikkita
      yozuvdan chiqarilgan son ishonchli ko'rinadi va aynan
      shuning uchun xavfli.
    */
    medianHours: hours.length >= MIN_RESPONSE_SAMPLE ? median(hours) : null,
  };
}

/**
 * Do'kon haqidagi barcha sonlar.
 *
 * `shopId` va `createdAt` chaqiruvchida allaqachon bor — ularni
 * qaytadan so'ramaslik uchun parametr sifatida olinadi.
 */
export async function getShopStats(
  shopId: string,
  createdAt: Date,
  now: Date = new Date(),
): Promise<ShopStatsView> {
  const [productCount, deliveredCount, response] = await Promise.all([
    prisma.product.count({ where: { shopId, isActive: true } }),

    /*
      FAQAT yetkazib berilganlari sanaladi.

      "Buyurtmalar soni" desak, bekor qilingani ham tushardi va son
      haqiqiy savdodan katta chiqardi.
    */
    prisma.marketOrder.count({ where: { shopId, status: MarketOrderStatus.DELIVERED } }),

    getResponseStats(shopId),
  ]);

  return {
    productCount,
    deliveredCount,
    daysOnNavix: Math.max(0, Math.floor(hoursBetween(createdAt, now) / 24)),
    response,
  };
}
