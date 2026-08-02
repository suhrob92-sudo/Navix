import { clientEnv } from '@/lib/env';

/** Brend va sayt darajasidagi umumiy sozlamalar. */
export const siteConfig = {
  name: clientEnv.NEXT_PUBLIC_APP_NAME,
  tagline: 'Markaziy Osiyoning yagona super ilovasi',
  description:
    "Taksi, ovqat yetkazish, marketplace, to'lovlar, ish qidirish va sayohat — barchasi bitta ilovada. AI yordamchi esa hammasini siz uchun boshqaradi.",
  url: clientEnv.NEXT_PUBLIC_APP_URL,
  locale: 'uz-UZ',
  defaultCurrency: 'UZS',
  supportEmail: 'support@navix.uz',
} as const;

/** Bosh sahifadagi asosiy navigatsiya. */
export const mainNavigation = [
  { label: 'Xizmatlar', href: '#modullar' },
  { label: 'AI yordamchi', href: '#ai' },
  { label: 'Texnologiya', href: '#texnologiya' },
] as const;
