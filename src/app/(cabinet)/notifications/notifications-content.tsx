'use client';

import { Bell, CheckCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { PageIntro } from '@/components/app/page-intro';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { getModuleById } from '@/config/modules';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  actionUrl: string | null;
  sourceModule: string;
  createdAt: string;
  readAt: string | null;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

const PAGE_SIZE = 20;

/** Sanani "3 daqiqa oldin" ko'rinishida chiqaradi. */
function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'Hozir';
  if (minutes < 60) return `${minutes} daqiqa oldin`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} kun oldin`;

  return new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(isoDate),
  );
}

/** Bildirishnomalar sahifasi. */
export function NotificationsContent() {
  const request = useApiClient();
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const { data, isLoading, error, reload } = useApiQuery<NotificationsResponse>(
    `/api/v1/notifications?page=${page}&pageSize=${PAGE_SIZE}`,
  );

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  async function markOneAsRead(notification: NotificationItem) {
    if (notification.readAt) return;

    try {
      await request(`/api/v1/notifications/${notification.id}`, { method: 'PATCH' });
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    }
  }

  async function markAllAsRead() {
    setIsMarkingAll(true);
    setActionError(null);

    try {
      await request('/api/v1/notifications', { method: 'PATCH' });
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <>
      <AppHeader title="Bildirishnomalar" showBack backHref="/profile" />

      <div className="px-4 pt-4">
        <PageIntro
          description="Barcha modullardan kelgan xabarlar bir joyda."
          action={
            unreadCount > 0 ? (
              <Button variant="outline" size="sm" onClick={markAllAsRead} isLoading={isMarkingAll}>
                <CheckCheck aria-hidden="true" />
                Barchasini o&apos;qildi
              </Button>
            ) : undefined
          }
        />

        {actionError && (
          <Alert variant="error" className="mb-4">
            {actionError}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Bildirishnomalarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <Card variant="glass" padding="none" className="animate-fade-up">
            <EmptyState
              icon={Bell}
              title="Bildirishnomalar yo'q"
              description="Buyurtma holati, to'lovlar va aksiyalar haqidagi xabarlar shu yerda ko'rinadi."
            />
          </Card>
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <>
            <ul className="space-y-3">
              {notifications.map((notification, index) => {
                const sourceModule = getModuleById(notification.sourceModule);
                const isUnread = notification.readAt === null;

                const content = (
                  <Card
                    variant="glass"
                    padding="sm"
                    className={cn(
                      'animate-fade-up transition-colors',
                      isUnread && 'border-primary/30 bg-primary/5',
                    )}
                    style={{ animationDelay: `${Math.min(index, 10) * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      {/* O'qilmagan xabar belgisi */}
                      <span
                        className={cn(
                          'mt-2 size-2 shrink-0 rounded-full',
                          isUnread ? 'bg-primary' : 'bg-transparent',
                        )}
                        aria-hidden="true"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn('text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                            {notification.title}
                          </p>
                          {sourceModule && <Badge variant="secondary">{sourceModule.name}</Badge>}
                        </div>

                        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{notification.body}</p>
                        <p className="text-muted-foreground mt-1.5 text-xs">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );

                return (
                  <li key={notification.id}>
                    {notification.actionUrl ? (
                      <Link
                        href={notification.actionUrl}
                        onClick={() => void markOneAsRead(notification)}
                        className="block rounded-xl focus-visible:outline-offset-4"
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markOneAsRead(notification)}
                        disabled={!isUnread}
                        className="block w-full rounded-xl text-left focus-visible:outline-offset-4 disabled:cursor-default"
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Sahifalash */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                <ChevronLeft aria-hidden="true" />
                Oldingi
              </Button>

              <span className="text-muted-foreground text-sm tabular-nums">{page}-sahifa</span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={notifications.length < PAGE_SIZE}
              >
                Keyingi
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
