import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * SHAXSIY yozuv faqat egasiga ko'rinsin.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Begona buyurtmani ochib qo'yish uchun hujum kerak emas — bitta
 * qatorlik e'tiborsizlik yetadi:
 *
 *     prisma.marketOrder.findUnique({ where: { id: orderId } })
 *
 * Bu kod ishlaydi, sahifa ochiladi, sinovlar yashil. Chunki uni
 * yozgan odam O'Z buyurtmasini ochib ko'radi. Muammo faqat begona
 * odam boshqa birovning ID'sini kiritganda chiqadi — va o'shanda
 * u buyurtmani, manzilni, telefon raqamini ko'radi.
 *
 * To'g'ri yo'l — egalikni SO'ROVNING O'ZIGA yozish:
 *
 *     prisma.marketOrder.findFirst({ where: { id: orderId, userId } })
 *
 * Shunda begona ID "topilmadi" qaytaradi va tekshiruvni unutib
 * bo'lmaydi: u so'rovdan ajralmas.
 *
 * ── Istisnolar nima uchun bor ─────────────────────────────────────────
 * Ba'zi joyda ID bo'yicha o'qish TO'G'RI: egalik allaqachon
 * tekshirilgan (yangilangandan keyin qayta o'qish), yoki yozuvni
 * XODIM ochyapti (rol tekshiruvi yo'lda turadi).
 *
 * Har bir istisno shu yerda SABABI bilan yozilgan. Yangi istisno
 * qo'shmoqchi bo'lgan odam avval sababini yozishi kerak — aynan shu
 * to'xtash e'tiborsizlikni ushlaydi.
 *
 * 53-bosqichdan keyingi auditda 95 ta jonli tekshiruv o'tkazildi
 * (begona buyurtma, xabar, ariza, qo'ng'iroq, biznes kabineti) va
 * bitta ham teshik topilmadi. Bu sinov o'sha holatni QOTIRIB QO'YADI.
 */

const SERVICES_ROOT = 'src/modules';

/**
 * Faqat EGASIGA tegishli jadvallar.
 *
 * Katalog (mahsulot, taom, vakansiya) bu ro'yxatda yo'q: u ommaviy,
 * uni ID bo'yicha o'qish normal.
 */
const PRIVATE_MODELS = [
  'marketOrder',
  'foodOrder',
  'hotelBooking',
  'tripBooking',
  'parcel',
  'servicePayment',
  'jobApplication',
  'returnRequest',
  'address',
  'savedAccount',
  'notification',
  'story',
  'message',
  'conversation',
  'delivery',
  'supportTicket',
  'collabOffer',
  'resume',
] as const;

/**
 * ID bo'yicha o'qishga RUXSAT berilgan joylar.
 *
 * `count` — shu fayldagi ruxsat etilgan holatlar soni. Yangi holat
 * qo'shilsa sinov yiqiladi: demak kimdir yangi joyda ID bo'yicha
 * o'qiyapti va uni ko'rib chiqish kerak.
 */
const ALLOWED: readonly { file: string; count: number; reason: string }[] = [
  {
    file: 'src/modules/collab/collab.service.ts',
    count: 2,
    reason:
      "Taklifni ikkala tomon ham ko'radi (yuboruvchi va qabul qiluvchi), " +
      "shuning uchun egalik so'rovdan keyin ikki shart bilan tekshiriladi.",
  },
  {
    file: 'src/modules/job/job.service.ts',
    count: 1,
    reason: "Ariza egalik tekshirilgan yangilanishdan KEYIN qayta o'qiladi.",
  },
  {
    file: 'src/modules/notification/notification.service.ts',
    count: 1,
    reason: "Yuqorida `findFirst({ id, userId })` bor — bu faqat qayta o'qish.",
  },
  {
    file: 'src/modules/story/story.service.ts',
    count: 1,
    reason: "O'chirishdan oldin `authorId` solishtiriladi va begonaga 403 beriladi.",
  },
  {
    file: 'src/modules/food/food.service.ts',
    count: 2,
    reason:
      "Buyurtmaga faqat FOYDALANUVCHINING O'Z idempotentlik kaliti orqali " +
      'kelinadi (kalit egasiga bog\'langan), ya\'ni begona ID kirita olmaydi.',
  },
  {
    file: 'src/modules/market/market.service.ts',
    count: 2,
    reason: "Ovqat moduli bilan bir xil: kirish yo'li — foydalanuvchining o'z kaliti.",
  },
  {
    file: 'src/modules/market/return.service.ts',
    count: 1,
    reason: "Tranzaksiya ichida, egalik tekshirilgandan keyin qayta o'qish.",
  },
  {
    file: 'src/modules/payment/payment.service.ts',
    count: 2,
    reason:
      "Biri — foydalanuvchining o'z kaliti orqali; ikkinchisi — ADMIN qaytaradigan " +
      "to'lov (yo'lda rol tekshiruvi turadi).",
  },
  {
    file: 'src/modules/support/support.service.ts',
    count: 3,
    reason: "Uchalasi ham XODIM funksiyasi: murojaatni ko'rish, javob yozish, yakunlash.",
  },
  {
    file: 'src/modules/employer/employer.service.ts',
    count: 1,
    reason: "Kompaniya egaligi tekshirilgandan keyin qayta o'qish.",
  },
  {
    file: 'src/modules/courier/courier.service.ts',
    count: 1,
    reason: "Ichki yordamchi: xabar yuborish uchun mijoz ID'sini oladi, tashqariga chiqmaydi.",
  },
];

/** `prisma.<jadval>.findUnique({ where: { id: ... } })` naqshi. */
const BY_ID_PATTERN = new RegExp(
  String.raw`(?:prisma|tx)\.(${PRIVATE_MODELS.join('|')})\.(?:findUnique|findUniqueOrThrow)\(\{\s*\n?\s*where:\s*\{\s*id\s*:`,
  'g',
);

function serviceFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);

    if (statSync(path).isDirectory()) {
      found.push(...serviceFiles(path));
      continue;
    }

    if (entry.endsWith('.service.ts')) found.push(path);
  }

  return found;
}

