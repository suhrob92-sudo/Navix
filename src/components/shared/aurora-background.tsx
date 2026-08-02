import { cn } from '@/lib/utils';

/**
 * Orqa fondagi sekin harakatlanuvchi rangli "shafaq" effekti.
 *
 * Toza CSS bilan qilingan (rasm yoki JS kutubxona ishlatilmagan) —
 * shuning uchun telefonda ham tez ishlaydi va trafik sarflamaydi.
 */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      aria-hidden="true"
    >
      <div className="bg-primary/25 animate-aurora absolute -top-40 -left-32 size-[32rem] rounded-full blur-[120px]" />
      <div
        className="bg-accent/20 animate-aurora absolute -top-24 -right-32 size-[28rem] rounded-full blur-[120px]"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="bg-success/15 animate-aurora absolute top-72 left-1/3 size-[26rem] rounded-full blur-[120px]"
        style={{ animationDelay: '-12s' }}
      />
    </div>
  );
}
