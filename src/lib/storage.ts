import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { del, put } from '@vercel/blob';

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

  const path = join(LOCAL_ROOT, key);

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);

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
