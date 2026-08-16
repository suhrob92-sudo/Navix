'use client';

import { upload } from '@vercel/blob/client';

import {
  ALLOWED_VIDEO_TYPES,
  MAX_SERVER_BODY_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  VIDEO_UPLOAD_PATH,
  formatFileSize,
  type AllowedVideoType,
  type UploadResponse,
} from '@/modules/upload/upload.types';

/**
 * Video yuklash — brauzer tomoni.
 *
 * ── Nima uchun IKKI yo'l ──────────────────────────────────────────────
 * Production'da (Vercel) fayl to'g'ridan-to'g'ri omborga boradi:
 * serversiz funksiyaga kelgan so'rov tanasi 4.5 MB bilan cheklangan
 * va 20 MB lik video u orqali sig'maydi.
 *
 * Ishlab chiqishda esa ombor kaliti bo'lmasligi mumkin — u yerda
 * fayl oddiy yuklash manzili orqali ketadi va mahalliy papkaga
 * yoziladi. Bu cheklov Vercel platformasiniki, mahalliy serverning
 * emas.
 *
 * Qaysi yo'l ishlashini SERVER aytadi: brauzer taxmin qilmaydi.
 */

/** Videoning brauzerdan o'lchangan xossalari. */
export interface VideoMeta {
  seconds: number;
  width: number;
  height: number;
}

/**
 * Brauzer javobini qancha kutamiz (millisekund).
 *
 * ── Nima uchun bu KERAK ──────────────────────────────────────────────
 * ── HAQIQIY XATO, foydalanuvchi topgan ──────────────────────────────
 * Ba'zi telefonlarda (ayniqsa Android'dagi ba'zi kodeklar) video
 * elementi `loadedmetadata` ham, `error` ham chiqarmaydi — u shunchaki
 * JIM qoladi.
 *
 * Natijada va'da (Promise) hech qachon tugamasdi va ekranda
 * "Yuklanmoqda…" ABADIY turardi: odam video joylay olmasdi va
 * nima bo'lganini ham bilmasdi.
 *
 * Kutish muddati bilan esa u aniq xato oladi va boshqa fayl
 * tanlashi mumkin.
 */
const PROBE_TIMEOUT_MS = 15_000;

/**
 * Fayl nomidan tur aniqlaydi.
 *
 * ── Nima uchun kerak ─────────────────────────────────────────────────
 * Ba'zi telefonlarda fayl tanlagichi turni BO'SH qoldiradi
 * (`file.type === ''`) yoki `application/octet-stream` deb yuboradi.
 * Bunday fayl omborga yuborilganda "tur ruxsat etilmagan" xatosi
 * bilan qaytarilardi — garchi videoning o'zi to'g'ri bo'lsa ham.
 */
function guessVideoType(file: File): AllowedVideoType | null {
  const type = file.type.toLowerCase();

  if ((ALLOWED_VIDEO_TYPES as readonly string[]).includes(type)) {
    return type as AllowedVideoType;
  }

  const extension = file.name.toLowerCase().split('.').pop() ?? '';

  if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
  if (extension === 'webm') return 'video/webm';
  if (extension === 'mov' || extension === 'qt') return 'video/quicktime';

  return null;
}

/** Turga mos kengaytma — ombordagi fayl nomi uchun. */
function extensionFor(type: AllowedVideoType): string {
  if (type === 'video/webm') return 'webm';
  if (type === 'video/quicktime') return 'mov';

  return 'mp4';
}

/**
 * Videoning davomiyligi va o'lchamini o'qiydi.
 *
 * ── Nima uchun yuklashdan OLDIN ──────────────────────────────────────
 * Ikki daqiqalik videoni 30 soniya yuklab, keyin "juda uzun" deyish —
 * mobil internetda bekorga sarflangan trafik va vaqt. Bu tekshiruv
 * darhol javob beradi.
 */
