'use client';

import { LogOut, Monitor, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';

interface SessionItem {
  id: string;
  deviceLabel: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface SessionsResponse {
  sessions: SessionItem[];
}

/** Sanani "3 daqiqa oldin" ko'rinishida chiqaradi. */
function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'Hozir';
  if (minutes < 60) return `${minutes} daqiqa oldin`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;

  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(isoDate),
  );
}

/** Qurilma nomiga qarab ikonka tanlaydi. */
function getDeviceIcon(label: string | null) {
  const isMobile = label ? /iPhone|iPad|Android/i.test(label) : false;
  return isMobile ? Smartphone : Monitor;
}

/** Qurilmalar sahifasi. */
export function DevicesContent() {
  const request = useApiClient();
  const { data, isLoading, error, reload } = useApiQuery<SessionsResponse>('/api/v1/auth/sessions');

  const [revokeTarget, setRevokeTarget] = useState<SessionItem | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sessions = data?.sessions ?? [];
  const otherSessionsCount = sessions.filter((session) => !session.isCurrent).length;

  async function revokeOne() {
    if (!revokeTarget) return;

    setIsRevoking(true);
    setActionError(null);

    try {
      await request(`/api/v1/auth/sessions/${revokeTarget.id}`, { method: 'DELETE' });
      setNotice(`"${revokeTarget.deviceLabel ?? 'Qurilma'}" tizimdan chiqarildi.`);
      setRevokeTarget(null);
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsRevoking(false);
    }
  }

  async function revokeAllOthers() {
    setIsRevokingAll(true);
    setActionError(null);

    try {
      const result = await request<{ revokedCount: number }>('/api/v1/auth/sessions', { method: 'DELETE' });
      setNotice(`${result.revokedCount} ta qurilma tizimdan chiqarildi.`);
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsRevokingAll(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Qurilmalarim"
        description="Hisobingizga kirgan qurilmalar. Notanish qurilmani ko'rsangiz — darhol chiqaring."
        action={
          otherSessionsCount > 0 ? (
            <Button variant="outline" onClick={revokeAllOthers} isLoading={isRevokingAll}>
              <LogOut aria-hidden="true" />
              Boshqalarni chiqarish
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <Alert variant="error" className="mb-4">
          {actionError}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" className="mb-4">
          {notice}
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="error" title="Qurilmalarni yuklab bo'lmadi">
          {error}
        </Alert>
      )}

      {!isLoading && !error && (
        <ul className="space-y-3">
          {sessions.map((session, index) => {
            const Icon = getDeviceIcon(session.deviceLabel);

            return (
              <li key={session.id}>
                <Card
                  variant="glass"
                  padding="sm"
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="bg-secondary text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{session.deviceLabel ?? "Noma'lum qurilma"}</CardTitle>
                        {session.isCurrent && <Badge variant="success">Joriy qurilma</Badge>}
                      </div>

                      <dl className="text-muted-foreground mt-1.5 space-y-0.5 text-xs">
                        <div className="flex gap-1.5">
                          <dt>Oxirgi faollik:</dt>
                          <dd>{formatRelativeTime(session.lastUsedAt)}</dd>
                        </div>
                        {session.ipAddress && (
                          <div className="flex gap-1.5">
                            <dt>IP manzil:</dt>
                            <dd className="font-mono">{session.ipAddress}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setRevokeTarget(session)}
                      >
                        Chiqarish
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        title="Qurilmani chiqarasizmi?"
        description={
          revokeTarget
            ? `"${revokeTarget.deviceLabel ?? 'Qurilma'}" hisobingizdan chiqariladi va qaytadan kirish uchun parol talab qilinadi.`
            : ''
        }
        confirmLabel="Chiqarish"
        isDestructive
        isLoading={isRevoking}
        onConfirm={revokeOne}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
