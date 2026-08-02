import { AppTabBar } from '@/components/app/app-tab-bar';
import { RequireAuth } from '@/modules/auth/require-auth';

/**
 * Ilova qolipi — kirgan foydalanuvchi ko'radigan barcha sahifalar uchun.
 *
 * `(cabinet)` — Next.js "route group": qavs ichidagi nom MANZILGA TUSHMAYDI.
 * Ya'ni `/dashboard` manzili o'zgarmaydi, lekin barcha sahifalar shu
 * qolipni va himoyani baham ko'radi.
 *
 * Kenglik `max-w-lg` bilan cheklangan: ilova telefon uchun mo'ljallangan,
 * kompyuterda esa markazda, telefon kengligida ochiladi.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {/*
        pb-28 — pastki menyu kontentni to'sib qolmasligi uchun.
        Menyuning o'zi ~64px, markazdagi AI tugmasi esa undan ~20px yuqoriga
        chiqib turadi. Shuning uchun bo'sh joy menyudan kattaroq olingan.
      */}
      <div className="mx-auto w-full max-w-lg flex-1 pb-28">{children}</div>

      <AppTabBar />
    </RequireAuth>
  );
}