export function readVideoMeta(file: File): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const element = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    let isDone = false;

    const cleanUp = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      element.remove();
    };

    const fail = (message: string) => {
      if (isDone) return;

      isDone = true;
      cleanUp();
      reject(new Error(message));
    };

    /** Brauzer jim qolsa — kutib qolmaymiz. */
    const timer = setTimeout(
      () => fail("Bu videoni telefoningiz brauzeri o'qiy olmadi. MP4 formatdagi boshqa fayl tanlang."),
      PROBE_TIMEOUT_MS,
    );

    element.preload = 'metadata';
    element.muted = true;

    element.onloadedmetadata = () => {
      if (isDone) return;

      const meta = {
        seconds: Math.round(element.duration),
        width: element.videoWidth,
        height: element.videoHeight,
      };

      // Ba'zi fayllarda davomiylik `Infinity` bo'lib keladi (oqim
      // sifatida yozilgan video). Bunday faylni o'lchab bo'lmaydi.
      if (!Number.isFinite(meta.seconds) || meta.seconds <= 0) {
        fail("Video davomiyligini aniqlab bo'lmadi. Boshqa fayl tanlang.");

        return;
      }

      isDone = true;
      cleanUp();
      resolve(meta);
    };

    element.onerror = () => fail("Videoni o'qib bo'lmadi. MP4, MOV yoki WebM tanlang.");

    element.src = objectUrl;
  });
}

/**
 * Videoning birinchi kadridan muqova rasmi yasaydi.
 *
 * ── Nima uchun kerak ─────────────────────────────────────────────────
 * Muqovasiz ro'yxatda video yuklanmaguncha qora to'rtburchak turadi.
 * Sekin internetda bu bir necha soniya va lenta "buzuq" ko'rinadi.
 *
 * Xato bo'lsa `null` qaytadi: muqova — qulaylik, uning yo'qligi
 * video joylashni to'xtatmasligi kerak.
 */
export function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const element = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    let isDone = false;

    const finish = (result: Blob | null) => {
      if (isDone) return;

      isDone = true;
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      element.remove();
      resolve(result);
    };

    /**
     * Muqova olish ham JIM qolishi mumkin.
     *
     * Bu yerda xato tashlanmaydi — muqovasiz ham video joylanadi.
     * Muhimi: kutish to'xtatiladi va yuklash davom etadi.
     */
    const timer = setTimeout(() => finish(null), PROBE_TIMEOUT_MS);

    element.preload = 'metadata';
    element.muted = true;
    element.playsInline = true;

    element.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');

        // Muqova ekranda kichik ko'rinadi — to'liq o'lcham keraksiz
        // trafik bo'lardi.
        const scale = Math.min(1, 720 / Math.max(element.videoWidth, element.videoHeight, 1));

        canvas.width = Math.round(element.videoWidth * scale);
        canvas.height = Math.round(element.videoHeight * scale);

        const context = canvas.getContext('2d');

        if (!context || canvas.width === 0) {
          finish(null);

          return;
        }

        context.drawImage(element, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.8);
      } catch {
        finish(null);
      }
    };

    element.onerror = () => finish(null);

    element.src = objectUrl;
    /**
     * Birinchi kadr ko'pincha qora bo'ladi (fade-in). Shuning uchun
     * 0.1 soniyaga suriladi — bu deyarli har doim mazmunli kadr
     * beradi.
     */
    element.currentTime = 0.1;
  });
}

/** Faylni oddiy yuklash manzili orqali yuboradi (ishlab chiqish yo'li). */
async function uploadThroughServer(
  file: Blob,
  purpose: 'VIDEO' | 'POST',
  accessToken: string | null,
  fileName: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', file, fileName);
  form.append('purpose', purpose);

  const response = await fetch('/api/v1/uploads', {
    method: 'POST',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    body: form,
  });

  const body = (await response.json()) as { data?: UploadResponse; error?: { message?: string } };

  if (!response.ok || !body.data) {
    throw new Error(body.error?.message ?? "Faylni yuklab bo'lmadi.");
  }

  return body.data.url;
}

export interface UploadedVideo {
  videoUrl: string;
  posterUrl: string | null;
  seconds: number;
}

