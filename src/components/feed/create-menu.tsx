'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { CREATE_CHOICES, type CreateChoice } from '@/config/feed-nav';

export interface CreateMenuProps {
  onPick: (choice: CreateChoice['id']) => void;
  onClose: () => void;
}

/**
 * "Nima joylaysiz?" — yaratish tanlovi.
 *
 * ── Nima uchun COMPOSER doim ochiq turmaydi ───────────────────────────
 * Ilgari post yozish maydoni lentaning tepasida DOIM ochiq turardi.
 * U ekranning uchdan birini egallardi va odam lentani ko'rish uchun
 * har safar undan pastga surishga majbur bo'lardi.
 *
 * Aslida odam lentaga KO'RISH uchun kiradi, yozish uchun emas: yozish
 * kuniga bir marta bo'lsa, ko'rish o'nlab marta.
 *
 * Shuning uchun yozish maydoni tugma ostiga olindi. Tugma esa doim
 * ko'rinib turadi — u yashirilmadi, faqat joyi o'zgardi.
 */
export function CreateMenu({ onPick, onClose }: CreateMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="text-foreground bg-card animate-fade-up mt-auto mb-0 w-full max-w-lg rounded-t-2xl p-5 backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Nima joylaysiz?</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-2">
        {CREATE_CHOICES.map((choice) => {
          const Icon = choice.icon;

          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onPick(choice.id)}
              className="border-border hover:bg-secondary flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors"
            >
              <span className="bg-secondary text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{choice.label}</span>
                <span className="text-muted-foreground block text-xs">{choice.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </dialog>
  );
}
