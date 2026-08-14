import { randomUUID } from 'node:crypto';

import { ValidationError } from '@/lib/api/errors';
import { logger } from '@/lib/logger';
import { deleteObject, putObject, type StoredFile } from '@/lib/storage';
import {
  extensionFor,
  formatFileSize,
  keyFromUrl,
  MAX_UPLOAD_BYTES,
  MAX_VIDEO_BYTES,
  type AllowedAudioType,
  type AllowedImageType,
  type AllowedUploadType,
  type AllowedVideoType,
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

/**
 * Fayl boshidagi baytlar bo'yicha OVOZ turini aniqlaydi.
 *
 * Rasmdagi kabi: brauzer aytgan turga ishonilmaydi, tur faylning
 * o'zidan o'qiladi.
 */
export function detectAudioType(data: Buffer): AllowedAudioType | null {
  if (data.length < 12) return null;

  /**
   * WebM (va Matroska) — EBML sarlavhasi: 1A 45 DF A3.
   *
   * Android va kompyuterdagi Chrome ovozni shu formatda yozadi.
   */
  if (data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) {
    return 'audio/webm';
  }

  // OGG: "OggS"
  if (data.toString('ascii', 0, 4) === 'OggS') {
    return 'audio/ogg';
  }

  /**
   * MP4 / M4A — 4-baytdan boshlab "ftyp".
   *
   * iPhone va Safari ovozni shu formatda yozadi.
   */
  if (data.toString('ascii', 4, 8) === 'ftyp') {
    return 'audio/mp4';
  }

  return null;
}

/** Maqsad bo'yicha papka nomi. */
function folderFor(purpose: UploadPurpose): string {
  if (purpose === 'AVATAR') return 'avatars';
  if (purpose === 'CHAT') return 'chat';
  if (purpose === 'VOICE') return 'voice';
  if (purpose === 'VIDEO') return 'videos';

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
function buildKey(userId: string, purpose: UploadPurpose, type: AllowedUploadType): string {
  return `${folderFor(purpose)}/${userId}/${randomUUID()}.${extensionFor(type)}`;
}

/**
 * Fayl boshidagi baytlar bo'yicha VIDEO turini aniqlaydi.
 *
 * Rasm va ovozdagi kabi: brauzer aytgan turga ishonilmaydi.
 */
export function detectVideoType(data: Buffer): AllowedVideoType | null {
  if (data.length < 12) return null;

  // WebM (Matroska) — EBML sarlavhasi: 1A 45 DF A3.
  if (data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) {
    return 'video/webm';
  }

  /**
   * MP4 va MOV — 4-baytdan boshlab "ftyp".
   *
   * Ikkalasi ham bir xil qobiqda (ISO BMFF), farqi undan keyingi
   * to'rt baytdagi "brend"da: MOV da "qt  ", MP4 da "isom", "mp42",
   * "avc1" va boshqalar.
   */
  if (data.toString('ascii', 4, 8) === 'ftyp') {
    return data.toString('ascii', 8, 12).startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }

  return null;
}

/**
 * Faylni yuklaydi.
 *
 * ── Nima uchun MAQSAD turni belgilaydi ───────────────────────────────
 * "Ovozli xabar" maqsadida rasm yuklab bo'lmaydi va aksincha. Aks
 * holda ovoz o'rniga rasm yuborilib, suhbatdoshda "tinglab
 * bo'lmaydigan ovozli xabar" paydo bo'lardi.
 */
export async function uploadFile(userId: string, purpose: UploadPurpose, data: Buffer): Promise<StoredFile> {
  if (data.length === 0) {
    throw new ValidationError("Fayl bo'sh.");
  }

  /**
   * Video uchun chegara BOSHQACHA.
   *
   * Rasm brauzerda kichraytiriladi va 5 MB dan oshmaydi. Videoni esa
   * brauzer kichraytira olmaydi — bir daqiqalik telefon videosi
   * odatda 15-25 MB.
   */
  const limit = purpose === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_UPLOAD_BYTES;

  if (data.length > limit) {
    throw new ValidationError(
      `Fayl juda katta (${formatFileSize(data.length)}). Chegara — ${formatFileSize(limit)}.`,
    );
  }

  const type: AllowedUploadType | null =
    purpose === 'VOICE'
      ? detectAudioType(data)
      : purpose === 'VIDEO'
        ? detectVideoType(data)
        : detectImageType(data);

  if (!type) {
    throw new ValidationError(
      purpose === 'VOICE'
        ? "Ovoz faylini o'qib bo'lmadi. Qaytadan yozib ko'ring."
        : purpose === 'VIDEO'
          ? "Video faylini o'qib bo'lmadi. MP4, MOV yoki WebM tanlang."
          : 'Faqat rasm yuklash mumkin (JPEG, PNG, WebP yoki GIF).',
    );
  }

  const stored = await putObject(buildKey(userId, purpose, type), data, type);

  logger.info({ userId, purpose, key: stored.key, bytes: data.length }, 'Fayl yuklandi');

  return stored;
}

/** Faylni o'chiradi (manzil bo'yicha). Begona manzil e'tiborsiz qoldiriladi. */
export async function deleteImageByUrl(url: string | null | undefined): Promise<void> {
  const key = keyFromUrl(url);

  if (!key) return;

  await deleteObject(key);
}
