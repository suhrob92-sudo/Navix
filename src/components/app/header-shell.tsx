import { cn } from '@/lib/utils';

/**
 * Yuqori panelning QOBIG'I — suzib turadigan kapsula.
 *
 * ── Nima uchun alohida komponent ──────────────────────────────────────
 * Ilovada uchta yuqori panel bor: mijoz, feed va admin. Ularning
 * o'ralgan qismi bir xil yozilgandi:
 *
 *     glass-chrome sticky top-0 z-40 border-b
 *
 * Pastki menyu bilan aynan shu holat bo'lgan edi — to'qqizta faylda
 * bir xil qator. Shuning uchun bu yerda ham qobiq bitta.
 *
 * Shakl va o'lchamlar `globals.css` dagi `.header-dock` va
 * `.header-pill` da: nima uchun aynan shunday ekani o'sha yerda.
 */
export interface HeaderShellProps {
  /**
   * Qo'shimcha holat — masalan boshqa `z-index`.
   *
   * Ataylab `header` ga tushadi, kapsulaga emas: bu yerga faqat
   * JOYLASHUV qoidalari yoziladi, bezak emas.
   */
  className?: string;

  /** Panel ichidagi qator: chapda nom, o'ngda tugmalar. */
  children: React.ReactNode;
}

export function HeaderShell({ className, children }: HeaderShellProps) {
  return (
    <header className={cn('header-dock sticky top-0 z-40', className)}>
      <div className="glass-chrome header-pill mx-auto flex h-15 max-w-lg items-center justify-between gap-2 px-4">
        {children}
      </div>
    </header>
  );
}
