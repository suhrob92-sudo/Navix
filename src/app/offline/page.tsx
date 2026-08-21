import { WifiOff } from 'lucide-react';

import { OfflineActions } from '@/app/offline/offline-actions';
import { siteConfig } from '@/config/site';

export const metadata = {
  title: 'Internet yo\'q',
  description: 'Aloqa tiklanganda Navix o\'zi qaytadi.',
};

/**
 * "Internet yo'q" sahifasi.
 *
 * ── Nima uchun bu sahifa KERAK ────────────────────────────────────────
 * Internet uzilganda brauzer o'zining oq ekranini ko'rsatadi:
 * "ERR_INTERNET_DISCONNECTED". Odam uchun bu ILOVA buzilgandek
 * ko'rinadi va u qayta urinmaydi — chiqib ketadi.
 *
 * Bu sahifa esa aniq aytadi: muammo ilovada emas, aloqada.
 *
 * ── Nima uchun bu yerda HECH QANDAY so'rov yo'q ───────────────────────
 * Sahifa aynan internet yo'qligida ochiladi. Undagi har qanday
 * so'rov (rasm, shrift, ma'lumot) yuklanmasdi va ekran yarim
 * bo'sh chiqardi.
 *
 * Shuning uchun u butunlay o'ziga yetarli: matn va belgi.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="bg-secondary text-muted-foreground mb-5 inline-flex size-16 items-center justify-center rounded-2xl">
        <WifiOff className="size-8" aria-hidden="true" />
      </span>

      <h1 className="text-xl font-semibold tracking-tight">Internet yo&apos;q</h1>

      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {`${siteConfig.name} telefoningizda saqlangan, lekin ma'lumot olish uchun aloqa kerak. Wi-Fi yoki mobil internetni yoqing.`}
      </p>

      <OfflineActions />

      {/*
        Maslahat — eng ko'p yordam beradigan uchta ish.

        Odam "nima qilay?" degan savol bilan qolmasligi kerak.
      */}
      <ul className="text-muted-foreground mt-8 space-y-1.5 text-xs">
        <li>Aviarejim o&apos;chirilganini tekshiring</li>
        <li>Wi-Fi yoki mobil internetni yoqing</li>
        <li>Boshqa joyga o&apos;tib ko&apos;ring — signal kuchsiz bo&apos;lishi mumkin</li>
      </ul>
    </main>
  );
}
