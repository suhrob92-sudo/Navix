'use client';

import { Camera, X } from 'lucide-react';
import { useRef } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { useFileUpload } from '@/hooks/use-file-upload';

export interface GroupImagePickerProps {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Bosh harflarni hisoblash uchun — rasm tanlanmaganda ko'rinadi. */
  name: string;
  disabled?: boolean;
  /** Yuklash holatini tashqariga chiqarish (tugmani bloklash uchun). */
  onUploadingChange?: (isUploading: boolean) => void;
}

/**
 * Guruh rasmini tanlash — dumaloq avatar va ustidagi kamera tugmasi.
 *
 * ── Nima uchun ALOHIDA komponent ──────────────────────────────────────
 * U guruh yaratishda ham, keyin ma'lumotni tahrirlashda ham kerak.
 * Ikkalasida ham bir xil ishlashi shart: bir xil fayl turlari, bir xil
 * xato matni, bir xil "olib tashlash" xatti-harakati.
 */
export function GroupImagePicker({
  value,
  onChange,
  name,
  disabled = false,
  onUploadingChange,
}: GroupImagePickerProps) {
  const upload = useFileUpload('AVATAR');
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file: File): Promise<void> {
    onUploadingChange?.(true);

    const url = await upload.upload(file);

    onUploadingChange?.(false);

    if (url) onChange(url);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar src={value} name={name || 'Guruh'} size="xl" />

        <button
          type="button"
          disabled={disabled || upload.isUploading}
          onClick={() => inputRef.current?.click()}
          className="bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full ring-4 transition-opacity disabled:opacity-50"
          aria-label={value ? 'Guruh rasmini almashtirish' : 'Guruh rasmini tanlash'}
        >
          <Camera className="size-4" aria-hidden="true" />
        </button>

        {/*
          Fayl maydoni YASHIRIN: brauzerning o'z tugmasi har qurilmada
          boshqacha ko'rinadi va uslubga moslab bo'lmaydi.
        */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            // Bir xil faylni ikkinchi marta tanlash uchun maydon tozalanadi.
            event.target.value = '';

            if (file) void pick(file);
          }}
        />
      </div>

      {upload.isUploading && <p className="text-muted-foreground text-xs">Yuklanmoqda...</p>}

      {upload.error && <p className="text-destructive text-xs">{upload.error}</p>}

      {value && !upload.isUploading && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="text-muted-foreground hover:text-foreground tap-target-y inline-flex items-center gap-1 text-xs transition-colors"
        >
          <X className="size-3.5" aria-hidden="true" />
          Rasmni olib tashlash
        </button>
      )}
    </div>
  );
}
