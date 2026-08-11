import { randomUUID } from 'node:crypto';

import { ValidationError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { deleteObject, putObject, type StoredFile } from '@/lib/storage';
import {
  extensionFor,
  formatFileSize,
  keyFromUrl,
  MAX_UPLOAD_BYTES,
  type AllowedImageType,
  type UploadPurpose,
} from '@/modules/upload/upload.types';

/**
 * Rasm yuklash.
 *
 * ── Modulning ENG MUHIM qoidasi: FAYL TURIGA ISHONMASLIK ─────────────
 * Brauzer yuboradigan `Content-Type` — bu shunchaki matn. Uni
 * o'zgartirish uchun maxsus bilim kerak emas: istalgan skript
 * `.exe` faylni "image/png" deb yuborishi mumkin.
 *
 * Shuning uchun tur faylning O'ZIDAN aniqlanadi: har bir rasm
 * formatining boshida o'ziga xos baytlar turadi ("magic bytes") va
 * ularni yasab bo'lmaydi — chunki ular faylning haqiqiy tuzilishi.
 */

/** Fayl boshidagi baytlar bo'yicha rasm turini aniqlaydi. */
export function detectImageType(data: Buffer): AllowedImageType | null {
  if (data.length < 12) return null;

  // JPEG: FF D8 FF
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  if (pngSignature.every((byte, index) => data[index] === byte)) {
    return 'image/png';
  }

  // GIF: "GIF87a" yoki "GIF89a"
  const head = data.toString('ascii', 0, 6);

  if (head === 'GIF87a' || head === 'GIF89a') {
    return 'image/gif';
  }

  // WEBP: "RIFF" ... "WEBP"
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

/** Maqsad bo'yicha papka nomi. */
function folderFor(purpose: UploadPurpose): string {
  if (purpose === 'AVATAR') return 'avatars';
  if (purpose === 'CHAT') return 'chat';

  return 'posts';
}

/**
 * Fayl kaliti.
 *
 * ── Nima uchun foydalanuvchi bergan NOM ishlatilmaydi ────────────────
 * Fayl nomi ichida `../`, bo'sh joy, boshqa alifbo harflari yoki
 * juda uzun matn bo'lishi mumkin. Undan tashqari ikki odam bir xil
 * nomli fayl yuklasa, biri ikkinchisini o'chirib yuborardi.
 *
 * Tasodifiy nom bu muammolarning hammasini bir yo'la yechadi.
 * Foydalanuvchi ID'si esa papkada qoladi — kerak bo'lganda "shu
 * odamning fayllari" ni topish uchun.
 */
function buildKey(userId: string, purpose: UploadPurpose, type: AllowedImageType): string {
  return `${folderFor(purpose)}/${userId}/${randomUUID()}.${extensionFor(type)}`;
}

export async function uploadImage(userId: string, purpose: UploadPurpose, data: Buffer): Promise<StoredFile> {
  if (data.length === 0) {
    throw new ValidationError("Fayl bo'sh.");
  }

  if (data.length > MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `Rasm juda katta (${formatFileSize(data.length)}). Chegara — ${formatFileSize(MAX_UPLOAD_BYTES)}.`,
    );
  }

  const type = detectImageType(data);

  if (!type) {
    throw new ValidationError('Faqat rasm yuklash mumkin (JPEG, PNG, WebP yoki GIF).');
  }

  const stored = await putObject(buildKey(userId, purpose, type), data, type);

  logger.info({ userId, purpose, key: stored.key, bytes: data.length }, 'Rasm yuklandi');

  return stored;
}

/** Rasmni o'chiradi (manzil bo'yicha). Begona manzil e'tiborsiz qoldiriladi. */
export async function deleteImageByUrl(url: string | null | undefined): Promise<void> {
  const key = keyFromUrl(url);

  if (!key) return;

  await deleteObject(key);
}
