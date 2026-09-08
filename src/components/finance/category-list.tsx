import { rampColor } from '@/config/finance';
import { formatTiyin } from '@/lib/money';
import type { SpendingSlice } from '@/modules/finance/finance.types';

/**
 * Toifalar ro'yxati — diagrammaning MATNLI ko'rinishi.
 *
 * ── Nima uchun diagrammadan tashqari yana ro'yxat ─────────────────────
 * Diagramma faqat ko'z bilan o'qiladi: ekran o'qiydigan dastur undan
 * hech narsa ayta olmaydi va shuning uchun u `aria-hidden`. Aynan
 * shu ro'yxat — ko'r odam uchun BIRDAN-BIR manba.
 *
 * Ustiga, diagramma aniq sonni ko'rsatmaydi (ustun uzunligi taxminiy
 * tasavvur beradi), ro'yxatda esa summa ham, foiz ham, amallar soni
 * ham yozilgan.
 *
 * ── Nima uchun rangli kvadrat bor ─────────────────────────────────────
 * Odam diagrammadagi ustunni ro'yxatdagi qator bilan bog'lay olishi
 * kerak. Bog'lanish YORLIQ orqali ham bor (ikkalasida bir xil nom),
 * kvadrat esa uni tezlashtiradi.
 */
export interface CategoryListProps {
  slices: readonly SpendingSlice[];
}

export function CategoryList({ slices }: CategoryListProps) {
  if (slices.length === 0) return null;

  const max = Math.max(...slices.map((slice) => slice.amountTiyin));

  return (
    <ul className="divide-border/60 divide-y">
      {slices.map((slice) => (
        <li key={slice.code} className="flex items-center gap-3 py-3">
          <span
            className="size-3 shrink-0 rounded-sm"
            style={{ background: rampColor(slice.amountTiyin, max) }}
            aria-hidden="true"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{slice.label}</p>
            <p className="text-muted-foreground text-xs">
              {slice.percent}% &middot; {slice.count} ta amal
            </p>
          </div>

          <p className="shrink-0 text-sm font-semibold tabular-nums">{formatTiyin(slice.amountTiyin)}</p>
        </li>
      ))}
    </ul>
  );
}
