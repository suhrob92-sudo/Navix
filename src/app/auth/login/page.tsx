import { Suspense } from 'react';

import { LoginForm } from '@/app/auth/login/login-form';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Kirish',
  description: 'Navix hisobingizga kiring.',
};

export default function LoginPage() {
  return (
    <Card variant="glass" padding="lg" className="animate-fade-up">
      <div className="mb-7 text-center">
        <CardTitle className="text-2xl">Xush kelibsiz</CardTitle>
        <CardDescription className="mt-2">Davom etish uchun hisobingizga kiring.</CardDescription>
      </div>

      {/* `useSearchParams` Suspense talab qiladi. */}
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <LoginForm />
      </Suspense>
    </Card>
  );
}
