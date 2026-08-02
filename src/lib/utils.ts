import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind class'larni xavfsiz birlashtiradi.
 * Bir-biriga zid class'lar (masalan `p-2` va `p-4`) bo'lsa — oxirgisi qoladi.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Raqamni O'zbekiston so'mi formatida chiqaradi. Masalan: 25 000 so'm
 *
 * Valyuta belgisi qo'lda qo'shiladi, `style: 'currency'` ishlatilmaydi:
 * brauzer va server turli natija berardi ("UZS 0" va "0 soʻm"), bu esa
 * React'da "hydration mismatch" ogohlantirishiga olib kelardi.
 */
export function formatUZS(amount: number): string {
  const formatted = new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount);

  // Ingichka bo'linmas probel — raqam va "so'm" bir qatorda qoladi.
  return `${formatted} so'm`;
}

/** Sanani o'zbekcha, qisqa ko'rinishda chiqaradi. Masalan: 2-avg, 2026 */
export function formatDate(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('uz-UZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

/** Matnni belgilangan uzunlikda kesadi va oxiriga "…" qo'yadi. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/** Matndan URL uchun xavfsiz "slug" yasaydi. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
