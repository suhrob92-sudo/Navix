import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { Container } from '@/components/ui/container';

/**
 * Huquqiy hujjatlar uchun umumiy qolip.
 *
 * ── Nima uchun kirish TALAB QILINMAYDI ────────────────────────────────
 * Bu sahifalar hisob ochishdan OLDIN o'qiladi: odam nimaga rozi
 * bo'layotganini bilishi kerak. Shuning uchun ular ochiq va sayt
 * xaritasiga ham kiritilgan — to'lov tashkilotlari va ilova
 * do'konlari tekshiruvchilari ham shu havolalar orqali kiradi.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="relative">
        <Container size="md" className="py-12 sm:py-16">
          {children}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
