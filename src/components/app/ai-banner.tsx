import { Bot, Sparkles } from 'lucide-react';
import Link from 'next/link';

/**
 * AI yordamchi banneri — bosh sahifadagi asosiy urg'u.
 *
 * Maketdagi kabi gradientli katta kartochka. U shunchaki reklama emas:
 * AI ilovaning bosh xususiyati bo'lgani uchun eng ko'rinarli joyda turadi.
 */
export function AiBanner() {
  return (
    <Link
      href="/assistant"
      className="from-primary to-accent shadow-primary/25 relative block overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg transition-transform active:scale-[0.99]"
    >
      {/* Orqa fondagi bezak doiralari */}
      <span
        className="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute -right-2 -bottom-12 size-28 rounded-full bg-white/10"
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-primary-foreground flex items-center gap-1.5 text-base font-semibold">
            <Sparkles className="size-4" aria-hidden="true" />
            AI Yordamchi
          </p>

          <p className="text-primary-foreground/80 mt-1.5 text-sm leading-relaxed">
            Savolingiz bormi? Men sizga yordam beraman!
          </p>

          <span className="text-primary mt-3 inline-flex rounded-lg bg-white px-3.5 py-2 text-sm font-medium">
            Suhbatni boshlash
          </span>
        </div>

        <span
          className="inline-flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white/15"
          aria-hidden="true"
        >
          <Bot className="text-primary-foreground size-10" />
        </span>
      </div>
    </Link>
  );
}
