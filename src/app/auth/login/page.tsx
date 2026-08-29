import { Suspense } from 'react';

import { LoginForm } from '@/app/auth/login/login-form';
import { AuthScene } from '@/components/auth/auth-scene';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Kirish',
  description: 'Navix hisobingizga kiring.',
};

export default function LoginPage() {
  return (
    <div className="relative">
      {/*
        3D sahna FAQAT shu sahifada.

        Ro'yxatdan o'tish formasi ancha uzun: u ekranni to'ldiradi va
        kartachalar matn ortiga tushib qolardi. Suratda buni ko'rdim —
        sarlavha o'qilishi yomonlashdi.

        `fixed` — sahna butun ekranni egallashi kerak, bu yerdagi
        `max-w-md` idish emas.
      */}
      <AuthScene className="fixed" />

      {/*
        Karta ostidagi yorug'lik — chuqurlik hissi shundan tug'iladi.

        Soya "karta stol ustida yotibdi" deydi, yorug'lik esa "karta
        stol ustida OSILIB turibdi". Ikkalasi birga bo'lganda 3D
        effekt paydo bo'ladi va bunga bitta blur yetadi.
      */}
      <div
        className="from-primary/25 to-accent/20 absolute inset-x-6 -bottom-6 h-24 rounded-full bg-gradient-to-r blur-3xl"
        aria-hidden="true"
      />

      <Card variant="glass" padding="lg" className="animate-card-rise relative shadow-2xl">
        <div className="mb-7 text-center">
          <CardTitle className="text-2xl">Xush kelibsiz</CardTitle>
          <CardDescription className="mt-2">Davom etish uchun hisobingizga kiring.</CardDescription>
        </div>

        {/* `useSearchParams` Suspense talab qiladi. */}
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <LoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
