'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { useMounted } from '@/hooks/use-mounted';

/** Och va to'q rejim o'rtasida almashtiruvchi tugma. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // Server va brauzer HTML'i mos kelishi uchun mount bo'lguncha bo'sh joy qoldiramiz.
  if (!mounted) {
    return <div className="size-11" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? "Och rejimga o'tish" : "To'q rejimga o'tish"}
      title={isDark ? 'Och rejim' : "To'q rejim"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
