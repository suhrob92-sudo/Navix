'use client';

import { REACTIONS } from '@/config/reactions';
import { cn } from '@/lib/utils';

export interface ReactionBarProps {
  /** Ayni paytda qo'yilgan emoji — ajratib ko'rsatiladi. */
  current: string | null;
  onPick: (emoji: string) => void;
}

/**
 * Emoji tanlash qatori — amallar varag'ining tepasida.
 *
 * ── Nima uchun VARAQ tepasida ─────────────────────────────────────────
 * Reaksiya — amallar orasida eng tez-tez ishlatiladigani. U ro'yxatning
 * ichida oddiy qator bo'lib tursa, uni bosish uchun avval "Reaksiya"
 * ni, keyin emojini bosish kerak bo'lardi — ya'ni ikki bosish.
 *
 * Tepada gorizontal qator qilib qo'yilganda esa bitta bosish yetadi.
 * WhatsApp ham, Telegram ham aynan shunday qiladi.
 */
export function ReactionBar({ current, onPick }: ReactionBarProps) {
  return (
    <div className="border-border/60 flex items-center justify-between gap-1 border-b px-3 py-2.5">
      {REACTIONS.map((reaction) => {
        const isActive = reaction.emoji === current;

        return (
          <button
            key={reaction.emoji}
            type="button"
            onClick={() => onPick(reaction.emoji)}
            aria-label={reaction.label}
            aria-pressed={isActive}
            className={cn(
              /*
                O'lcham 44px — barmoq uchun tavsiya etilgan eng kichik
                nishon. Kichikroq bo'lsa, yonidagi emoji bosilib
                ketardi va odam noto'g'ri reaksiya qo'yardi.
              */
              'flex size-11 items-center justify-center rounded-full text-2xl transition-transform',
              'hover:bg-secondary/60 active:scale-90',
              isActive && 'bg-primary/15 ring-primary/40 ring-2',
            )}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
