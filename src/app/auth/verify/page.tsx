import { Suspense } from 'react';

import { VerifyForm } from '@/app/auth/verify/verify-form';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Raqamni tasdiqlash',
  description: 'Telefon raqamingizga yuborilgan kodni kiriting.',
};

export default function VerifyPage() {
  return (
    <Card variant="glass" padding="lg" className="animate-fade-up">
      <div className="mb-7 text-center">
        <CardTitle className="text-2xl">Raqamni tasdiqlang</CardTitle>
        <CardDescription className="mt-2">SMS orqali kelgan kodni kiriting.</CardDescription>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <VerifyForm />
      </Suspense>
    </Card>
  );
}
