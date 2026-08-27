import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * ENG KO'P ISHLATILADIGAN so'rovlarga indeks mos keladimi.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Tashqi kalitlar uchun alohida qo'riqchi bor (`schema-indexes.test.ts`).
 * Lekin eng sekin so'rovlar odatda boshqa joyda tug'iladi:
 * ro'yxat sahifasi bir ustun bo'yicha FILTRLAYDI va boshqasi bo'yicha
 * TARTIBLAYDI.
 *
 * Bunday so'rovga faqat KOMPOZIT indeks yordam beradi. Uni unutish
 * juda oson, chunki indeks "bor"day tuyuladi:
 *
 * 53-bosqichdan keyingi tezlik auditida aynan shunday holat topildi.
 * Bildirishnomalarda `("userId", status)` indeksi bor edi va u
 * to'g'riday ko'rinardi. Lekin so'rov `status` bo'yicha emas,
 * `channel` bo'yicha filtrlab, `createdAt` bo'yicha tartiblardi —
 * ya'ni indeks so'rovga MOS EMASDI.
 *
 * Haqiqiy hajmda o'lchandi (bir odamda 5000 bildirishnoma):
 * uchta so'rov jami ~30 ms dan ~2 ms ga tushdi.
 *
 * Audit jurnalida esa `createdAt` bo'yicha indeks umuman yo'q edi:
 * 500 000 yozuvda admin paneli har ochilganda butun jadval o'qilardi
 * (49 ms -> 0.09 ms).
 *
 * ── Nima uchun sxema o'qiladi, baza emas ──────────────────────────────
 * Sinov bazasiz ishlashi kerak: u har bir `npm test` da bajariladi.
 * Sxema esa migratsiyalar bilan bir xil manba — indeks o'chirilsa,
 * sxemadan ham yo'qoladi.
 */

/**
 * QISMAN indekslar bu ro'yxatda YO'Q.
 *
 * Ularni Prisma sxemasida yozib bo'lmaydi (masalan
 * `notifications_unread_idx ... WHERE "readAt" IS NULL`), shuning
 * uchun ular faqat migratsiyada yashaydi va bu sinov ularni
 * ko'rmaydi. Bu ataylab: mavjud bo'lmagan narsani tekshirib bo'lmaydi.
 */
const HOT_QUERIES: readonly {
  model: string;
  columns: readonly string[];
  why: string;
}[] = [
  {
    model: 'Notification',
    columns: ['userId', 'channel', 'createdAt'],
    why: "Ilova har ochilganda: ro'yxat + jami soni + o'qilmaganlar soni.",
  },
  {
    model: 'AuditLog',
    columns: ['createdAt'],
    why: 'Admin jurnali sana bo\'yicha tartiblanadi; jadval hech qachon tozalanmaydi.',
  },
  {
    model: 'Message',
    columns: ['conversationId', 'createdAt'],
    why: "Suhbat ochilganda oxirgi xabarlar shu indeks orqali olinadi.",
  },
  {
    model: 'WalletTransaction',
    columns: ['walletId', 'createdAt'],
    why: 'Hamyon tarixi — eng ko\'p ochiladigan sahifalardan biri.',
  },
  {
    model: 'MarketOrder',
    columns: ['userId', 'createdAt'],
    why: "Foydalanuvchining buyurtmalari ro'yxati.",
  },
  {
    model: 'FoodOrder',
    columns: ['userId', 'createdAt'],
    why: "Ovqat buyurtmalari ro'yxati.",
  },
  {
    model: 'JobApplication',
    columns: ['userId', 'createdAt'],
    why: "Nomzodning arizalari ro'yxati.",
  },
  {
    model: 'Delivery',
    columns: ['courierId', 'status'],
    why: "Kuryer kabinetidagi 'menda turgan topshiriqlar' ro'yxati.",
  },
  {
    model: 'Delivery',
    columns: ['status', 'createdAt'],
    why: "Egasiz topshiriqlar navbati (eng eskisi birinchi).",
  },
  {
    model: 'Post',
    columns: ['authorId', 'createdAt'],
    why: "Profil sahifasidagi postlar, eng yangisi birinchi.",
  },
  {
    model: 'Conversation',
    columns: ['lastMessageAt'],
    why: "Suhbatlar ro'yxati oxirgi xabar vaqti bo'yicha tartiblanadi.",
  },
  {
    model: 'Story',
    columns: ['authorId', 'createdAt'],
    why: "Profildagi hikoyalar — eng yangisi birinchi ko'rinadi.",
  },
  {
    model: 'Session',
    columns: ['expiresAt'],
    why: "Muddati o'tgan sessiyalarni tozalash.",
  },
];

interface ModelIndexes {
  name: string;
  indexes: string[][];
}

/** Sxemadagi har bir model va uning `@@index` ro'yxati. */
function readModelIndexes(): ModelIndexes[] {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const models: ModelIndexes[] = [];

  for (const model of schema.matchAll(/^model (\w+) \{$([\s\S]*?)^\}$/gm)) {
    const [, name, body] = model;
    const indexes: string[][] = [];

    for (const entry of body.matchAll(/@@(?:index|unique)\(\[([^\]]+)\]/g)) {
      indexes.push(
        entry[1]
          .split(',')
          // `createdAt(sort: Desc)` -> `createdAt`
          .map((column) => column.trim().replace(/\(.*$/, ''))
          .filter(Boolean),
      );
    }

    models.push({ name, indexes });
  }

  return models;
}

/** Indeks talab qilingan ustunlar bilan BOSHLANADIMI. */
function covers(index: string[], required: readonly string[]): boolean {
  if (index.length < required.length) return false;

  return required.every((column, position) => index[position] === column);
}

describe('ko\'p ishlatiladigan so\'rovlar indeksi', () => {
  const models = readModelIndexes();

  it('sxema o\'qildi', () => {
    // Naqsh buzilsa, sinov jimgina "hammasi joyida" deb qolardi.
    expect(models.length).toBeGreaterThan(50);
  });

  it.each(HOT_QUERIES)('$model [$columns] — indeks bor', ({ model, columns, why }) => {
    const found = models.find((entry) => entry.name === model);

    expect(found, `${model} modeli sxemada topilmadi`).toBeDefined();

    const hasIndex = found!.indexes.some((index) => covers(index, columns));

    expect(
      hasIndex,
      `${model} da [${columns.join(', ')}] bilan boshlanadigan indeks yo'q.\n` +
        `Nima uchun kerak: ${why}\n` +
        `Hozirgi indekslar: ${found!.indexes.map((index) => `[${index.join(', ')}]`).join(' ')}`,
    ).toBe(true);
  });

  it('har bir talab sababi bilan yozilgan', () => {
    for (const query of HOT_QUERIES) {
      expect(query.why.length, `${query.model}: sabab juda qisqa`).toBeGreaterThan(20);
    }
  });
});
