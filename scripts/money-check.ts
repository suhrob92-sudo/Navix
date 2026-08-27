// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi.
import 'dotenv/config';

import { formatTiyin } from '../src/lib/money';
import { connectDatabase } from './lib/db-target';

/**
 * PUL TEKSHIRUVI — hamyonlardagi raqamlar tarixga mos keladimi.
 *
 * ── Nima uchun kerak (auditda topilgan bo'shliq) ──────────────────────
 * Kod tomondan hamma narsa to'g'ri: balans faqat `wallet.service.ts`
 * ichida, har doim tranzaksiya yozuvi bilan BIRGA o'zgaradi.
 *
 * Lekin tizimda hech narsa buni TEKSHIRIB turmasdi. Ya'ni bir marta
 * xato bo'lsa (baza bilan qo'lda ishlash, kelajakdagi yangi kod,
 * yarim qolgan tranzaksiya) — u JIMGINA qolib ketardi. Pulda esa
 * jim qolgan xato eng qimmati: uni oylar o'tib, foydalanuvchi
 * shikoyat qilganda topasiz.
 *
 * Shu skript to'rtta savolga javob beradi:
 *
 *   1. Har bir hamyon balansi = KIRIM − CHIQIM ga tengmi?
 *   2. Qaytarilgan pul to'langanidan oshib ketmaganmi?
 *   3. Manfiy balans yoki band summasi balansdan ko'pmi?
 *   4. Mijoz kalitlari egasiga bog'langanmi (yangi qoida)?
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 *   npm run money:check           → lokal baza
 *   npm run money:check -- --prod → bulutdagi baza
 *
 * Skript HECH NARSANI o'zgartirmaydi — faqat o'qiydi.
 */

/** Muammo topilsa 1 qaytariladi — CI shu bo'yicha to'xtaydi. */
let problems = 0;

function head(title: string): void {
  console.info(`\n${title}`);
}

function ok(message: string): void {
  console.info(`  ✅ ${message}`);
}

function bad(message: string): void {
  problems += 1;
  console.info(`  ❌ ${message}`);
}

/** Telefon raqamini to'liq ko'rsatmaymiz — log begona ko'zga tushishi mumkin. */
function maskPhone(phone: string | null): string {
  if (!phone) return "noma'lum";

  return `${phone.slice(0, 8)}****${phone.slice(-2)}`;
}

interface DriftRow {
  walletId: string;
  phone: string | null;
  balance: bigint;
  expected: bigint;
}

interface OverRefundRow {
  sourceModule: string;
  sourceId: string;
  charged: bigint;
  refunded: bigint;
}

interface NegativeRow {
  walletId: string;
  phone: string | null;
  balance: bigint;
  reserved: bigint;
}

interface LooseKeyRow {
  idempotencyKey: string;
  createdAt: Date;
}

