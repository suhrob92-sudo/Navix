import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * HAR BIR tashqi kalitda indeks bormi.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * PostgreSQL tashqi kalit uchun indeksni O'ZI yaratmaydi. Indekssiz
 * tashqi kalit ikki joyda og'riq beradi:
 *
 *   1. OTA qator o'chirilganda baza bola jadvalni BUTUNLAY o'qiydi
 *      ("bunga bog'langanlari bormi?"). `post_seen` millionlab
 *      qatorga yetadi — bitta postni o'chirish sekundlab cho'ziladi.
 *
 *   2. Teskari qidiruv ham to'liq o'qishga aylanadi. Masalan restoran
 *      o'z buyurtmalarini so'raganda.
 *
 * 28-bosqichda 22 ta indekssiz tashqi kalit topildi. Ular orasida
 * lentaning "hassos filtri" ishlatadigan `UserReport.postId` ham
 * bor edi — u har bir lenta so'rovida tekshiriladi.
 *
 * ── Nima uchun bu sinov KELAJAK uchun ─────────────────────────────────
 * Yangi bog'lanish qo'shish oson va indeksni unutish ham oson.
 * Natijasi esa darhol ko'rinmaydi: kichik bazada hammasi tez
 * ishlaydi va muammo faqat ma'lumot ko'payganda chiqadi — ya'ni eng
 * yomon paytda.
 */

interface Model {
  name: string;
  body: string;
}

function readModels(): Model[] {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  const models: Model[] = [];

  for (const match of schema.matchAll(/^model (\w+) \{$([\s\S]*?)^\}$/gm)) {
    models.push({ name: match[1], body: match[2] });
  }

  return models;
}

/** `@relation(fields: [a, b])` dagi BIRINCHI ustun. */
function relationColumns(body: string): string[] {
  const columns: string[] = [];

  for (const match of body.matchAll(/@relation\([^)]*fields:\s*\[([^\]]+)\]/g)) {
    const first = match[1].split(',')[0].trim();

    if (first) columns.push(first);
  }

  return columns;
}

/**
 * Ustun indeks BOSHIDA turibdimi.
 *
 * ── Nima uchun faqat BOSHI ────────────────────────────────────────────
 * `@@index([a, b])` indeksi `a` bo'yicha qidiruvga yaraydi, `b`
 * bo'yicha esa YO'Q. PostgreSQL indeksni chapdan o'qiydi.
 */
function isIndexed(body: string, column: string): boolean {
  const patterns = [
    new RegExp(`@@index\\(\\[${column}\\b`),
    new RegExp(`@@unique\\(\\[${column}\\b`),
    new RegExp(`@@id\\(\\[${column}\\b`),
    // Bitta ustunli birlamchi kalit yoki noyoblik ham indeks yasaydi.
    new RegExp(`^\\s*${column}\\s+\\S+.*@(id|unique)\\b`, 'm'),
  ];

  return patterns.some((pattern) => pattern.test(body));
}

describe('prisma sxemasi', () => {
  it('HAR BIR tashqi kalitda indeks bor', () => {
    const missing: string[] = [];

    for (const model of readModels()) {
      for (const column of relationColumns(model.body)) {
        if (!isIndexed(model.body, column)) {
          missing.push(`${model.name}.${column}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('sinovning o\'zi ishlayotganini tekshiradi', () => {
    /*
      Sinov "hech narsa topmadi" deb o'tib ketishi mumkin: naqsh
      buzilsa, u bo'sh ro'yxat qaytaradi va hamma narsa yaxshi
      ko'rinadi.

      Shuning uchun u kamida bir nechta bog'lanishni TOPGANIGA
      ishonch hosil qilamiz.
    */
    const models = readModels();
    const total = models.reduce((sum, model) => sum + relationColumns(model.body).length, 0);

    expect(models.length).toBeGreaterThan(30);
    expect(total).toBeGreaterThan(50);
  });
});
