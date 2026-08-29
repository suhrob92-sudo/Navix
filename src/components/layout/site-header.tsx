'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { UserMenu } from '@/components/layout/user-menu';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { mainNavigation } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * Saytning yuqori paneli.
 *
 * Ikki xil ko'rinishda ishlaydi:
 *  - BOSH SAHIFADA — "Xizmatlar / AI yordamchi / Texnologiya" havolalari
 *    ko'rinadi. Ular sahifa ichidagi bo'limlarga olib boradi (`#modullar`).
 *  - KABINETDA — bu havolalar YASHIRILADI. Ular boshqa sahifaga tegishli
 *    bo'lgani uchun kabinetda bosilsa hech narsa qilmaydi va foydalanuvchini
 *    chalkashtiradi. Kabinet navigatsiyasi yon menyu va pastki panelda.
 */
interface SiteHeaderProps {
  /**
   * Qo'shimcha sinf.
   *
   * ── Nima uchun kerak ──────────────────────────────────────────────
   * Panel to'rtta sahifada ishlatiladi (bosh sahifa, huquqiy hujjatlar,
   * navbat, topilmadi). Bosh sahifada unga tabiiy palitradagi nozik
   * bezak qo'shiladi, qolganlarida esa hech narsa o'zgarmasligi kerak.
   *
   * Shuning uchun bezak shu yerdan emas, CHAQIRUVCHIDAN keladi: sinf
   * berilmasa, panel avvalgidek qoladi.
   */
  className?: string;
}

export function SiteHeader({ className }: SiteHeaderProps = {}) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /** Bo'lim havolalari faqat bosh sahifada ma'noga ega. */
  const showMarketingNav = pathname === '/';

  const closeMenu = () => setIsMenuOpen(false);

  return (
    /*
     * Panelning O'ZI ham fonli bo'lishi kerak, faqat ichidagi kartochka emas:
     * kartochka yumaloq va atrofida bo'sh joy qoladi, sahifa kontenti esa
     * o'sha bo'shliqdan surilib o'tadi va matn "sizib" chiqadi.
     */
    <header className={cn('bg-background/90 sticky top-0 z-50 w-full backdrop-blur-md', className)}>
      <Container className="pt-3 pb-2">
        <div className="glass-chrome flex h-14 items-center justify-between rounded-2xl px-3 sm:px-4">
          <Logo />

          {showMarketingNav && (
            <nav className="hidden items-center gap-1 md:flex" aria-label="Asosiy navigatsiya">
              {mainNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary/60 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-1">
            <ThemeToggle />

            {/*
              Bosh sahifada telefon uchun foydalanuvchi menyusi "burger" ichida
              turadi (joy tejash uchun). Kabinetda burger yo'q, shuning uchun
              menyu doim ko'rinadi.
            */}
            <div className={showMarketingNav ? 'hidden sm:block' : 'block'}>
              <UserMenu />
            </div>

            {showMarketingNav && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
              >
                {isMenuOpen ? <X /> : <Menu />}
              </Button>
            )}
          </div>
        </div>

        {showMarketingNav && isMenuOpen && (
          <nav
            id="mobile-menu"
            className="glass-chrome animate-scale-in mt-2 flex flex-col gap-1 rounded-2xl p-3 md:hidden"
            aria-label="Mobil navigatsiya"
          >
            {mainNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="hover:bg-secondary/60 rounded-lg px-3 py-3 text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <div className="border-border/60 mt-2 border-t pt-3 sm:hidden">
              <UserMenu onNavigate={closeMenu} />
            </div>
          </nav>
        )}
      </Container>
    </header>
  );
}
