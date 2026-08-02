/* eslint-disable @next/next/no-img-element */
'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Foydalanuvchi rasmi.
 *
 * Rasm bo'lmasa yoki yuklanmasa — ism harflari ko'rsatiladi.
 * `next/image` ishlatilmadi, chunki avatar manzili har qanday tashqi
 * saytdan kelishi mumkin va uni oldindan sozlab bo'lmaydi.
 */

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
  xl: 'size-24 text-2xl',
} as const;

export interface AvatarProps {
  src?: string | null;
  /** To'liq ism — bosh harflarni hisoblash uchun. */
  name?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/** Ismdan bosh harflarni oladi: "Ali Valiyev" → "AV". */
function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';

  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word.charAt(0).toUpperCase()).join('');
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [hasFailed, setHasFailed] = React.useState(false);

  const showImage = Boolean(src) && !hasFailed;

  return (
    <span
      className={cn(
        'from-primary to-accent text-primary-foreground inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold select-none',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={src ?? ''}
          alt={name ?? 'Foydalanuvchi rasmi'}
          className="size-full object-cover"
          onError={() => setHasFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}
