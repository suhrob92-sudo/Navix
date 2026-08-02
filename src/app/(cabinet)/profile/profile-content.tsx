'use client';

import { ShieldCheck } from 'lucide-react';

import { ProfileForm } from '@/app/(cabinet)/profile/profile-form';
import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzPhone } from '@/lib/phone';
import { formatDate } from '@/lib/utils';

export interface ProfileResponse {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  phoneVerified: string | null;
  createdAt: string;
  roles: string[];
  preferences: {
    dateOfBirth: string | null;
    language: string;
    theme: string;
    timezone: string;
    marketingOptIn: boolean;
  };
}

/**
 * Profil sahifasi.
 *
 * Ma'lumot yuklanadi, keyin forma alohida komponentga uzatiladi.
 * Forma faqat ma'lumot tayyor bo'lgandan keyin yaratiladi — shuning uchun
 * uning boshlang'ich holati to'g'ridan-to'g'ri prop'dan olinadi.
 */
export function ProfileContent() {
  const { data, isLoading, error, setData } = useApiQuery<ProfileResponse>('/api/v1/profile');

  if (isLoading) {
    return (
      <>
        <PageHeader title="Profilim" description="Shaxsiy ma'lumotlaringiz va sozlamalar." />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Profilim" />
        <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi">
          {error ?? "Noma'lum xatolik"}
        </Alert>
      </>
    );
  }

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ') || null;

  return (
    <>
      <PageHeader title="Profilim" description="Shaxsiy ma'lumotlaringiz va sozlamalar." />

      {/* Hisob haqida qisqacha */}
      <Card variant="glass" className="animate-fade-up">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={data.avatarUrl} name={fullName ?? data.phone} size="lg" />

          <div className="min-w-0 flex-1">
            <CardTitle className="truncate">{fullName ?? 'Ism kiritilmagan'}</CardTitle>
            <CardDescription className="mt-1">{formatUzPhone(data.phone)}</CardDescription>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {data.phoneVerified && (
                <span className="text-success flex items-center gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  Raqam tasdiqlangan
                </span>
              )}
              <span className="text-muted-foreground">
                Ro&apos;yxatdan o&apos;tgan: {formatDate(data.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/*
        `key` — profil yangilanganda forma qaytadan yaratilishi uchun emas,
        balki turli foydalanuvchilar orasida holat aralashib ketmasligi uchun.
      */}
      <ProfileForm key={data.id} profile={data} onSaved={setData} />
    </>
  );
}
