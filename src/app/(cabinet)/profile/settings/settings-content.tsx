'use client';

import { AppHeader } from '@/components/app/app-header';
import { ProfileForm } from '@/app/(cabinet)/profile/profile-form';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import type { ProfileResponse } from '@/app/(cabinet)/profile/profile-content';

/**
 * Profil sozlamalari — ism, tug'ilgan sana, til, mavzu va vaqt zonasi.
 *
 * Alohida sahifaga ajratilgan: profil sahifasining o'zi menyu ko'rinishida
 * bo'lib, u yerda uzun forma bo'lsa mobil ekranda noqulay bo'lardi.
 */
export function SettingsContent() {
  const { data, isLoading, error, setData } = useApiQuery<ProfileResponse>('/api/v1/profile');

  return (
    <>
      <AppHeader title="Sozlamalar" showBack backHref="/profile" />

      <div className="px-4 pt-4">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        )}

        {!isLoading && (error || !data) && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi">
            {error ?? "Noma'lum xatolik"}
          </Alert>
        )}

        {!isLoading && data && <ProfileForm key={data.id} profile={data} onSaved={setData} />}
      </div>
    </>
  );
}