/**
 * Videoni (va muqovasini) yuklaydi.
 *
 * @param accessToken Kirish tokeni — to'g'ridan-to'g'ri yuklashda
 *                    ruxsat so'rash uchun ham kerak.
 */
export async function uploadVideo(file: File, accessToken: string | null): Promise<UploadedVideo> {
  /**
   * Tur ENG BOSHIDA tekshiriladi.
   *
   * Aks holda odam 40 MB videoni yuklab, oxirida "tur ruxsat
   * etilmagan" xatosini olardi — ya'ni mobil trafik bekorga
   * sarflanardi.
   */
  const contentType = guessVideoType(file);

  if (!contentType) {
    throw new Error(
      `Bu format qo'llab-quvvatlanmaydi (${file.type || file.name}). MP4, MOV yoki WebM tanlang.`,
    );
  }

  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video juda katta (${formatFileSize(file.size)}). Chegara — ${formatFileSize(MAX_VIDEO_BYTES)}. ` +
        'Videoni qisqartiring yoki sifatini pasaytiring.',
    );
  }

  const meta = await readVideoMeta(file);

  if (meta.seconds > MAX_VIDEO_SECONDS) {
    throw new Error(
      `Video ${MAX_VIDEO_SECONDS} soniyadan uzun bo'lmasligi kerak (hozir ${meta.seconds} s). ` +
        'Telefon galereyasida qirqib, qaytadan tanlang.',
    );
  }

  const modeResponse = await fetch(VIDEO_UPLOAD_PATH, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });

  const modeBody = (await modeResponse.json().catch(() => null)) as { data?: { mode?: string } } | null;
  const mode = modeBody?.data?.mode === 'CLIENT' ? 'CLIENT' : 'SERVER';

  let videoUrl: string;

  if (mode === 'CLIENT') {
    const result = await upload(`videos/${crypto.randomUUID()}.${extensionFor(contentType)}`, file, {
      access: 'public',
      handleUploadUrl: VIDEO_UPLOAD_PATH,
      /**
       * Tur FAYLDAN emas, ANIQLANGANIDAN olinadi.
       *
       * Ba'zi telefonlarda `file.type` bo'sh keladi va ombor
       * "tur ruxsat etilmagan" deb rad etardi.
       */
      contentType,
      /**
       * Katta fayl bo'laklarga bo'lib yuboriladi.
       *
       * Mobil internet uzilib qolsa, butun 20 MB ni boshidan
       * yuborish o'rniga faqat yiqilgan bo'lak qayta yuboriladi.
       */
      multipart: true,
    });

    videoUrl = result.url;
  } else {
    /**
     * Server orqali yuborishda 4.5 MB chegarasi bor.
     *
     * ── Nima uchun oldindan tekshiriladi ────────────────────────────
     * Aks holda 30 MB lik fayl to'liq yuborilib, oxirida tushunarsiz
     * "413" xatosi bilan qaytarilardi. Odam esa nima bo'lganini
     * bilmasdi va qayta-qayta urinardi.
     */
    if (file.size > MAX_SERVER_BODY_BYTES) {
      throw new Error(
        `Fayl ombori sozlanmagan, shuning uchun video ${formatFileSize(MAX_SERVER_BODY_BYTES)} dan ` +
          'katta bo\'la olmaydi. Administratorga xabar bering.',
      );
    }

    videoUrl = await uploadThroughServer(file, 'VIDEO', accessToken, file.name);
  }

  /**
   * Muqova HAR DOIM server orqali ketadi.
   *
   * U kichik rasm (~50 KB) va 4.5 MB cheklovidan ancha past. Ikkinchi
   * yo'lni yasashning ma'nosi yo'q.
   */
  let posterUrl: string | null = null;

  try {
    const poster = await captureVideoPoster(file);

    if (poster) {
      posterUrl = await uploadThroughServer(poster, 'POST', accessToken, 'poster.jpg');
    }
  } catch {
    // Muqova — qulaylik. Usiz ham video joylanadi.
  }

  return { videoUrl, posterUrl, seconds: meta.seconds };
}
