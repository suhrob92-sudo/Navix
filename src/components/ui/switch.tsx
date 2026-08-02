'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}

/**
 * Yoqish / o'chirish tugmasi.
 *
 * `role="switch"` berilgan — ekran o'quvchi buni "yoqilgan/o'chirilgan"
 * deb o'qiydi, oddiy tugma deb emas.
 */
export function Switch({ id, checked, onCheckedChange, disabled = false, label, description }: SwitchProps) {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={switchId} className="block cursor-pointer text-sm font-medium">
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'focus-visible:ring-ring focus-visible:ring-offset-background relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span
          className={cn(
            'bg-background pointer-events-none inline-block size-5 rounded-full shadow-sm transition-transform',
            checked ? 'translate-x-5.5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
