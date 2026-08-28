import { clientEnv } from '@/lib/env';

/** Brend va sayt darajasidagi umumiy sozlamalar. */
export const siteConfig = {
  name: clientEnv.NEXT_PUBLIC_APP_NAME,
  /**
   * Sayt sarlavhasi va ijtimoiy tarmoq rasmlarida ishlatiladi.
   *
   * ── Nima uchun "super ilova" olib tashlandi ─────────────────────────
   * Bu ibora ilovaning O'ZI haqida gapiradi, foydalanuvchi nima qila
   * olishi haqida emas. Odam esa qidiruv natijasida yoki havolada
   * "menga nima beradi?" degan savolga javob izlaydi.
   *
   * Shu sababli sarlavha endi qisqa va aniq: xizmat nomlari va
   * ularning bitta joyda ekani.
   */
  tagline: 'Kundalik xizmatlar bitta ilovada',
  description:
    "Ovqat yetkazish, marketplace, to'lovlar va hamyon, ish qidirish, mehmonxona hamda sayohat bandlovi — bitta hisob bilan. AI yordamchi kerakli xizmatni bir jumladan topadi.",
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
