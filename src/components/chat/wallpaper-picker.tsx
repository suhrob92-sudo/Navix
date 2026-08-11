'use client';

import { Check } from 'lucide-react';

import { CHAT_WALLPAPERS, type ChatWallpaperName } from '@/config/chat-wallpapers';
import { cn } from '@/lib/utils';

export interface WallpaperPickerProps {
  value: string;
  disabled?: boolean;
  onChange: (value: ChatWallpaperName) => void;
}

/**
 * Suhbat foni tanlash.
 *
 * ── Nima uchun ro'yxat emas, KO'RINISH ────────────────────────────────
 * Fonning nomi ("Nuqtalar", "Katak") hech narsa aytmaydi — odam uni
 * ko'rmaguncha tanlay olmaydi. Oddiy `<select>` bo'lsa, har bir
 * variantni tanlab, saqlab, suhbatni ochib ko'rishga to'g'ri kelardi.
 *
 * Shuning uchun har bir variant o'z naqshi bilan, ichida xabar
 * puffagi bilan ko'rsatiladi: tanlash bir qarashda bo'ladi.
 */
export function WallpaperPicker({ value, disabled = false, onChange }: WallpaperPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Suhbat foni"
      className="grid grid-cols-3 gap-3 sm:grid-cols-5"
    >
      {CHAT_WALLPAPERS.map((wallpaper) => {
        const isActive = wallpaper.value === value;

        return (
          <button
            key={wallpaper.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(wallpaper.value)}
            className={cn(
              'group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2 disabled:opacity-50',
            )}
          >
            {/*
              Kichik namuna — HAQIQIY fon sinflari bilan chiziladi.

              Alohida "namuna uchun" uslub yozilsa, u vaqt o'tib asl
              fondan farq qilib qolardi va tanlov yolg'on bo'lardi.
            */}
            <span
              className={cn(
                'border-border relative flex h-16 w-full items-end justify-end overflow-hidden rounded-xl border p-1.5 transition-shadow',
                wallpaper.className,
                isActive ? 'ring-primary ring-2 ring-offset-2 ring-offset-transparent' : 'group-hover:shadow-sm',
              )}
            >
              {/* Puffak — fon matn bilan qanday ko'rinishini ko'rsatadi. */}
              <span className="bg-primary h-3 w-8 rounded-full" />
              <span className="bg-secondary absolute bottom-6 left-1.5 h-3 w-10 rounded-full" />

              {isActive && (
                <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full">
                  <Check className="size-2.5" aria-hidden="true" />
                </span>
              )}
            </span>

            <span className={cn('mt-1.5 block text-xs', isActive ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {wallpaper.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
