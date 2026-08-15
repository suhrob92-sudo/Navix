'use client';

import { Eye, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRelativeUz } from '@/lib/date';
import { authorDisplayName } from '@/modules/feed/feed.types';
import type { StoryViewersResponse } from '@/modules/story/story.types';

export interface StoryViewersProps {
  storyId: string;
  onClose: () => void;
}

/**
 * Hikoyani kim ko'rgani — pastdan chiqadigan varaq.
 *
 * ── Nima uchun bu ro'yxat MUHIM ───────────────────────────────────────
 * Hikoyaning eng kuchli tomoni shu: muallif kim ko'rganini biladi.
 * Sotuvchi uchun bu — "mahsulotimni kim kuzatyapti" degan javob va u
 * hech qanday boshqa joyda yo'q.
 *
 * ── Nima uchun pastdan CHIQADI ────────────────────────────────────────
 * Hikoya ekranda qolishi kerak: odam qaysi hikoya haqida gap
 * ketayotganini yodida saqlaydi. To'liq ekranli oyna bu bog'lanishni
 * uzardi.
 */
export function StoryViewers({ storyId, onClose }: StoryViewersProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const { data, isLoading, error } = useApiQuery<StoryViewersResponse>(
    `/api/v1/stories/${storyId}/viewers`,
  );

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const viewers = data?.viewers ?? [];

  return (
    <dialog
      ref={dialogRef}
      onCancel={onClose}
      className="text-foreground bg-card animate-fade-up mt-auto mb-0 max-h-[70vh] w-full max-w-lg rounded-t-2xl p-5 backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Eye className="size-4" aria-hidden="true" />
          {`Ko'rganlar (${data?.viewCount ?? 0})`}
        </h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      )}

      {!isLoading && !error && viewers.length === 0 && (
        <p className="text-muted-foreground py-6 text-center text-sm">
          Hali hech kim ko&apos;rmadi. Hikoya obunachilaringiz lentasining tepasida turibdi.
        </p>
      )}

      <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
        {viewers.map((row) => (
          <li key={row.author.userId}>
            <Link
              href={`/u/${row.author.username}`}
              onClick={onClose}
              className="hover:bg-secondary flex items-center gap-3 rounded-xl p-2 transition-colors"
            >
              <Avatar src={row.author.avatarUrl} name={row.author.fullName} size="sm" />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {authorDisplayName(row.author)}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {formatRelativeUz(row.viewedAt)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
