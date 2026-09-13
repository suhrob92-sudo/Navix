/**
 * Pastki menyuning QOBIG'I — suzib turadigan kapsula.
 *
 * ── Nima uchun alohida komponent ──────────────────────────────────────
 * Ilovada sakkizta pastki menyu bor: mijoz, feed, haydovchi, kuryer,
 * sotuvchi, do'kon, ish beruvchi va admin. Ular BIR XIL o'ralgan edi —
 * xuddi shu sakkizta qator har bir faylda qaytarilgandi:
 *
 *     glass-chrome pb-safe fixed inset-x-0 bottom-0 z-40 border-t
 *
 * Ya'ni menyuning ko'rinishini o'zgartirish uchun sakkizta faylni
 * qo'lda tahrirlash kerak edi va bittasini unutish — ilovada ikki xil
 * menyu paydo bo'lishi demak.
 *
 * Endi qobiq bitta joyda. Har bir menyu faqat O'Z tugmalarini beradi.
 *
 * Shaklning o'zi va o'lchamlari `globals.css` dagi `.tabbar-dock` va
 * `.tabbar-pill` da — u yerda nima uchun aynan shunday ekani yozilgan.
 */
export interface TabBarShellProps {
  /** Ekran o'quvchi uchun panel nomi — har menyuda o'ziniki. */
  label: string;

  /**
   * Qo'shimcha holat — masalan kabinet menyusidagi `lg:hidden`.
   *
   * Ataylab `nav` ga qo'shiladi, kapsulaga emas: bu yerga faqat
   * KO'RINISH-KO'RINMASLIK qoidalari tushadi, bezak emas.
   */
  className?: string;

  /** Menyu tugmalari — `<li>` ro'yxati. */
  children: React.ReactNode;
}

export function TabBarShell({ label, className, children }: TabBarShellProps) {
  return (
    <nav
      className={`tabbar-dock fixed inset-x-0 bottom-0 z-40${className ? ` ${className}` : ''}`}
      aria-label={label}
    >
      <ul className="glass-chrome tabbar-pill mx-auto flex max-w-lg items-end justify-around">{children}</ul>
    </nav>
  );
}
