'use client';

import { Send, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDuration, MAX_VOICE_SECONDS } from '@/modules/upload/upload.types';

export interface VoiceRecorderBarProps {
  seconds: number;
  isSending: boolean;
  onCancel: () => void;
  onSend: () => void;
}

/**
 * Yozib olish paytidagi panel.
 *
 * ── Nima uchun yozish maydonini ALMASHTIRADI ─────────────────────────
 * Yozish davomida matn yozib bo'lmaydi va boshqa tugmalar ham
 * kerak emas. Ular joyida qolsa, odam tasodifan bosib, yozuvni
 * yo'qotib qo'yardi.
 *
 * Shu payt faqat uchta narsa kerak: qancha vaqt o'tgani, bekor qilish
 * va yuborish.
 */
export function VoiceRecorderBar({ seconds, isSending, onCancel, onSend }: VoiceRecorderBarProps) {
  const isNearLimit = seconds >= MAX_VOICE_SECONDS - 15;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSending}
        aria-label="Yozuvni bekor qilish"
        className="text-muted-foreground hover:text-destructive flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-60"
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/*
          Qizil nuqta — yozuv KETAYOTGANINING yagona ishonchli belgisi.
          Usiz odam yozish boshlanganini bilmasdi.
        */}
        <span className="bg-destructive size-2.5 shrink-0 animate-pulse rounded-full" aria-hidden="true" />

        <span
          className={cn('text-sm tabular-nums', isNearLimit ? 'text-destructive font-medium' : 'text-foreground')}
          // Ekran o'quvchisi uchun: har soniyada emas, holat o'zgarganda o'qiladi.
          aria-live="off"
        >
          {formatDuration(seconds)}
        </span>

        <span className="text-muted-foreground truncate text-xs">
          {isNearLimit ? `Chegara ${formatDuration(MAX_VOICE_SECONDS)}` : 'Yozilmoqda...'}
        </span>
      </div>

      <button
        type="button"
        onClick={onSend}
        disabled={isSending}
        aria-label="Ovozli xabarni yuborish"
        className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full transition-[filter] hover:brightness-110 disabled:opacity-60"
      >
        <Send className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
