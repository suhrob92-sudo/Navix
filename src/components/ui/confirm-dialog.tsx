'use client';

import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Xavfli amal (o'chirish) — tugma qizil bo'ladi. */
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Tasdiqlash oynasi — qaytarib bo'lmaydigan amallar uchun.
 *
 * Brauzerning o'z `<dialog>` elementi ustiga qurilgan. Bu bepul beradi:
 *  - fokusni oyna ichida ushlab turish (focus trap);
 *  - Escape tugmasi bilan yopish;
 *  - orqa fonni bloklash.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      // Escape bosilganda holatni ham yangilash kerak.
      onCancel={(event) => {
        event.preventDefault();
        if (!isLoading) onCancel();
      }}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-6 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{description}</p>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={isDestructive ? 'destructive' : 'primary'}
          onClick={onConfirm}
          isLoading={isLoading}
          loadingText="Bajarilmoqda..."
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
