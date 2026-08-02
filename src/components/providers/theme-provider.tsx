'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type * as React from 'react';

/**
 * Mavzu (dark / light) provayderi.
 *
 * `next-themes` tanlangan mavzuni brauzer xotirasida saqlaydi va sahifa
 * yuklanishidan oldin `<html>` ga `.dark` klassini qo'yadi — shuning uchun
 * sahifa ochilganda "oq lip etib ketish" (flash) bo'lmaydi.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange {...props}>
      {children}
    </NextThemesProvider>
  );
}
