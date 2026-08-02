import { RegisterForm } from '@/app/auth/register/register-form';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: "Ro'yxatdan o'tish",
  description: 'Navix hisobingizni yarating va barcha xizmatlardan foydalaning.',
};

export default function RegisterPage() {
  return (
    <Card variant="glass" padding="lg" className="animate-fade-up">
      <div className="mb-7 text-center">
        <CardTitle className="text-2xl">Hisob yaratish</CardTitle>
        <CardDescription className="mt-2">
          Bitta hisob bilan taksi, ovqat, to&apos;lov va boshqa barcha xizmatlardan foydalaning.
        </CardDescription>
      </div>

      <RegisterForm />
    </Card>
  );
}
