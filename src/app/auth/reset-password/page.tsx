import { Suspense } from 'react';

import { ResetPasswordForm } from '@/app/auth/reset-password/reset-password-form';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Yangi parol',
  description: "SMS kod orqali yangi parol o'rnating.",
};

export default function ResetPasswordPage() {
  return (
    <Card variant="glass" padding="lg" className="animate-fade-up">
      <div className="mb-7 text-center">
        <CardTitle className="text-2xl">Yangi parol</CardTitle>
        <CardDescription className="mt-2">Kodni kiriting va yangi parol o&apos;rnating.</CardDescription>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ResetPasswordForm />
      </Suspense>
    </Card>
  );
}
