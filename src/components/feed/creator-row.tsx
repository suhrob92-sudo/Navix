'use client';

import { BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUsername } from '@/modules/profile/social.types';
import type { FollowResponse, UserSearchResult } from '@/modules/profile/social.types';

export interface CreatorRowProps {
  creator: UserSearchResult;
}

/**
 * Ijodkor qatori — obuna tugmasi bilan.
 *
 * ── Nima uchun obuna tugmasi SHU YERDA ────────────────────────────────
 * Tavsiya ro'yxatining maqsadi — odamni obunaga undash. Agar buning
 * uchun profilga o'tib, obuna bo'lib, orqaga qaytish kerak bo'lsa,
 * ro'yxat bo'ylab yurish uzilib qolardi va odam bittadan ortiq
 * obuna bo'lmasdi.
 *
 * ── Nima uchun holat komponent ICHIDA ─────────────────────────────────
 * Obuna faqat shu qatorga tegishli. Uni yuqoriga chiqarsak, bitta
 * tugma bosilganda butun ro'yxat qayta chizilardi.
 */
export function CreatorRow({ creator }: CreatorRowProps) {
  const request = useApiClient();

  const [isFollowing, setIsFollowing] = useState(creator.isFollowing);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    /**
     * Ekran DARHOL o'zgaradi.
     *
     * Server javobini kutsak, sekin internetda tugma bir soniya jim
     * turardi va odam uni ikkinchi marta bosardi.
     */
    const next = !isFollowing;

    setIsFollowing(next);
    setIsBusy(true);
    setError(null);

    try {
      await request<FollowResponse>(`/api/v1/users/${creator.username}/follow`, {
        method: next ? 'POST' : 'DELETE',
      });
    } catch (caught) {
      // Xato bo'lsa — eski holatga QAYTARILADI, aks holda ekran
      // yolg'on ko'rsatib turardi.
      setIsFollowing(!next);
      setError(toUserMessage(caught));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3">
      <Link href={`/u/${creator.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={creator.avatarUrl} name={creator.fullName ?? creator.username} size="md" />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-semibold">
            <span className="truncate">{creator.fullName ?? formatUsername(creator.username)}</span>
            {creator.isVerified && (
              <BadgeCheck className="text-primary size-3.5 shrink-0" aria-label="Tasdiqlangan" />
            )}
          </span>
          <span className="text-muted-foreground block truncate text-xs">
            {formatUsername(creator.username)}
          </span>
          {error && <span className="text-destructive block truncate text-xs">{error}</span>}
        </span>
      </Link>

      <Button
        type="button"
        size="sm"
        variant={isFollowing ? 'outline' : 'primary'}
        disabled={isBusy}
        onClick={toggle}
        className="shrink-0"
      >
        {isFollowing ? 'Obunani bekor qilish' : 'Obuna'}
      </Button>
    </div>
  );
}
