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
 * Kadrni tasvirga tushiradi.
 *
 * ── Nima uchun o'lcham CHEGARALANADI ─────────────────────────────────
 * Muqova ekranda kichik ko'rinadi. 4K kadrni to'liq saqlash sekin
 * internetda video o'zidan ham uzoq yuklanardi.
 */
function drawFrame(element: HTMLVideoElement, maxSide: number, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxSide / Math.max(element.videoWidth, element.videoHeight, 1));

      canvas.width = Math.round(element.videoWidth * scale);
      canvas.height = Math.round(element.videoHeight * scale);

      const context = canvas.getContext('2d');

      if (!context || canvas.width === 0) {
        resolve(null);

        return;
      }

      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Videodan bir nechta kadrni KETMA-KET oladi.
 *
 * ── Nima uchun bitta element, har kadrga yangisi emas ────────────────
 * Har kadr uchun alohida `<video>` yaratish faylni qayta-qayta
 * dekodlashni anglatadi. Telefonda oltita dekodlash bir necha
 * soniya vaqt va sezilarli batareya degani.
 *
 * Bitta element bilan esa fayl bir marta ochiladi va faqat vaqt
 * suriladi.
 *
 * ── Nima uchun har kadr ALOHIDA kutiladi ─────────────────────────────
 * `currentTime` ni ketma-ket o'zgartirib yuborsak, brauzer oxirgi
 * so'rovdan boshqasini tashlab yuboradi va bizda bir xil oltita
 * kadr qolardi.
 *
 * Xato bo'lsa shu kadr `null` bo'ladi va qolganlari ishlayveradi:
 * muqova tanlash — qulaylik, u tufayli video joylashni to'xtatib
 * bo'lmaydi.
 */
export async function captureVideoFrames(
  file: File,
  times: number[],
  options: { maxSide?: number; quality?: number } = {},
): Promise<(Blob | null)[]> {
  const { maxSide = 720, quality = 0.8 } = options;

  const element = document.createElement('video');
  const objectUrl = URL.createObjectURL(file);

  element.preload = 'auto';
  element.muted = true;
  element.playsInline = true;
  element.src = objectUrl;

  /** Kadr chizishga tayyor bo'lguncha kutadi. */
  const seekTo = (seconds: number) =>
    new Promise<boolean>((resolve) => {
      let isDone = false;

      const finish = (ok: boolean) => {
        if (isDone) return;

        isDone = true;
        clearTimeout(timer);
        element.onseeked = null;
        element.onerror = null;
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);

      element.onseeked = () => finish(true);
      element.onerror = () => finish(false);

      element.currentTime = seconds;
    });

  try {
    const ready = await new Promise<boolean>((resolve) => {
      let isDone = false;

      const finish = (ok: boolean) => {
        if (isDone) return;

        isDone = true;
        clearTimeout(timer);
        resolve(ok);
      };

      const timer = setTimeout(() => finish(false), PROBE_TIMEOUT_MS);

      element.onloadeddata = () => finish(true);
      element.onerror = () => finish(false);
    });

    if (!ready) return times.map(() => null);

    const frames: (Blob | null)[] = [];

    for (const time of times) {
      const ok = await seekTo(time);

      frames.push(ok ? await drawFrame(element, maxSide, quality) : null);
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
    element.remove();
  }
}

/**
 * Videoning bitta kadridan muqova rasmi yasaydi.
 *
 * ── Nima uchun kerak ─────────────────────────────────────────────────
 * Muqovasiz ro'yxatda video yuklanmaguncha qora to'rtburchak turadi.
 * Sekin internetda bu bir necha soniya va lenta "buzuq" ko'rinadi.
 *
 * Xato bo'lsa `null` qaytadi: muqova — qulaylik, uning yo'qligi
 * video joylashni to'xtatmasligi kerak.
 *
 * @param atSeconds Qaysi kadr. Berilmasa — 0.1 soniya: birinchi kadr
 *                  ko'pincha qora bo'ladi (video ochilishi).
 */
export async function captureVideoPoster(file: File, atSeconds = 0.1): Promise<Blob | null> {
  const [frame] = await captureVideoFrames(file, [atSeconds]);

  return frame;
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
 * Faylni yuklashdan OLDIN tekshiradi.
 *
 * ── Nima uchun yuklashdan ajratilgan ─────────────────────────────────
 * Video muharriri yuklashdan oldin ochiladi: odam avval kesadi va
 * muqova tanlaydi, keyin fayl jo'natiladi.
 *
 * Ya'ni tekshiruv muharrirdan ham OLDIN bo'lishi kerak. Aks holda
 * odam ikki daqiqalik videoni bemalol tahrirlab, oxirida "juda
 * uzun" degan xatoni olardi — butun mehnati behuda ketardi.
 */
export async function prepareVideo(file: File): Promise<{ contentType: AllowedVideoType; meta: VideoMeta }> {
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

  return { contentType, meta };
}

export interface UploadVideoOptions {
  /**
   * Muharrirda tanlangan muqova.
   *
   * Berilmasa, birinchi kadrdan avtomatik olinadi — eski xatti-harakat
   * saqlanadi, ya'ni muharrirsiz yo'l ham ishlaydi.
   */
  poster?: Blob | null;
  /** Kesilgandan keyingi davomiylik. Berilmasa faylning to'liq uzunligi. */
  seconds?: number;
}

/**
 * Videoni (va muqovasini) yuklaydi.
 *
 * @param accessToken Kirish tokeni — to'g'ridan-to'g'ri yuklashda
 *                    ruxsat so'rash uchun ham kerak.
 */
export async function uploadVideo(
  file: File,
  accessToken: string | null,
  options: UploadVideoOptions = {},
): Promise<UploadedVideo> {
  const { contentType, meta } = await prepareVideo(file);

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
    /*
      Muharrirda tanlangan muqova ustun.

      U yo'q bo'lsagina birinchi kadrdan olinadi: muallif aynan
      qaysi kadrni ko'rsatmoqchi bo'lganini biladi, tizim esa
      faqat taxmin qila oladi.
    */
    const poster = options.poster ?? (await captureVideoPoster(file));

    if (poster) {
      posterUrl = await uploadThroughServer(poster, 'POST', accessToken, 'poster.jpg');
    }
  } catch {
    // Muqova — qulaylik. Usiz ham video joylanadi.
  }

  return { videoUrl, posterUrl, seconds: options.seconds ?? meta.seconds };
}
