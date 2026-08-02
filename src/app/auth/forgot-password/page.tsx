import { ForgotPasswordForm } from '@/app/auth/forgot-password/forgot-password-form';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Parolni tiklash',
  description: 'Telefon raqamingiz orqali parolni tiklang.',
};

export default function ForgotPasswordPage() {
  return (
    <Card variant="glass" padding="lg" className="animate-fade-up">
      <div className="mb-7 text-center">
        <CardTitle className="text-2xl">Parolni tiklash</CardTitle>
        <CardDescription className="mt-2">
          Raqamingizga tasdiqlash kodi yuboramiz. Kod orqali yangi parol o&apos;rnatasiz.
        </CardDescription>
      </div>

      <ForgotPasswordForm />
    </Card>
  );
}
