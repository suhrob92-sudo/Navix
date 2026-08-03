'use client';

import { useRouter } from 'next/navigation';

import { AdminHeader } from '@/components/admin/admin-header';
import { ProviderForm } from '@/components/admin/provider-form';
import { PageIntro } from '@/components/app/page-intro';
import { Permission } from '@/config/rbac';
import { RequireAdmin } from '@/modules/admin/require-admin';

/** Yangi xizmat qo'shish sahifasi. */
export function NewProviderContent() {
  const router = useRouter();

  return (
    <RequireAdmin permission={Permission.PLATFORM_PROVIDER_MANAGE}>
      <AdminHeader title="Yangi xizmat" showBack backHref="/admin/providers" />

      <div className="px-4 pt-4">
        <PageIntro description="Yangi to'lov xizmatini qo'shing. Kod keyinchalik o'zgartirilmaydi, shuning uchun uni diqqat bilan tanlang." />

        <ProviderForm
          provider={null}
          onSaved={(provider) => router.push(`/admin/providers/${provider.id}`)}
          onCancel={() => router.push('/admin/providers')}
        />
      </div>
    </RequireAdmin>
  );
}
