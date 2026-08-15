'use client';

import { ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { FEED_FEATURES } from '@/config/feed-nav';

export interface FeedMenuProps {
  onClose: () => void;
}

/**
 * Feed menyusi — bo'limning BARCHA imkoniyatlari bir joyda.
 *
 * ── Nima uchun bu kerak bo'ldi ────────────────────────────────────────
 * Feed bosqichma-bosqich o'sdi va imkoniyatlari ilova bo'ylab tarqalib
 * ketdi: saqlanganlar lentaning tepasidagi kichik belgida, statistika
 * profil menyusida, video oqimi boshqa belgida.
 *
 * Foydalanuvchi ularni ESLAB QOLISHI kerak edi — bu esa ishlamaydi.
 * Endi bitta tugma butun ro'yxatni ochadi va hech narsa yashirin
 * qolmaydi.
 */
export function FeedMenu({ onClose }: FeedMenuProps) {
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
        <h2 className="text-base font-semibold">Feed bo&apos;limlari</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <nav className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
        {FEED_FEATURES.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="hover:bg-secondary/50 flex items-center gap-3 px-4 py-3.5 transition-colors"
            >
              <span className="bg-secondary text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4.5" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground block truncate text-xs">{item.description}</span>
              </span>

              <ChevronRight className="text-muted-foreground size-4.5 shrink-0" aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </dialog>
  );
}