function countByIdReads(path: string): number {
  const source = readFileSync(path, 'utf8');

  return [...source.matchAll(BY_ID_PATTERN)].length;
}

describe('shaxsiy yozuvlar egaligi', () => {
  const files = serviceFiles(SERVICES_ROOT).filter((path) => !path.startsWith('src/modules/admin/'));

  it('xizmat fayllari topildi', () => {
    // Naqsh butunlay ishlamay qolsa, sinov "hammasi joyida" deb aldardi.
    expect(files.length).toBeGreaterThan(20);
  });

  it("ro'yxatdan tashqarida ID bo'yicha o'qish yo'q", () => {
    const documented = new Map(ALLOWED.map((entry) => [entry.file, entry.count]));
    const unexpected: string[] = [];

    for (const path of files) {
      const count = countByIdReads(path);

      if (count === 0) continue;

      const allowed = documented.get(path) ?? 0;

      if (count > allowed) {
        unexpected.push(
          `${path}: ${count} ta topildi, ruxsat etilgani ${allowed} ta. ` +
            "Egalikni so'rovga qo'shing (findFirst({ id, userId })) yoki sababini " +
            'data-ownership.test.ts dagi ALLOWED ro\'yxatiga yozing.',
        );
      }
    }

    expect(unexpected, unexpected.join('\n')).toEqual([]);
  });

  it("ro'yxatdagi istisnolar hali ham mavjud (eskirmagan)", () => {
    const stale = ALLOWED.filter((entry) => countByIdReads(entry.file) < entry.count).map(
      (entry) => `${entry.file}: endi ${countByIdReads(entry.file)} ta qoldi, ro'yxatda ${entry.count} ta`,
    );

    expect(stale, stale.join('\n')).toEqual([]);
  });

  it('har bir istisno sababi yozilgan', () => {
    for (const entry of ALLOWED) {
      expect(entry.reason.length, `${entry.file}: sabab juda qisqa`).toBeGreaterThan(40);
    }
  });
});