async function main(): Promise<void> {
  const { prisma, isProduction } = connectDatabase(process.argv);

  try {
    /**
     * 1. BALANS = KIRIM − CHIQIM.
     *
     * Faqat COMPLETED yozuvlar hisoblanadi: kutayotgan yoki bekor
     * bo'lgan amal balansga tegmaydi.
     */
    head('1) Hamyon balansi tarixga mos keladimi?');

    const drift = await prisma.$queryRaw<DriftRow[]>`
      SELECT w."id" AS "walletId",
             u."phone" AS "phone",
             w."balance" AS "balance",
             COALESCE(
               SUM(
                 CASE
                   WHEN t."status" = 'COMPLETED' AND t."direction" = 'IN' THEN t."amount"
                   WHEN t."status" = 'COMPLETED' AND t."direction" = 'OUT' THEN -t."amount"
                   ELSE 0
                 END
               ),
               0
             )::BIGINT AS "expected"
      FROM "wallets" w
      LEFT JOIN "users" u ON u."id" = w."userId"
      LEFT JOIN "wallet_transactions" t ON t."walletId" = w."id"
      GROUP BY w."id", u."phone", w."balance"
      HAVING w."balance" <> COALESCE(
        SUM(
          CASE
            WHEN t."status" = 'COMPLETED' AND t."direction" = 'IN' THEN t."amount"
            WHEN t."status" = 'COMPLETED' AND t."direction" = 'OUT' THEN -t."amount"
            ELSE 0
          END
        ),
        0
      )
      ORDER BY ABS(w."balance") DESC
    `;

    if (drift.length === 0) {
      ok('hamma hamyon tarixga mos');
    } else {
      for (const row of drift) {
        const difference = row.balance - row.expected;
        const sign = difference > 0n ? '+' : '−';

        bad(
          `${maskPhone(row.phone)} — balans ${formatTiyin(row.balance)}, tarix bo'yicha ` +
            `${formatTiyin(row.expected)} (farq ${sign}${formatTiyin(difference < 0n ? -difference : difference)})`,
        );
      }

      console.info('');
      console.info('     Nima qilish kerak: farqni QO\'LDA tuzatmang.');
      console.info('     Avval shu hamyon tarixini ko\'ring (wallet_transactions),');
      console.info("     farq qayerdan kelganini aniqlang va sababini yozib qo'ying.");
    }

    /**
     * 2. QAYTARILGAN PUL TO'LANGANIDAN OSHMASIN.
     *
     * Bitta obyekt (buyurtma, bandlov) bo'yicha `PAYMENT` chiqimi va
     * `REFUND` kirimi solishtiriladi. Bekor qilish ham, mahsulot
     * qaytarish ham shu obyektga bog'lanadi, ya'ni ikkalasi birga
     * hisoblanadi — aynan shu joyda "ikki marta qaytarish" ko'rinadi.
     *
     * ── Nima uchun faqat `sourceId` bo'yicha guruhlanadi ─────────────
     * Modul nomi ikki tomonda BOSHQACHA bo'lishi mumkin: xaridor
     * to'laganda "market", sotuvchi rad etganda "seller". Modulni ham
     * guruhga qo'shsak, bitta buyurtma ikkiga bo'linib ketardi va
     * har bir rad etish "to'lovsiz qaytarish" bo'lib ko'rinardi.
     */
    head("2) Qaytarilgan pul to'langanidan oshmaganmi?");

    const overRefund = await prisma.$queryRaw<OverRefundRow[]>`
      SELECT string_agg(DISTINCT t."sourceModule", ', ' ORDER BY t."sourceModule") AS "sourceModule",
             t."sourceId" AS "sourceId",
             SUM(CASE WHEN t."type" = 'PAYMENT' THEN t."amount" ELSE 0 END)::BIGINT AS "charged",
             SUM(CASE WHEN t."type" = 'REFUND' THEN t."amount" ELSE 0 END)::BIGINT AS "refunded"
      FROM "wallet_transactions" t
      WHERE t."status" = 'COMPLETED'
        AND t."sourceId" IS NOT NULL
        AND t."type" IN ('PAYMENT', 'REFUND')
      GROUP BY t."sourceId"
      HAVING SUM(CASE WHEN t."type" = 'REFUND' THEN t."amount" ELSE 0 END)
           > SUM(CASE WHEN t."type" = 'PAYMENT' THEN t."amount" ELSE 0 END)
      ORDER BY 2
    `;

    if (overRefund.length === 0) {
      ok("hech qayerda ortiqcha qaytarish yo'q");
    } else {
      for (const row of overRefund) {
        bad(
          `${row.sourceModule} / ${row.sourceId} — to'langan ${formatTiyin(row.charged)}, ` +
            `qaytarilgan ${formatTiyin(row.refunded)}`,
        );
      }
    }

    /**
     * 3. MANFIY BALANS VA BAND SUMMA.
     *
     * `reserved` — buyurtma uchun band qilingan pul. U balansdan ko'p
     * bo'lsa, foydalanuvchi o'zida yo'q pulni band qilib qo'ygan
     * bo'lardi.
     */
    head('3) Manfiy balans yoki ortiqcha band summa bormi?');

    const negative = await prisma.$queryRaw<NegativeRow[]>`
      SELECT w."id" AS "walletId",
             u."phone" AS "phone",
             w."balance" AS "balance",
             w."reserved" AS "reserved"
      FROM "wallets" w
      LEFT JOIN "users" u ON u."id" = w."userId"
      WHERE w."balance" < 0 OR w."reserved" < 0 OR w."reserved" > w."balance"
      ORDER BY w."balance"
    `;

    if (negative.length === 0) {
      ok('balanslar musbat, band summalar joyida');
    } else {
      for (const row of negative) {
        bad(
          `${maskPhone(row.phone)} — balans ${formatTiyin(row.balance)}, ` +
            `band ${formatTiyin(row.reserved)}`,
        );
      }
    }

    /**
     * 4. MIJOZ KALITLARI EGASIGA BOG'LANGANMI.
     *
     * Yangi qoida: mijoz yuborgan kalit "client:{foydalanuvchiId}:..."
     * ko'rinishida saqlanadi. Server kalitlari esa obyektga bog'langan
     * va ma'lum old qo'shimcha bilan boshlanadi.
     *
     * Bu ro'yxatga tushgan yozuv — yo eski (o'zgartirishdan oldingi),
     * yo yangi kod qoidani buzgan. Ikkalasi ham ko'rinib turishi kerak.
     */
    head("4) Kalitlar egasiga bog'langanmi?");

    const looseKeys = await prisma.$queryRaw<LooseKeyRow[]>`
      SELECT t."idempotencyKey" AS "idempotencyKey",
             t."createdAt" AS "createdAt"
      FROM "wallet_transactions" t
      WHERE t."idempotencyKey" NOT LIKE 'client:%'
        AND t."idempotencyKey" !~ '^(market-refund|market-return|booking-refund|food-refund|parcel-refund|ticket-refund|delivery-payout|refund)-'
      ORDER BY t."createdAt" DESC
      LIMIT 20
    `;

    if (looseKeys.length === 0) {
      ok("hamma kalit qoidaga mos");
    } else {
      for (const row of looseKeys) {
        bad(`"${row.idempotencyKey}" — egasi ko'rsatilmagan (${row.createdAt.toISOString().slice(0, 10)})`);
      }

      console.info('');
      console.info('     Eski yozuvlar bo\'lsa — bu xavfli emas, ular tarixda qoladi.');
      console.info('     YANGI sanadagi yozuv bo\'lsa — kodda kalit noto\'g\'ri yasalgan.');
    }

    // ── Xulosa ────────────────────────────────────────────────────────
    console.info('');

    if (problems === 0) {
      console.info(`✅ Pul hisobi toza${isProduction ? ' (bulutdagi baza)' : ''}.`);
    } else {
      console.info(`❌ ${problems} ta muammo topildi. Yuqoridagi ro'yxatni ko'ring.`);
      process.exitCode = 1;
    }

    console.info('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Tekshirib bo\'lmadi:', error);
  process.exit(1);
});
