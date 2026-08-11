'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { formatDuration } from '@/modules/upload/upload.types';

export interface VoicePlayerProps {
  url: string;
  /** Bazadagi davomiylik — fayl yuklanmasdan oldin ko'rsatiladi. */
  seconds: number;
  /** O'z xabarim (ko'k puffak ichida) — ranglar boshqacha. */
  isMine: boolean;
}

/**
 * Ovozli xabarni tinglash.
 *
 * ── Nima uchun `<audio controls>` EMAS ────────────────────────────────
 * Brauzerning o'z o'yinchisi har qurilmada boshqacha ko'rinadi, kenglik
 * bo'yicha sozlanmaydi va puffak ichida xunuk turadi. Bundan tashqari
 * uning tugmalari juda mayda — telefonda bosish qiyin.
 *
 * Bu yerdagi o'yinchi esa faqat kerakli narsani ko'rsatadi: tugma,
 * chiziq va vaqt.
 */
export function VoicePlayer({ url, seconds, isMine }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  /**
   * Ijro holati AUDIO ELEMENTIDAN o'qiladi.
   *
   * ── Nima uchun o'z holatimizga ishonmaymiz ──────────────────────────
   * Ovoz o'z-o'zidan to'xtashi mumkin: tugadi, tarmoq uzildi, boshqa
   * ilova ovozni egalladi. Bunday holatda tugma "pauza" bo'lib
   * qolib, bosilganda hech narsa qilmasdi.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setPosition(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      // Tugagach boshiga qaytadi — qayta tinglash uchun qulay.
      setPosition(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }

  const total = Math.max(1, seconds);
  const progress = Math.min(100, (position / total) * 100);

  return (
    <div className="flex min-w-[11rem] items-center gap-3">
      {/*
        `preload="none"` — fayl FAQAT bosilganda yuklanadi.

        Suhbatda o'nlab ovozli xabar bo'lishi mumkin. Hammasi oldindan
        yuklansa, odam bittasini ham tinglamasdan turib bir necha
        megabayt trafik sarflardi.
      */}
      <audio ref={audioRef} src={url} preload="none" />

      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? "To'xtatish" : 'Tinglash'}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full transition-colors',
          isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-primary text-primary-foreground hover:brightness-110',
        )}
      >
        {isPlaying ? (
          <Pause className="size-4 fill-current" aria-hidden="true" />
        ) : (
          // Chapga surilgan: uchburchak markazda ko'rinishi uchun.
          <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className={cn('h-1 w-full overflow-hidden rounded-full', isMine ? 'bg-white/25' : 'bg-border')}>
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-200',
              isMine ? 'bg-white' : 'bg-primary',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p
          className={cn('mt-1 text-[0.6875rem] tabular-nums', isMine ? 'text-white/70' : 'text-muted-foreground')}
        >
          {/* Ijro davomida qolgan emas, O'TGAN vaqt ko'rsatiladi. */}
          {isPlaying || position > 0 ? formatDuration(position) : formatDuration(seconds)}
        </p>
      </div>
    </div>
  );
}
