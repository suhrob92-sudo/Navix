'use client';

import { Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { ProviderForm } from '@/components/admin/provider-form';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission } from '@/config/rbac';
import { useApiQuery } from '@/hooks/use-api';
import { formatUzDateTime } from '@/lib/date';
import type { AdminProviderResponse } from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';

export interface ProviderEditContentProps {
  providerId: string;
}

/**
 * Xizmatni tahrirlash sahifasi.
 *
 * Ko'rish uchun oddiy admin ruxsati yetarli, lekin SAQLASH tugmasi
 * bosilganda server alohida ruxsat talab qiladi. Shuning uchun bu
 * yerda `PLATFORM_ADMIN_ACCESS` ishlatilgan — qo'llab-quvvatlash
 * xodimi sozlamalarni ko'ra oladi, lekin o'zgartira olmaydi.
 */
export function ProviderEditContent({ providerId }: ProviderEditContentProps) {
  return (
    <RequireAdmin permission={Permission.PLATFORM_ADMIN_ACCESS}>
      <ProviderEditBody providerId={providerId} />
    </RequireAdmin>
  );
}

function ProviderEditBody({ providerId }: ProviderEditContentProps) {
  const router = useRouter();
  const { data, isLoading, error, setData } = useApiQuery<AdminProviderResponse>(
    `/api/v1/admin/providers/${providerId}`,
  );

  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const provider = data?.provider ?? null;

  return (
    <>
      <AdminHeader title={provider?.name ?? 'Xizmat'} showBack backHref="/admin/providers" />

      <div className="px-4 pt-4">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Xizmatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {savedMessage && (
          <Alert variant="success" className="mb-4">
            {savedMessage}
          </Alert>
        )}

        {provider && (
          <>
            {/* Ta'sir doirasi — o'zgartirishdan oldin ko'rinishi kerak */}
            <div className="bg-secondary/50 border-border animate-fade-up mb-5 flex items-center gap-3 rounded-2xl border p-4">
              <span className="bg-card text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Receipt className="size-4.5" aria-hidden="true" />
              </span>

              <div className="min-w-0 text-xs">
                <p className="text-foreground text-sm font-medium">
                  {`${provider.paymentCount} ta to'lov qabul qilingan`}
                </p>
                <p className="text-muted-foreground">
                  Oxirgi o&apos;zgartirish: {formatUzDateTime(provider.updatedAt, 'long')}
                </p>
              </div>
            </div>

            <ProviderForm
              provider={provider}
              onSaved={(updated) => {
                setData({ provider: updated });
                setSavedMessage("O'zgarishlar saqlandi");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onCancel={() => router.push('/admin/providers')}
            />
          </>
        )}
      </div>
    </>
  );
}
