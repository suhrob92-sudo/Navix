'use client';

import { ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate } from '@/lib/date';
import type { BlockedListResponse } from '@/modules/moderation/moderation.types';
import { formatUsername } from '@/modules/profile/social.types';

/**
 * Bloklangan odamlar ro'yxati.
 *
 * ── Nima uchun alohida sahifa KERAK ───────────────────────────────────
 * Bloklash oson, blokdan chiqarish esa qiyin bo'lmasligi kerak. Bu
 * ro'yxatsiz odam faqat bloklangan profilni topib ochish orqali
 * qaytara olardi — qidiruvda esa u ko'rinmaydi. Ya'ni bloklash
 * amalda QAYTARIB BO'LMAYDIGAN bo'lib qolardi.
 */
export function BlockedContent() {
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<BlockedListResponse>('/api/v1/profile/blocked');

  const [pendingUsername, setPendingUsername] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function unblock(username: string) {
    setPendingUsername(username);
    setActionError(null);

    try {
      await request(`/api/v1/users/${username}/block`, { method: 'DELETE' });

      // Ro'yxatdan darhol olib tashlanadi — qayta so'rov shart emas.
      setData((current) =>
        current ? { users: current.users.filter((user) => user.username !== username) } : current!,
      );
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setPendingUsername(null);
    }
  }

  const users = data?.users ?? [];

  return (
    <>
      <AppHeader title="Bloklanganlar" showBack backHref="/profile" />

      <div className="space-y-3 px-4 pt-4">
        {actionError && <Alert variant="error">{actionError}</Alert>}

        {!isLoading && error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {isLoading && (
          <>
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </>
        )}

        {!isLoading && !error && users.length === 0 && (
          <EmptyState
            icon={ShieldOff}
            title="Bloklangan odam yo'q"
            description="Kimdir bezovta qilsa, uning profilidagi «...» tugmasi orqali bloklashingiz mumkin."
          />
        )}

        {users.map((user) => (
          <div
            key={user.userId}
            className="bg-card border-border animate-fade-up flex items-center gap-3 rounded-2xl border p-4"
          >
            <Link href={`/u/${user.username}`} className="shrink-0">
              <Avatar src={user.avatarUrl} name={user.fullName} size="md" />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.fullName ?? formatUsername(user.username)}</p>
              <p className="text-muted-foreground truncate text-xs">
                {`${formatUzDate(user.blockedAt, 'long')} dan beri bloklangan`}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              isLoading={pendingUsername === user.username}
              onClick={() => void unblock(user.username)}
            >
              Chiqarish
            </Button>
          </div>
        ))}
      </div>
    </>
  );
}
