'use client';

import { Copy, CornerUpLeft, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { canEditMessage, type MessageView } from '@/modules/chat/chat.types';

export interface MessageActionsProps {
  message: MessageView;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Xabar ustidagi amallar — pastdan chiqadigan varaq.
 *
 * ── Nima uchun VARAQ, kichik menyu emas ───────────────────────────────
 * Telefonda xabar puffagi yonida chiqadigan kichik menyu doim
 * noqulay: u ekran chetiga tiqilib qoladi, tugmalari mayda bo'ladi va
 * barmoq bilan noto'g'ri bosiladi.
 *
 * Pastdan chiqadigan varaq esa doim bir joyda, barmoq yetadigan
 * balandlikda turadi va tugmalari keng. WhatsApp va Telegram ham
 * telefonda aynan shunday qiladi.
 *
 * ── Nima uchun `<dialog>` ─────────────────────────────────────────────
 * Brauzerning o'z elementi fokusni ichida ushlaydi, Escape bilan
 * yopiladi va orqa fonni bloklaydi — bularning hammasini qo'lda
 * yozish kerak bo'lardi va har biri xato manbai bo'lardi.
 *
 * ── Nima uchun komponent FAQAT kerak bo'lganda chiziladi ─────────────
 * `open` xossasi yo'q: varaq ochilishi kerak bo'lgandagina DOM'ga
 * qo'yiladi. Shu sababli holatni tiklash uchun effekt ham kerak emas.
 */
export function MessageActions({ message, onReply, onEdit, onDelete, onClose }: MessageActionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  /**
   * Matnni nusxalaydi.
   *
   * ── Nima uchun xato YUTILADI ────────────────────────────────────────
   * `navigator.clipboard` HTTPS'siz muhitda va ba'zi brauzerlarda
   * umuman yo'q. Xato ko'rsatilsa, odam "chat buzildi" deb o'ylardi —
   * holbuki gap faqat nusxalashda.
   */
  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(message.body);
      setIsCopied(true);

      // Varaq darhol yopilsa, "nusxalandi" belgisi ko'rinmasdi.
      setTimeout(onClose, 600);
    } catch {
      onClose();
    }
  }

  const canCopy = message.body.length > 0 && !message.isDeleted;
  const canEdit = canEditMessage(message);
  const canDelete = message.isMine && !message.isDeleted;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      /**
       * Varaqning ORQASIGA bosilsa yopiladi.
       *
       * `<dialog>` da orqa fon (backdrop) elementning O'ZI hisoblanadi,
       * shuning uchun bosilgan joy varaqdan tashqarida ekani
       * tekshiriladi.
       */
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label="Xabar amallari"
      className="text-foreground mt-auto mb-0 w-full max-w-lg bg-transparent p-0 backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-sm"
    >
      <div
        className="glass animate-fade-up mx-3 mb-3 overflow-hidden rounded-2xl sm:mx-0"
        style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {canCopy && (
          <ActionRow icon={Copy} label={isCopied ? 'Nusxalandi' : 'Nusxalash'} onClick={() => void copy()} />
        )}

        {!message.isDeleted && <ActionRow icon={CornerUpLeft} label="Javob berish" onClick={onReply} />}

        {canEdit && <ActionRow icon={Pencil} label="Tahrirlash" onClick={onEdit} />}

        {canDelete && <ActionRow icon={Trash2} label="O'chirish" isDestructive onClick={onDelete} />}
      </div>

      <div className="mx-3 mb-3 sm:mx-0" style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button
          type="button"
          onClick={onClose}
          className="glass hover:bg-secondary/60 w-full rounded-2xl py-3.5 text-sm font-medium transition-colors"
        >
          Bekor qilish
        </button>
      </div>
    </dialog>
  );
}

interface ActionRowProps {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  label: string;
  isDestructive?: boolean;
  onClick: () => void;
}

/**
 * Bitta amal qatori.
 *
 * Balandligi 52px — barmoq uchun tavsiya etilgan eng kichik o'lchamdan
 * (44px) kattaroq, ya'ni yonidagi amalni bosib yuborish qiyin.
 */
function ActionRow({ icon: Icon, label, isDestructive = false, onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-border/60 hover:bg-secondary/60 flex w-full items-center gap-3 border-b px-5 py-3.5 text-left text-sm transition-colors last:border-b-0',
        isDestructive && 'text-destructive',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden={true} />
      {label}
    </button>
  );
}
