'use client';

import { reactionLabel } from '@/config/reactions';
import { cn } from '@/lib/utils';
import type { MessageReactionView } from '@/modules/chat/chat.types';

export interface ReactionChipsProps {
  reactions: MessageReactionView[];
  /** O'z xabarim (ko'k puffak) — ranglar boshqacha. */
  isMine: boolean;
  onToggle: (emoji: string) => void;
}

/**
 * Xabar ostidagi reaksiya nishonlari.
 *
 * ── Nima uchun puffakning ICHIDA emas ─────────────────────────────────
 * Ichkarida bo'lsa, puffak har reaksiyada kengayib, suhbat "sakrab"
 * turardi. Bundan tashqari uzun matnli xabarda nishonlar matn bilan
 * qo'shilib ketardi.
 *
 * ── Nima uchun nishonni BOSISH mumkin ─────────────────────────────────
 * Suhbatdosh qo'ygan reaksiyaga qo'shilish — eng tabiiy harakat.
 * Uzoq bosib, varaqdan tanlashga majburlash ortiqcha to'siq bo'lardi.
 */
export function ReactionChips({ reactions, isMine, onToggle }: ReactionChipsProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={cn('mt-1 flex flex-wrap gap-1', isMine ? 'justify-end' : 'justify-start')}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          aria-pressed={reaction.isMine}
          aria-label={
            reaction.isMine
              ? `${reactionLabel(reaction.emoji)} — sizniki ham. Olib tashlash`
              : `${reactionLabel(reaction.emoji)}: ${reaction.count} ta. Qo'shilish`
          }
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors active:scale-95',
            reaction.isMine
              ? 'border-primary/50 bg-primary/15 text-foreground'
              : 'border-border bg-card/80 text-muted-foreground hover:bg-secondary/60',
          )}
        >
          <span aria-hidden="true">{reaction.emoji}</span>
          {/*
            Sanoq faqat BIRDAN ko'p bo'lsa ko'rsatiladi.

            Suhbatda ikki kishi bor: "1" raqami hech qanday yangi
            ma'lumot bermaydi va nishonni bekorga kengaytiradi.
          */}
          {reaction.count > 1 && <span className="tabular-nums">{reaction.count}</span>}
        </button>
      ))}
    </div>
  );
}
