import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

import { OfflineBanner } from '@/components/app/offline-banner';
import { PwaSetup } from '@/components/app/pwa-setup';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { WebVitals } from '@/components/providers/web-vitals';
import { PWA_SHORT_NAME } from '@/config/pwa';
import { siteConfig } from '@/config/site';
import { AuthProvider } from '@/modules/auth/auth-context';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

/**
 * SEO va ijtimoiy tarmoqlar uchun meta ma'lumotlar.
 * Bu sahifa Google va Telegram'da qanday ko'rinishini belgilaydi.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: ['super app', 'taksi', 'yetkazib berish', 'marketplace', "to'lov", "O'zbekiston", 'AI'],
  openGraph: {
    type: 'website',
    locale: 'uz_UZ',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  /*
    Ilova ma'lumotnomasi — usiz brauzer o'rnatish taklifini
    umuman ko'rsatmaydi. Fayl `src/app/manifest.ts` da yasaladi.
  */
  manifest: '/manifest.webmanifest',
  /*
    iOS uchun alohida sozlama.

    Apple ma'lumotnomani (`manifest`) faqat qisman qo'llaydi.
    Ilova to'liq ekranda ochilishi va sarlavhasi to'g'ri
    ko'rinishi uchun bu uchta qiymat kerak.
  */
  appleWebApp: {
    capable: true,
    title: PWA_SHORT_NAME,
    /*
      `default` — tizim paneli oq matn bilan qorayadi.

      `black-translucent` chiroyliroq ko'rinardi, lekin unda
      sahifa tizim panelining OSTIGA chiqib ketadi va sarlavha
      soat bilan ustma-ust tushardi.
    */
    statusBarStyle: 'default',
  },
  /*
    Eski iPhone'lar uchun QO'SHIMCHA belgi.

    Next.js zamonaviy `mobile-web-app-capable` ni yozadi va uni
    iOS 16.4 dan boshlab Safari tushunadi. Undan eski telefonlar
    esa faqat Apple'ning o'z nomini biladi.

    O'zbekistonda eski iPhone'lar ko'p — ikkalasini ham yozamiz.
    Ular bir-biriga xalaqit bermaydi.
  */
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

/** Telefon brauzerlari uchun sozlamalar (status panel rangi, masshtab). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  /**
   * Klaviatura ochilganda SAHIFA kichrayadi.
   *
   * ── Muammo ──────────────────────────────────────────────────────────
   * Android brauzerining odatiy xatti-harakati (`resizes-visual`)
   * shunday: klaviatura chiqqanda sahifaning o'lchami O'ZGARMAYDI,
   * brauzer uni shunchaki yuqoriga suradi.
   *
   * Natijada `position: fixed` bilan qo'yilgan pastki panellar —
   * bo'limlar paneli, savat paneli, "Yuborish" tugmasi — klaviatura
   * ORQASIDA qolib ketadi. Odam yozadi, lekin yuborish tugmasini
   * ko'rmaydi.
   *
   * ── Yechim ──────────────────────────────────────────────────────────
   * `resizes-content` da klaviatura chiqqanda sahifaning balandligi
   * kichrayadi. Pastki panel esa yangi pastki chegaraga yopishadi —
   * ya'ni klaviatura USTIDA turadi.
   */
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0e14' },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning — mavzu klassi brauzerda qo'yilgani uchun kerak.
    <html lang="uz" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="scrollbar-slim flex min-h-full flex-col">
        <ThemeProvider>
          <AuthProvider>
            {children}

            {/*
              Ilovani o'rnatish taklifi va xizmat ishchisi.

              `AuthProvider` ICHIDA: taklif ilova ichidagi
              sahifalarda ma'noli, tanishtiruv sahifasida esa
              odam hali nima ekanini bilmaydi.
            */}
            <PwaSetup />

            {/*
              Aloqa uzilganini AYTAMIZ.

              Ilova keshdan ochilib turaveradi, lekin yangi
              ma'lumot kelmaydi. Sababi aytilmasa, odam ilovani
              ayblaydi.
            */}
            <OfflineBanner />
          </AuthProvider>
        </ThemeProvider>

        {/* Tezlik o'lchovi — hech narsa chizmaydi. */}
        <WebVitals />
      </body>
    </html>
  );
}
