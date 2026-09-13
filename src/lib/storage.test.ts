import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceUnavailableError } from '@/lib/api/errors';

/**
 * Fayl saqlash — serversiz muhitda DISK YO'Q.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * `BLOB_READ_WRITE_TOKEN` sozlanmaganda kod mahalliy papkaga yozishga
 * o'tardi. Ishlab chiqishda bu to'g'ri, lekin Vercel'da disk faqat
 * o'qish uchun: yozish `EROFS` bilan yiqilardi.
 *
 * Foydalanuvchi "Nimadir xato ketdi" degan umumiy javobni ko'rardi,
 * jurnalda esa faqat operatsion tizim xatosi turardi — sababi
 * (kalit yo'qligi) hech qayerda aytilmasdi. Rasm yuklash
 * production'da JIM ravishda ishlamasdi.
 */
const serverEnv = vi.hoisted(() => vi.fn(() => ({ BLOB_READ_WRITE_TOKEN: undefined })));

vi.mock('@/lib/env', () => ({
  serverEnv,
  isProduction: () => false,
  isDevelopment: () => true,
  isTest: () => true,
}));

/** Diskka yozish CHAQIRILMASLIGI kerak — buni sanab tekshiramiz. */
const writeFile = vi.hoisted(() => vi.fn());
const mkdir = vi.hoisted(() => vi.fn());

vi.mock('node:fs/promises', () => ({
  writeFile,
  mkdir,
  readFile: vi.fn(),
  unlink: vi.fn(),
}));

const { putObject } = await import('@/lib/storage');

const OLD_VERCEL = process.env.VERCEL;

beforeEach(() => {
  writeFile.mockClear();
  mkdir.mockClear();
});

afterEach(() => {
  if (OLD_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = OLD_VERCEL;
});

describe('fayl saqlash — kalit sozlanmagan', () => {
  it("Vercel'da DISKKA UMUMAN urinmaydi", async () => {
    process.env.VERCEL = '1';

    await expect(putObject('avatars/a/b.png', Buffer.from([1, 2, 3]), 'image/png')).rejects.toThrow(
      ServiceUnavailableError,
    );

    /*
      Eng muhim tekshiruv: yozishga URINISH ham bo'lmasligi kerak.
      Aks holda xato `EROFS` bo'lib chiqardi va sabab yo'qolardi.
    */
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('xato matni odamga TUSHUNARLI', async () => {
    process.env.VERCEL = '1';

    await expect(putObject('avatars/a/b.png', Buffer.from([1]), 'image/png')).rejects.toThrow(/sozlanmagan/);
  });

  it("o'z serverida (disk bor) mahalliy papka ISHLAYDI", async () => {
    /*
      `VERCEL` yo'q — ya'ni `next start` bilan o'z serverida yoki
      ishlab chiqishda. U yerda disk bor va taqiq noto'g'ri bo'lardi.
    */
    delete process.env.VERCEL;

    const stored = await putObject('avatars/a/b.png', Buffer.from([1]), 'image/png');

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(stored.url).toBe('/api/v1/files/avatars/a/b.png');
  });

  it('disk xatosi ham TUSHUNARLI javobga aylanadi', async () => {
    delete process.env.VERCEL;
    writeFile.mockRejectedValueOnce(new Error('EROFS: read-only file system'));

    await expect(putObject('avatars/a/b.png', Buffer.from([1]), 'image/png')).rejects.toThrow(
      ServiceUnavailableError,
    );
  });
});
