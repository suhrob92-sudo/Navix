import Link from 'next/link';

import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AuroraBackground } from '@/components/shared/aurora-background';
import { Container } from '@/components/ui/container';
import { siteConfig } from '@/config/site';

/**
 * Autentifikatsiya sahifalari uchun umumiy qolip.
 *
 * Bosh sahifadagi to'liq menyu bu yerda kerak emas — foydalanuvchi
 * bitta ishga (kirish yoki ro'yxatdan o'tish) e'tibor qaratishi kerak.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />

      <header className="relative">
        <Container className="flex h-20 items-center justify-between">
          <Logo />
          <ThemeToggle />
        </Container>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="relative">
        <Container className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-8 text-xs">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <Link href="/" className="hover:text-foreground transition-colors">
            Bosh sahifa
          </Link>
          <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-foreground transition-colors">
            Yordam
          </a>
        </Container>
      </footer>
    </div>
  );
}
