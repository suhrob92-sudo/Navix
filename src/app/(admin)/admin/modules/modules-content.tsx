'use client';

import { AlertTriangle, Power, PowerOff } from 'lucide-react';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Permission } from '@/config/rbac';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { RequireAdmin } from '@/modules/admin/require-admin';
import type { ModuleSwitchItem } from '@/modules/admin/module-switch.service';

interface ModulesResponse {
  modules: ModuleSwitchItem[];
}

/**
 * Bo'limlarni vaqtincha yopish sahifasi.
 *
 * ── Nima uchun bu sahifa "qo'rqinchli" ko'rinadi ──────────────────────
 * Bo'limni yopish — butun mamlakat bo'ylab buyurtmalarni to'xtatadi.
 * Shuning uchun bu yerda tasodifan bosib yuborish qiyin: yopish uchun
 * SABAB yozish shart va u foydalanuvchiga ko'rsatiladi. Sabab yozish
 * — bu bir soniyalik to'xtash, o'sha to'xtash esa xatoning oldini
 * oladi.
 */
export function AdminModulesContent() {
  return (
    <RequireAdmin permission={Permission.PLATFORM_MODULE_MANAGE}>
      <ModulesBody />
    </RequireAdmin>
  );
}

function ModulesBody() {
  const request = useApiClient();
  const { data, isLoading, error, reload } = useApiQuery<ModulesResponse>('/api/v1/admin/modules');

  /** Hozir qaysi bo'lim yopilmoqda — matn kiritish oynasi shu bo'limda ochiladi. */
  const [closingId, setClosingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const modules = data?.modules ?? [];
  const disabledCount = modules.filter((item) => !item.isEnabled).length;

  async function apply(moduleId: string, isEnabled: boolean, why?: string) {
    setBusyId(moduleId);
    setActionError(null);

    try {
      await request(`/api/v1/admin/modules/${moduleId}`, {
        method: 'PATCH',
        body: { isEnabled, ...(why ? { reason: why } : {}) },
      });

      setClosingId(null);
      setReason('');
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdminHeader title="Bo'limlar" showBack backHref="/admin" />

      <div className="space-y-4 px-4 pt-4">
        <Alert variant="warning" title="Bu yerda ehtiyot bo'ling">
          Yopilgan bo&apos;lim hech kimga ko&apos;rinmaydi va unga yangi buyurtma berib bo&apos;lmaydi. Eski
          buyurtmalar esa yo&apos;lida davom etadi.
        </Alert>

        {disabledCount > 0 && (
          <Alert variant="error" title={`${disabledCount} ta bo'lim hozir yopiq`}>
            Ishlar tugagach ularni qaytadan oching.
          </Alert>
        )}

        {actionError && (
          <Alert variant="error" title="Bajarilmadi">
            {actionError}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Bo'limlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        <ul className="space-y-2 pb-4">
          {modules.map((item, index) => {
            const isBusy = busyId === item.moduleId;
            const isClosing = closingId === item.moduleId;

            return (
              <li
                key={item.moduleId}
                className={cn(
                  'bg-card border-border animate-fade-up rounded-2xl border p-4',
                  !item.isEnabled && 'border-destructive/40 bg-destructive/5',
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      item.isEnabled ? 'bg-success/12 text-success' : 'bg-destructive/10 text-destructive',
                    )}
                  >
                    {item.isEnabled ? (
                      <Power className="size-5" aria-hidden="true" />
                    ) : (
                      <PowerOff className="size-5" aria-hidden="true" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{item.name}</p>
                      <Badge variant={item.isEnabled ? 'success' : 'destructive'}>
                        {item.isEnabled ? 'Ochiq' : 'Yopiq'}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{item.description}</p>

                    {!item.isEnabled && item.reason && (
                      <p className="text-destructive mt-2 flex items-start gap-1.5 text-xs leading-relaxed">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        {item.reason}
                      </p>
                    )}

                    {item.updatedAt && (
                      <p className="text-muted-foreground mt-1.5 text-xs">
                        {formatUzDateTime(item.updatedAt)}
                        {item.updatedBy ? ` · ${item.updatedBy}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Yopish uchun sabab so'raladi; ochish uchun — yo'q. */}
                {isClosing ? (
                  <div className="mt-4 space-y-3">
                    <Field
                      id={`reason-${item.moduleId}`}
                      label="Nima uchun yopilmoqda?"
                      hint="Bu matn foydalanuvchiga ko'rsatiladi"
                      required
                    >
                      <Textarea
                        id={`reason-${item.moduleId}`}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Masalan: Bank tomonida texnik ishlar, soat 18:00 da tiklanadi"
                        rows={2}
                        maxLength={200}
                      />
                    </Field>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        isLoading={isBusy}
                        disabled={reason.trim().length < 5}
                        onClick={() => void apply(item.moduleId, false, reason.trim())}
                      >
                        Yopish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setClosingId(null);
                          setReason('');
                        }}
                      >
                        Bekor qilish
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    {item.isEnabled ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setClosingId(item.moduleId);
                          setReason('');
                          setActionError(null);
                        }}
                      >
                        <PowerOff className="size-4" aria-hidden="true" />
                        Vaqtincha yopish
                      </Button>
                    ) : (
                      <Button size="sm" isLoading={isBusy} onClick={() => void apply(item.moduleId, true)}>
                        <Power className="size-4" aria-hidden="true" />
                        Qayta ochish
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
