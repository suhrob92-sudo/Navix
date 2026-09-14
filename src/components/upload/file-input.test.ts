import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

/**
 * Fayl tanlash maydonlari — telefonda ISHLASHI shart.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * Ilovada oltita fayl maydoni bor. Ikkitasi to'g'ri yozilgandi, qolgan
 * to'rttasi esa eski usulda qolib ketgandi va telefonda jim ravishda
 * ishlamasdi: odam tugmani bosadi, galereya ochilmaydi, xato ham
 * chiqmaydi.
 *
 * Ikkita sabab bor edi va ikkalasi ham KO'RINMAS:
 *
 *  1. `className="hidden"` — bu `display: none`. Kompyuterda dastur
 *     orqali bosish ishlayveradi, ayrim mobil brauzerlar esa
 *     chizilmagan elementning bosilishini e'tiborsiz qoldiradi.
 *
 *  2. `accept="image/jpeg,image/png,..."` — telefon galereyasi rasmni
 *     ko'pincha boshqa tur bilan e'lon qiladi (`image/heic`,
 *     `image/heif`). Natijada odamning O'Z rasmlari galereyada
 *     kulrang bo'lib qolardi.
 */
const TSX: string[] = readdirSync('src', { recursive: true, encoding: 'utf8' })
  .filter((name) => name.endsWith('.tsx'))
  .map((name) => `src/${name.split('\\').join('/')}`);

/** Fayl maydoni bor fayllar va o'sha maydonning atrofidagi matn. */
function fileInputBlocks(): { file: string; block: string }[] {
  const blocks: { file: string; block: string }[] = [];

  for (const file of TSX) {
    const src = readFileSync(file, 'utf8');
    let from = src.indexOf('type="file"');

    while (from !== -1) {
      /* Maydon atrofidagi ~400 belgi — `accept` va `className` shu yerda. */
      blocks.push({ file, block: src.slice(Math.max(0, from - 200), from + 400) });
      from = src.indexOf('type="file"', from + 1);
    }
  }

  return blocks;
}

const BLOCKS = fileInputBlocks();

describe('fayl tanlash maydonlari', () => {
  it('maydonlar topildi', () => {
    /* Qidiruv buzilsa, quyidagilar bo'sh ro'yxat ustida "o'tardi". */
    expect(BLOCKS.length).toBeGreaterThanOrEqual(6);
  });

  it('hech biri `display: none` bilan yashirilmagan', () => {
    const aybdorlar = BLOCKS.filter((b) => /className="hidden"/.test(b.block)).map((b) => b.file);

    expect([...new Set(aybdorlar)]).toEqual([]);
  });

  it("tur ro'yxati QISQARTIRILMAGAN", () => {
    /*
      Faqat `image/*` yoki `video/*` ruxsat etiladi. Aniq ro'yxat
      telefonda odamning o'z rasmlarini tanlab bo'lmaydigan qilib
      qo'yadi.
    */
    const aybdorlar = BLOCKS.filter((b) => {
      const match = b.block.match(/accept="([^"]+)"/);

      return match !== null && !/^(image|video|audio)\/\*$/.test(match[1]);
    }).map((b) => b.file);

    expect([...new Set(aybdorlar)]).toEqual([]);
  });
});
