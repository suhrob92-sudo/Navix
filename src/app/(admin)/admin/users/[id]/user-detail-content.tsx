'use client';

import { CheckCircle2, Receipt, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Permission, hasPermission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate, formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  USER_STATUS_LABELS,
  USER_STATUS_VARIANTS,
  type AdminUserResponse,
  type UserStatusName,
} from '@/modules/admin/admin.types';
import { RequireAdmin } from '@/modules/admin/require-admin';
import { useAuth } from '@/modules/auth/auth-context';

export interface AdminUserDetailContentProps {
  userId: string;
}

/**
 * Bitta foydalanuvchi haqida to'liq ma'lumot.
 *
 * Bu sahifa qo'llab-quvvatlash uchun yaratilgan: murojaat kelganda
 * xodim bir ekranda hamma narsani ko'radi — balans, to'lovlar soni,
 * faol qurilmalar, hisob holati.
 */
export function AdminUserDetailContent({ userId }: AdminUserDetailContentProps) {
  return (
    <RequireAdmin permission={Permission.PLATFORM_USER_READ}>
      <UserDetailBody userId={userId} />
    </RequireAdmin>
  );
}

function UserDetailBody({ userId }: AdminUserDetailContentProps) {
  const request = useApiClient();
  const { user: currentUser } = useAuth();
  const { data, isLoading, error, setData } = useApiQuery<AdminUserResponse>(`/api/v1/admin/users/${userId}`);

  const [pendingStatus, setPendingStatus] = useState<UserStatusName | null>(null);
  const [pendingRole, setPendingRole] = useState<{ role: string; action: 'grant' | 'revoke' } | null>(null);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const user = data?.user ?? null;

  const canSuspend = hasPermission(currentUser?.roles ?? [], Permission.PLATFORM_USER_SUSPEND);
  const canManageRoles = hasPermission(currentUser?.roles ?? [], Permission.PLATFORM_ROLE_MANAGE);
  const isSelf = currentUser?.id === userId;
  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || null : null;

  async function applyStatus() {
    if (!pendingStatus) return;

    setIsSaving(true);
    setActionError(null);

    try {
      const response = await request<AdminUserResponse>(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: { status: pendingStatus, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      });

      setData(response);
      setSuccessMessage(`Holat "${USER_STATUS_LABELS[pendingStatus]}" ga o'zgartirildi`);
      setPendingStatus(null);
      setReason('');
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  async function applyRole() {
    if (!pendingRole) return;

    setIsSaving(true);
    setActionError(null);

    try {
      const response = await request<AdminUserResponse>(`/api/v1/admin/users/${userId}/roles`, {
        method: 'PATCH',
        body: pendingRole,
      });

      setData(response);
      setSuccessMessage(
        pendingRole.action === 'grant'
          ? `"${ROLE_LABELS[pendingRole.role] ?? pendingRole.role}" roli berildi`
          : `"${ROLE_LABELS[pendingRole.role] ?? pendingRole.role}" roli olib tashlandi`,
      );
      setPendingRole(null);
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setPendingRole(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title={fullName ?? 'Foydalanuvchi'} showBack backHref="/admin/users" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Ma'lumotni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {successMessage && <Alert variant="success">{successMessage}</Alert>}
        {actionError && <Alert variant="error">{actionError}</Alert>}

        {user && (
          <>
            {/* Asosiy ma'lumot */}
            <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-center gap-4">
                <Avatar src={user.avatarUrl} name={fullName ?? user.phone} size="lg" />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold">{fullName ?? 'Ism kiritilmagan'}</p>
                  <p className="text-muted-foreground truncate text-sm">{formatUzPhone(user.phone)}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant={USER_STATUS_VARIANTS[user.status]}>{USER_STATUS_LABELS[user.status]}</Badge>

                    {user.phoneVerified && (
                      <Badge variant="outline">
                        <CheckCircle2 className="size-3" aria-hidden="true" />
                        Tasdiqlangan
                      </Badge>
                    )}

                    {user.roles
                      .filter((role) => role !== 'CUSTOMER')
                      .map((role) => (
                        <Badge key={role} variant="default">
                          <ShieldCheck className="size-3" aria-hidden="true" />
                          {role}
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>

              <dl className="border-border/60 mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-xs">
                <InfoRow label="Email" value={user.email ?? '—'} />
                <InfoRow label="Ro'yxatdan o'tgan" value={formatUzDate(user.createdAt, 'long')} />
                <InfoRow
                  label="Oxirgi faollik"
                  value={user.lastLoginAt ? formatUzDateTime(user.lastLoginAt, 'long') : 'Kirmagan'}
                />
                <InfoRow label="Faol qurilmalar" value={String(user.activeSessions)} />
              </dl>
            </div>

            {/* Moliyaviy holat */}
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile
                icon={Wallet}
                label="Hamyon balansi"
                value={user.walletBalance === null ? 'Ochilmagan' : formatTiyin(user.walletBalance)}
              />

              {/*
                To'lovlar kartochkasi bosiladigan: murojaat kelganda
                xodim shu yerdan darhol to'lovlar ro'yxatiga o'tadi va
                kerak bo'lsa pulni qaytaradi.
              */}
              <Link href={`/admin/payments?search=${encodeURIComponent(user.phone)}`} className="block">
                <SummaryTile
                  icon={Receipt}
                  label="To'lovlar"
                  value={`${user.paymentCount} ta`}
                  hint={formatTiyin(user.paymentVolume)}
                />
              </Link>
            </div>

            {/* Rollar */}
            {canManageRoles && (
              <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
                <h2 className="text-sm font-semibold">Rollar</h2>

                {isSelf ? (
                  <Alert variant="info" className="mt-3">
                    O&apos;z rollaringizni o&apos;zgartira olmaysiz. Aks holda o&apos;zingizdan bosh administrator
                    huquqini olib tashlab, tizimni boshqaruvsiz qoldirishingiz mumkin edi.
                  </Alert>
                ) : (
                  <>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      Rol o&apos;zgarganda foydalanuvchi tizimdan chiqariladi — yangi huquqlar faqat qayta
                      kirgandan keyin kuchga kiradi.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {ASSIGNABLE_ROLES.map((role) => {
                        const active = user.roles.includes(role);

                        return (
                          <button
                            key={role}
                            type="button"
                            disabled={isSaving}
                            onClick={() => setPendingRole({ role, action: active ? 'revoke' : 'grant' })}
                            aria-pressed={active}
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
                              active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:bg-secondary',
                            )}
                          >
                            {ROLE_LABELS[role] ?? role}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            )}

            {/* Holatni boshqarish */}
            {canSuspend && (
              <section className="bg-card border-border animate-fade-up rounded-2xl border p-4">
                <h2 className="text-sm font-semibold">Hisob holati</h2>

                {isSelf ? (
                  <Alert variant="info" className="mt-3">
                    O&apos;z hisobingiz holatini o&apos;zgartira olmaysiz. Bu ataylab shunday: oxirgi administrator
                    tasodifan o&apos;zini bloklab qo&apos;ymasligi kerak.
                  </Alert>
                ) : (
                  <>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      Bloklanganda foydalanuvchining barcha qurilmalaridagi sessiyalar darhol bekor qilinadi va u
                      tizimdan chiqariladi.
                    </p>

                    <Field id="reason" label="Sabab" hint="Audit jurnaliga yoziladi" className="mt-4">
                      <Input
                        id="reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Masalan: shubhali operatsiyalar"
                        disabled={isSaving}
                      />
                    </Field>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {user.status !== 'ACTIVE' && (
                        <Button variant="outline" onClick={() => setPendingStatus('ACTIVE')}>
                          Faollashtirish
                        </Button>
                      )}

                      {user.status !== 'SUSPENDED' && (
                        <Button variant="destructive" onClick={() => setPendingStatus('SUSPENDED')}>
                          Bloklash
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}

            <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
              <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Foydalanuvchining paroli, tokeni va boshqa maxfiy ma&apos;lumotlari bu yerda ko&apos;rsatilmaydi —
              admin ham ularni ko&apos;ra olmaydi.
            </p>
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingStatus !== null}
        title={pendingStatus === 'ACTIVE' ? 'Hisobni faollashtirish' : 'Hisobni bloklash'}
        description={
          pendingStatus === 'ACTIVE'
            ? 'Foydalanuvchi yana tizimga kira oladi va xizmatlardan foydalanadi.'
            : 'Foydalanuvchi tizimdan chiqariladi va kira olmaydi. Hamyonidagi pul saqlanib qoladi.'
        }
        confirmLabel={pendingStatus === 'ACTIVE' ? 'Faollashtirish' : 'Bloklash'}
        isDestructive={pendingStatus !== 'ACTIVE'}
        isLoading={isSaving}
        onConfirm={applyStatus}
        onCancel={() => setPendingStatus(null)}
      />

      <ConfirmDialog
        open={pendingRole !== null}
        title={pendingRole?.action === 'grant' ? 'Rol berish' : 'Rolni olib tashlash'}
        description={
          pendingRole
            ? pendingRole.action === 'grant'
              ? `Foydalanuvchiga "${ROLE_LABELS[pendingRole.role] ?? pendingRole.role}" roli beriladi. U barcha qurilmalardan chiqariladi va qayta kirishi kerak bo'ladi.`
              : `Foydalanuvchidan "${ROLE_LABELS[pendingRole.role] ?? pendingRole.role}" roli olib tashlanadi va u barcha qurilmalardan chiqariladi.`
            : ''
        }
        confirmLabel={pendingRole?.action === 'grant' ? 'Rol berish' : 'Olib tashlash'}
        isDestructive={pendingRole?.action === 'revoke'}
        isLoading={isSaving}
        onConfirm={applyRole}
        onCancel={() => setPendingRole(null)}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
      <span
        className="bg-secondary text-muted-foreground inline-flex size-9 items-center justify-center rounded-xl"
        aria-hidden="true"
      >
        <Icon className="size-4.5" />
      </span>

      <p className="text-muted-foreground mt-3 text-xs">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">{hint}</p>}
    </div>
  );
}
