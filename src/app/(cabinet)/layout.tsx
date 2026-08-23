import { AppTabBar } from '@/components/app/app-tab-bar';
import { CallOverlay } from '@/components/call/call-overlay';
import { RequireAuth } from '@/modules/auth/require-auth';
import { CallProvider } from '@/modules/call/call-provider';
import { FavoritesProvider } from '@/modules/favorite/favorite-provider';

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
        Qo'ng'iroq boshqaruvi eng tashqarida — u ilova ochiq turgan
        vaqtning HAMMASIDA ishlashi kerak. Sahifadan sahifaga o'tganda
        suhbat uzilmaydi, chunki qolip qayta chizilmaydi.
      */}
      {/*
        Sevimlilar ham qolipda: yurakcha katalogdagi har bir
        kartochkada turadi va har biri alohida so'rasa, sahifa
        o'nlab so'rov yuborardi.
      */}
      <FavoritesProvider>
        <CallProvider>
          {/*
          pb-28 — pastki menyu kontentni to'sib qolmasligi uchun.
          Menyuning o'zi ~64px, markazdagi AI tugmasi esa undan ~20px yuqoriga
          chiqib turadi. Shuning uchun bo'sh joy menyudan kattaroq olingan.
        */}
          <div className="mx-auto w-full max-w-lg flex-1 pb-28">{children}</div>

          <AppTabBar />

          <CallOverlay />
        </CallProvider>
      </FavoritesProvider>
    </RequireAuth>
  );
}
