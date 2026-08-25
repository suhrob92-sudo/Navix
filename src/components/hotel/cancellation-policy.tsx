import { Check, Percent, X } from 'lucide-react';

import { cancellationPolicyRows, type CancellationTier } from '@/config/cancellation';
import { cn } from '@/lib/utils';

/**
 * Bekor qilish shartlari jadvali.
 *
 * ── Nima uchun TO'LOVDAN OLDIN ko'rsatiladi ───────────────────────────
 * Shartni faqat bekor qilish paytida aytish — aldash. Odam pulini
 * to'lab bo'lgandan keyin "aslida yarmi qaytadi" degan xabarni
 * ko'rsa, u haqli ravishda g'azablanadi va bu ishonchni butunlay
 * yo'q qiladi.
 *
 * ── Nima uchun JADVAL, bitta jumla emas ───────────────────────────────
 * "Uch kun oldin bepul, keyin 50%, kirish kuni umuman yo'q" degan
 * jumlani o'qib chiqish uchun diqqat kerak. Uch qatorli jadvalni esa
 * bir qarashda tushunish mumkin — ko'z uni O'QIMAYDI, KO'RADI.
 */

const TIER_STYLES: Record<CancellationTier, { icon: typeof Check; className: string }> = {
  FREE: { icon: Check, className: 'text-emerald-600 dark:text-emerald-400' },
  PARTIAL: { icon: Percent, className: 'text-amber-600 dark:text-amber-400' },
  BLOCKED: { icon: X, className: 'text-destructive' },
};

export interface CancellationPolicyProps {
  /** Hozir amal qiladigan bosqich — u ajratib ko'rsatiladi. */
  highlight?: CancellationTier;
  className?: string;
}

export function CancellationPolicy({ highlight, className }: CancellationPolicyProps) {
  return (
    <div className={cn('border-border rounded-xl border p-3', className)}>
      <h3 className="text-xs font-semibold">Bekor qilish shartlari</h3>

      <dl className="mt-2 space-y-1.5">
        {cancellationPolicyRows().map((row) => {
          const style = TIER_STYLES[row.tier];
          const isActive = highlight === row.tier;

          return (
            <div
              key={row.tier}
              className={cn(
                'flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-xs',
                /*
                  Hozirgi bosqich ajratiladi: jadval umumiy qoidani
                  aytadi, odamga esa AYNAN HOZIR nima bo'lishi
                  qiziq.
                */
                isActive ? 'bg-secondary font-medium' : 'text-muted-foreground',
              )}
            >
              <dt className="flex min-w-0 items-start gap-1.5">
                <style.icon className={cn('mt-0.5 size-3.5 shrink-0', style.className)} aria-hidden="true" />
                <span className="leading-relaxed">{row.when}</span>
              </dt>
              <dd className="shrink-0 text-right leading-relaxed">{row.refund}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
