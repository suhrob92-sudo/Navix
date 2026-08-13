import Link from 'next/link';

import { Logo } from '@/components/layout/logo';
import { Container } from '@/components/ui/container';
import { LEGAL_DOCUMENTS, legalHref } from '@/config/legal';
import { MODULE_CATEGORIES, getModulesByCategory } from '@/config/modules';
import { siteConfig } from '@/config/site';

/** Saytning pastki qismi — barcha modullar bo'yicha to'liq navigatsiya. */
export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/60 mt-24 border-t">
      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_3fr]">
          <div className="space-y-4">
            <Logo />
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{siteConfig.description}</p>
            <p className="text-muted-foreground text-sm">
              Aloqa:{' '}
              <a href={`mailto:${siteConfig.supportEmail}`} className="text-primary hover:underline">
                {siteConfig.supportEmail}
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {MODULE_CATEGORIES.map((category) => (
              <div key={category.id}>
                <h3 className="mb-3 text-sm font-semibold">{category.name}</h3>
                <ul className="space-y-2">
                  {getModulesByCategory(category.id).map((module) => (
                    <li key={module.id}>
                      <Link
                        href={module.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                      >
                        {module.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-border/60 text-muted-foreground mt-10 flex flex-col gap-3 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {siteConfig.name}. Barcha huquqlar himoyalangan.
          </p>

          {/*
            Huquqiy havolalar ro'yxatdan YASALADI: yangi hujjat
            qo'shilsa u shu yerda o'zi paydo bo'ladi va pastki menyuni
            yangilash esdan chiqmaydi.
          */}
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LEGAL_DOCUMENTS.map((document) => (
              <Link
                key={document.slug}
                href={legalHref(document.slug)}
                className="hover:text-foreground transition-colors"
              >
                {document.title}
              </Link>
            ))}
            <Link href="/navbat" className="hover:text-foreground transition-colors">
              Navbatga yozilish
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
