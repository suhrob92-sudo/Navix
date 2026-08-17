'use client';

import { Check, Image as ImageIcon, Loader2, Scissors, Wifi, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { dialogCancelHandler } from '@/lib/dialog';
import { captureVideoFrames } from '@/lib/video-upload';
import { cn } from '@/lib/utils';
import {
  COVER_FRAME_COUNT,
  MIN_TRIM_SECONDS,
  clampTrim,
  coverFrameTimes,
  trimmedSeconds,
  type TrimRange,
} from '@/modules/feed/video-trim';
import { SHORT_VIDEO_SECONDS } from '@/modules/feed/feed.types';
import { VIDEO_WARN_BYTES, formatDuration, formatFileSize } from '@/modules/upload/upload.types';

/** Muharrirning natijasi — kompozitorga qaytadi. */
export interface VideoEdit {
  /**
   * Kesim — video KESILGAN bo'lsagina.
   *
   * Kesilmaganida `null`: "0 dan oxirigacha" degan yozuv hech narsa
   * qo'shmaydi, lekin bazada har bir videoda ikkita ortiqcha son
   * bo'lardi va "kesilganmi?" degan savolga javob berish
   * qiyinlashardi.
   */
  range: TrimRange | null;
  /** Tanlangan kadrdan yasalgan muqova. Olib bo'lmasa `null`. */
  poster: Blob | null;
  /** Kesilgandan keyingi davomiylik (soniya). */
  seconds: number;
}

export interface VideoEditorProps {
  file: File;
  /** Faylning to'liq uzunligi — kompozitor allaqachon o'lchagan. */
  duration: number;
  onDone: (edit: VideoEdit) => void;
  onCancel: () => void;
}

/**
 * Video muharriri — kesish va muqova tanlash.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * Telefonda olingan xom video deyarli har doim ortiqcha boshlanadi:
 * kamera yoqilgan payt, qo'l harakati, "boshladikmi?" degan savol.
 * Tomoshabin esa birinchi soniyada qaror qiladi — ketamanmi yoki
 * qolamanmi.
 *
 * Muqova ham xuddi shunday: birinchi kadr ko'pincha qora yoki
 * qiyshiq bo'ladi va u videoning eng yomon reklamasiga aylanadi.
 *
 * ── Nima uchun fayl QAYTA KODLANMAYDI ─────────────────────────────────
 * Haqiqiy kesish videoni qayta kodlashni talab qiladi. Brauzerda
 * buning ikki yo'li bor va ikkalasi ham telefon uchun yaroqsiz:
 * `ffmpeg.wasm` 30 MB yuklab olishni talab qiladi, `MediaRecorder`
 * esa real vaqtda ishlaydi (60 soniyalik video — 60 soniya kutish).
 *
 * Shuning uchun kesish BELGI sifatida saqlanadi va pleyer o'sha
 * oraliqda o'ynatadi. Tomoshabin uchun natija bir xil.
 *
 * ── Nima uchun MUSIQA yo'q ────────────────────────────────────────────
 * Musiqa litsenziya masalasi: qo'shiqni ruxsatsiz qo'shish
 * mualliflik huquqi da'volariga ochiq qoldiradi. U alohida
 * shartnoma bilan hal qilinadi va soxta tugma qo'yilmaydi.
 */
export function VideoEditor({ file, duration, onDone, onCancel }: VideoEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const objectUrl = useMemo(() => URL.createObjectURL(file), [file]);

  const [range, setRange] = useState<TrimRange>(() => clampTrim(0, duration, duration));

  /** Qaysi kadr muqova qilib tanlangan (kadrlar ro'yxatidagi o'rin). */
  const [coverIndex, setCoverIndex] = useState(0);

  const [frames, setFrames] = useState<(string | null)[]>([]);
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  /** Ob'yekt manzili oxirida BO'SHATILADI — aks holda xotira oqadi. */
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  /**
   * Kadrlar BIR MARTA olinadi — kesim bo'yicha emas, butun video
   * bo'yicha.
   *
   * ── Nima uchun surgich harakatlanganda qayta olinmaydi ──────────────
   * Har kadr alohida dekodlanadi va bu telefonda eng qimmat amal.
   * Surgich harakatlanayotganda qayta olsak, muharrir bir necha
   * soniyaga qotib qolardi.
   *
   * Butun video bo'yicha olingan kadrlar esa kesimdan qat'i nazar
   * to'g'ri qoladi: ular shunchaki "videoning turli joylari".
   */
  useEffect(() => {
    let isActive = true;

    const times = coverFrameTimes({ start: 0, end: duration }, COVER_FRAME_COUNT);

    void captureVideoFrames(file, times, { maxSide: 240, quality: 0.6 })
      .then((blobs) => {
        if (!isActive) return;

        setFrames(blobs.map((blob) => (blob ? URL.createObjectURL(blob) : null)));
      })
      .catch(() => {
        // Kadrlarsiz ham muharrirdan chiqish mumkin: kesish ishlaydi
        // va muqova birinchi kadrdan olinadi.
        if (isActive) setFrames([]);
      })
      .finally(() => {
        if (isActive) setIsLoadingFrames(false);
      });

    return () => {
      isActive = false;
    };
  }, [file, duration]);

  /** Ko'rib bo'lingan kadr manzillari ham bo'shatiladi. */
  useEffect(
    () => () => {
      for (const url of frames) {
        if (url) URL.revokeObjectURL(url);
      }
    },
    [frames],
  );

  /**
   * Ko'rib chiqish FAQAT kesim ichida o'ynaydi.
   *
   * ── Nima uchun bu shart ─────────────────────────────────────────────
   * Odam kesimni tanlaydi va darhol "shu to'g'rimi?" deb tekshirmoqchi
   * bo'ladi. Agar ko'rib chiqishda butun video o'ynasa, u kesish
   * ishlayotganiga ishonmasdi — natijani faqat joylagandan keyin
   * ko'rardi.
   */
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const onTimeUpdate = () => {
      if (element.currentTime >= range.end || element.currentTime < range.start - 0.25) {
        element.currentTime = range.start;
      }
    };

    element.addEventListener('timeupdate', onTimeUpdate);

    return () => element.removeEventListener('timeupdate', onTimeUpdate);
  }, [range]);

  /** Surgich qo'yib yuborilganda ko'rib chiqish boshiga qaytadi. */
  const seekToStart = useCallback((next: TrimRange) => {
    const element = videoRef.current;
    if (!element) return;

    element.currentTime = next.start;
  }, []);

  function updateStart(value: number) {
    const next = clampTrim(value, range.end, duration);

    setRange(next);
    seekToStart(next);
  }

  function updateEnd(value: number) {
    const next = clampTrim(range.start, value, duration);

    setRange(next);
    seekToStart(next);
  }

  const seconds = trimmedSeconds(range);
  const isTrimmed = range.start > 0 || range.end < duration;

  /**
   * Muqova to'liq o'lchamda QAYTA olinadi.
   *
   * ── Nima uchun ro'yxatdagi kadr ishlatilmaydi ───────────────────────
   * Ro'yxatdagi kadrlar 240 piksel: ular tirnoq sifatida yetarli,
   * lekin lentada muqova bo'lib turganda xiralashib ko'rinardi.
   */
  async function confirm() {
    setIsSaving(true);
    setError(null);

    try {
      const times = coverFrameTimes({ start: 0, end: duration }, COVER_FRAME_COUNT);
      const at = times[coverIndex] ?? range.start;

      const [poster] = await captureVideoFrames(file, [at]);

      onDone({ range: isTrimmed ? range : null, poster, seconds });
    } catch {
      /*
        Muqova olib bo'lmasa ham davom etiladi.

        Kesish — asosiy ish, muqova esa qulaylik. Uning tufayli
        butun tahrirni bekor qilish nomutanosib bo'lardi.
      */
      onDone({ range: isTrimmed ? range : null, poster: null, seconds });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onCancel)}
      className="glass animate-scale-in text-foreground m-auto max-h-[92vh] w-[calc(100%-1.5rem)] max-w-md overflow-y-auto rounded-2xl p-4 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Videoni tahrirlash</h2>

        <Button type="button" variant="ghost" size="icon" aria-label="Bekor qilish" onClick={onCancel}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Ko'rib chiqish — kesim ichida takrorlanadi. */}
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          src={objectUrl}
          muted
          autoPlay
          playsInline
          className="max-h-64 w-full object-contain"
          onLoadedMetadata={() => seekToStart(range)}
        />

        <span className="absolute right-2 bottom-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white tabular-nums">
          {formatDuration(seconds)}
        </span>
      </div>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {/* ── Kesish ──────────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Scissors className="size-4" aria-hidden="true" />
            Kesish
          </p>

          <p className="text-muted-foreground text-xs tabular-nums">
            {`${formatDuration(range.start)} — ${formatDuration(range.end)}`}
          </p>
        </div>

        {/*
          IKKITA alohida surgich.

          ── Nima uchun ikki uchli surgich emas ──────────────────────
          Ikki uchli surgichni brauzer o'zi bermaydi — uni barmoq
          hodisalaridan qo'lda yasash kerak bo'lardi. Bunday
          yasama boshqaruv ekranni o'qiydigan dasturlar uchun
          ko'rinmas bo'lib qoladi va telefonda "ushlash" nuqtasi
          juda kichik chiqadi.

          Ikkita oddiy surgich esa har joyda ishlaydi, klaviatura
          bilan ham boshqariladi va nomi ovoz bilan o'qiladi.
        */}
        <label className="text-muted-foreground block text-xs" htmlFor="trim-start">
          Boshlanishi
        </label>
        <input
          id="trim-start"
          type="range"
          min={0}
          max={Math.max(0, duration - MIN_TRIM_SECONDS)}
          step={duration > SHORT_VIDEO_SECONDS ? 1 : 0.1}
          value={range.start}
          disabled={isSaving}
          onChange={(event) => updateStart(Number(event.target.value))}
          className="accent-primary mt-1 w-full"
        />

        <label className="text-muted-foreground mt-2 block text-xs" htmlFor="trim-end">
          Tugashi
        </label>
        <input
          id="trim-end"
          type="range"
          min={Math.min(MIN_TRIM_SECONDS, duration)}
          max={duration}
          /*
            Uzun videoda qadam KATTAROQ.

            10 daqiqalik videoda 0.1 soniyalik qadam 6000 ta pog'ona
            degani: barmoq bilan aniq nuqtaga tushish imkonsiz
            bo'lardi.
          */
          step={duration > SHORT_VIDEO_SECONDS ? 1 : 0.1}
          value={range.end}
          disabled={isSaving}
          onChange={(event) => updateEnd(Number(event.target.value))}
          className="accent-primary mt-1 w-full"
        />

        {isTrimmed && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              const full = clampTrim(0, duration, duration);

              setRange(full);
              seekToStart(full);
            }}
            className="text-muted-foreground hover:text-foreground mt-2 text-xs font-medium transition-colors"
          >
            Kesishni bekor qilish
          </button>
        )}
      </div>

      {/* ── Muqova ──────────────────────────────────────────────── */}
      <div className="mt-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
          <ImageIcon className="size-4" aria-hidden="true" />
          Muqova
        </p>

        {isLoadingFrames ? (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Kadrlar tayyorlanmoqda…
          </div>
        ) : frames.length === 0 ? (
          /*
            Halol xabar.

            Ba'zi kodeklarni telefon brauzeri kadrlarga ajrata
            olmaydi. Bo'sh joy qoldirish o'rniga sabab aytiladi va
            nima bo'lishi ham aytiladi — video baribir joylanadi.
          */
          <p className="text-muted-foreground text-xs">
            Bu videodan kadr olib bo&apos;lmadi. Muqova birinchi kadrdan olinadi.
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Muqova kadri"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {frames.map((url, index) => (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={coverIndex === index}
                aria-label={`${index + 1}-kadr`}
                disabled={isSaving || url === null}
                onClick={() => setCoverIndex(index)}
                className={cn(
                  'relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                  coverIndex === index ? 'border-primary' : 'border-transparent opacity-70',
                  url === null && 'bg-secondary',
                )}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-muted-foreground flex size-full items-center justify-center text-xs">
                    —
                  </span>
                )}

                {coverIndex === index && (
                  <span className="bg-primary text-primary-foreground absolute right-1 bottom-1 rounded-full p-0.5">
                    <Check className="size-3" aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          fullWidth
          isLoading={isSaving}
          loadingText="Tayyorlanmoqda..."
          onClick={() => void confirm()}
        >
          Davom etish
        </Button>

        <Button type="button" variant="ghost" disabled={isSaving} onClick={onCancel}>
          Bekor
        </Button>
      </div>

      {/*
        Trafik ogohlantirishi — FAQAT katta faylda.

        ── Nima uchun kerak ─────────────────────────────────────────
        O'zbekistonda mobil trafik hali ham qimmat va cheklangan.
        150 MB lik videoni bilmasdan yuklab yuborgan odam oyning
        yarmida trafiksiz qolishi mumkin.

        Ogohlantirish TO'XTATMAYDI — faqat aytadi. Qaror odamniki.
      */}
      {file.size > VIDEO_WARN_BYTES && (
        <div className="border-border bg-secondary/40 mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5">
          <Wifi className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />

          <p className="text-muted-foreground text-xs leading-relaxed">
            {`Fayl hajmi ${formatFileSize(file.size)}. Wi-Fi ga ulanib yuklagan ma'qul — mobil trafik ko'p sarflanadi.`}
          </p>
        </div>
      )}

      {/*
        Cheklov HALOL aytiladi.

        Kesish belgini saqlaydi, faylni emas. Buni yashirsak, kimdir
        to'g'ridan-to'g'ri havola bilan butun videoni ko'rganda bu
        kutilmagan zarba bo'lardi.
      */}
      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Kesish tomoshabinga darhol qo&apos;llanadi. Fayl esa to&apos;liq saqlanadi — havolani
        bilgan odam butun videoni ocha oladi.
      </p>
    </dialog>
  );
}
