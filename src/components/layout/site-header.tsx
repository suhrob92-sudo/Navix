'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { mainNavigation } from '@/config/site';

/**
 * Saytning yuqori paneli.
 *
 * Telefonda: logotip + mavzu tugmasi + "burger" menyu.
 * Kompyuterda: to'liq navigatsiya ko'rinadi.
 */
export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full">
      <Container className="pt-3 pb-2">
        <div className="glass flex h-14 items-center justify-between rounded-2xl px-3 sm:px-4">
          <Logo />

          {/* Kompyuter uchun navigatsiya */}
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

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <Button variant="primary" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/auth/register">Boshlash</Link>
            </Button>

            {/* Telefon uchun menyu tugmasi */}
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
          </div>
        </div>

        {/* Telefon menyusi */}
        {isMenuOpen && (
          <nav
            id="mobile-menu"
            className="glass animate-scale-in mt-2 flex flex-col gap-1 rounded-2xl p-3 md:hidden"
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
            <Button variant="primary" fullWidth className="mt-2" asChild>
              <Link href="/auth/register" onClick={closeMenu}>
                Boshlash
              </Link>
            </Button>
          </nav>
        )}
      </Container>
    </header>
  );
}
