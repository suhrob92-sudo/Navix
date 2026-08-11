/* eslint-disable @next/next/no-img-element */
'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { useId, useRef } from 'react';

import { cn } from '@/lib/utils';

export interface ImageAttachProps {
  /** Yuklangan rasm manzili. `null` — rasm tanlanmagan. */
  value: string | null;
  isUploading: boolean;
  disabled?: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  className?: string;
}

/**
 * Rasm biriktirish tugmasi va ko'rinishi.
 *
 * ── Nima uchun `next/image` EMAS ──────────────────────────────────────
 * Rasm manzili ikki xil bo'lishi mumkin: mahalliy (`/api/v1/files/...`)
 * yoki Vercel Blob domenidan. Blob domeni har bir loyihada boshqacha va
 * uni `next.config.ts` ga oldindan yozib qo'yib bo'lmaydi — noto'g'ri
 * yozilsa rasm UMUMAN ochilmasdi.
 *
 * Avatar ham xuddi shu sababdan oddiy `<img>` ishlatadi.
 */
export function ImageAttach({
  value,
  isUploading,
  disabled = false,
  onSelect,
  onRemove,
  className,
}: ImageAttachProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        /*
          `accept` telefonda darhol galereyani ochadi — odam fayl
          menejeridan rasm izlab yurmaydi.
        */
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          /*
            Maydon TOZALANADI: aks holda bir xil faylni ikkinchi marta
            tanlaganda `change` hodisasi umuman ishlamasdi.
          */
          event.target.value = '';

          if (file) onSelect(file);
        }}
      />

      {value ? (
        <span className="border-border relative inline-block size-16 overflow-hidden rounded-xl border">
          <img src={value} alt="Biriktirilgan rasm" className="size-full object-cover" />

          <button
            type="button"
            aria-label="Rasmni olib tashlash"
            disabled={disabled}
            onClick={onRemove}
            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80 disabled:opacity-60"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          aria-label="Rasm biriktirish"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex size-10 items-center justify-center rounded-full transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
