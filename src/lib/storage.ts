import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { del, put } from '@vercel/blob';

import { ServiceUnavailableError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Fayl saqlash — bitta eshik, ikkita yo'l.
 *
 * ── Nima uchun IKKI yo'l ──────────────────────────────────────────────
 * Production'da (Vercel) ilova serversiz ishlaydi: diskka yozilgan
 * narsa bir necha daqiqadan keyin yo'qoladi. Shuning uchun u yerda
 * fayllar Vercel Blob'da saqlanadi.
 *
 * Ishlab chiqishda esa kalit bo'lmasligi mumkin. Kalitsiz rasm
 * yuklashni butunlay o'chirib qo'yish ham mumkin edi, lekin unda
 * butun bo'lim sinovsiz qolardi — va u faqat production'da,
 * foydalanuvchilar oldida sinalardi.
 *
 * Shu sababli kalitsiz holatda fayllar mahalliy `.uploads/` papkasiga
 * yoziladi va `/api/v1/files/...` orqali beriladi. Kod esa BIR XIL:
 * chaqiruvchi qaysi yo'l ishlayotganini bilmaydi.
 */

/** Mahalliy papka — faqat kalit bo'lmaganda ishlatiladi. */
const LOCAL_ROOT = resolve(process.cwd(), '.uploads');

export function isBlobConfigured(): boolean {
  return Boolean(serverEnv().BLOB_READ_WRITE_TOKEN);
}

/**
 * Serversiz muhitdamizmi (Vercel).
 *
 * ── Nima uchun `NODE_ENV=production` EMAS ─────────────────────────────
 * Ilovani o'z serverida `next start` bilan ishga tushirish ham
 * "production" hisoblanadi — lekin u yerda disk BOR va mahalliy
 * papka mukammal ishlaydi. `NODE_ENV` ga qarasak, o'sha to'g'ri
 * sozlamani ham xato deb rad etardik.
 *
 * `VERCEL` o'zgaruvchisini platformaning O'ZI qo'yadi va u aynan
 * "disk yo'q" degan holatni bildiradi.
 */
function isServerlessRuntime(): boolean {
  return process.env.VERCEL === '1';
}

/**
 * Kalitni tozalaydi.
 *
 * ── Nima uchun MAJBURIY ───────────────────────────────────────────────
 * Kalit ichida `..` bo'lsa, mahalliy yo'lda u papkadan chiqib ketardi:
 * `.uploads/../../.env` — ya'ni istalgan faylni o'qish yoki yozish.
 * Bu eng klassik va eng qimmatga tushadigan xatolardan biri.
 */
function assertSafeKey(key: string): void {
  const isSafe = /^[a-z0-9][a-z0-9/_.-]*$/i.test(key) && !key.includes('..') && !key.startsWith('/');

  if (!isSafe) {
    throw new Error(`Xavfsiz bo'lmagan fayl kaliti: ${key}`);
  }
}

export interface StoredFile {
  /** Brauzer ochadigan manzil. */
  url: string;
  /** Ichki kalit — o'chirish uchun. */
  key: string;
}

/** Faylni saqlaydi va ochiq manzilini qaytaradi. */
export async function putObject(key: string, data: Buffer, contentType: string): Promise<StoredFile> {
  assertSafeKey(key);

  if (isBlobConfigured()) {
    const result = await put(key, data, {
      access: 'public',
      contentType,
      token: serverEnv().BLOB_READ_WRITE_TOKEN,
      /**
       * Kalit oxiriga tasodifiy qo'shimcha QO'SHILMAYDI.
       *
       * Kalitni biz o'zimiz tasodifiy yasaymiz va uni bazada
       * saqlaymiz — Blob uni yana o'zgartirsa, o'chirish uchun kerakli
       * nom mos kelmay qolardi.
       */
      addRandomSuffix: false,
    });

    return { url: result.url, key };
  }

  /*
    ── HAQIQIY XATO: production'da rasm YUKLANMASDI ──────────────────
    Kalit sozlanmaganda kod mahalliy papkaga yozishga o'tardi. Bu
    ishlab chiqishda to'g'ri, LEKIN Vercel'da disk faqat o'qish
    uchun: yozish `EROFS` xatosi bilan yiqilardi.

    Foydalanuvchi esa "Nimadir xato ketdi" degan umumiy javobni
    ko'rardi va nima qilishni bilmasdi. Jurnalda ham faqat operatsion
    tizimning xatosi turardi — sababi (kalit yo'qligi) hech qayerda
    aytilmasdi.

    Endi holat DARHOL va ANIQ aytiladi: ham foydalanuvchiga, ham
    jurnalga.
  */
  if (isServerlessRuntime()) {
    logger.error(
      { key },
      "BLOB_READ_WRITE_TOKEN sozlanmagan: serversiz muhitda diskka yozib bo'lmaydi. " +
        "Vercel loyihasiga Blob ombori ulanishi va kalit qo'shilishi kerak.",
    );

    throw new ServiceUnavailableError('Rasm saqlash hali sozlanmagan. Administrator fayl omborini ulashi kerak.');
  }

  const path = join(LOCAL_ROOT, key);

  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  } catch (error) {
    /*
      Disk to'lgan yoki ruxsat yo'q. Bu holatda ham odam umumiy
      "xato" emas, tushunarli javob olishi kerak.
    */
    logger.error({ err: error, key }, "Faylni diskka yozib bo'lmadi");

    throw new ServiceUnavailableError("Rasmni saqlab bo'lmadi. Birozdan keyin urinib ko'ring.");
  }

  logger.debug({ key }, 'Fayl mahalliy papkaga saqlandi');

  return { url: `/api/v1/files/${key}`, key };
}

/**
 * Faylni o'chiradi.
 *
 * Xatolik yutiladi: fayl allaqachon yo'q bo'lishi mumkin va bu
 * asosiy amalni (masalan postni o'chirishni) to'xtatmasligi kerak.
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    assertSafeKey(key);

    if (isBlobConfigured()) {
      await del(key, { token: serverEnv().BLOB_READ_WRITE_TOKEN });

      return;
    }

    await unlink(join(LOCAL_ROOT, key));
  } catch (error) {
    logger.warn({ err: error, key }, "Faylni o'chirib bo'lmadi");
  }
}

/**
 * Mahalliy faylni o'qiydi — `/api/v1/files/...` uchun.
 *
 * Blob rejimida bu funksiya CHAQIRILMAYDI: u yerda fayllarni
 * to'g'ridan-to'g'ri Vercel beradi.
 */
export async function readLocalObject(key: string): Promise<Buffer | null> {
  try {
    assertSafeKey(key);

    return await readFile(join(LOCAL_ROOT, key));
  } catch {
    return null;
  }
}
