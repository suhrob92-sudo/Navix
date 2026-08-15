'use client';

import { Hash } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { RequireAuth } from '@/modules/auth/require-auth';
import type { HashtagListResponse } from '@/modules/feed/feed.types';

/**
 * Mashhur mavzular — to'liq ro'yxat.
 *
 * ── Nima uchun ALOHIDA sahifa ────────────────────────────────────────
 * Lentaning tepasidagi qatorda faqat bir nechtasi sig'adi va u
 * yon tomonga suriladi — ya'ni qolganini topish qiyin.
 *
 * Bu yerda esa hammasi ro'yxat bo'lib turadi va har birida nechta
 * post borligi ko'rinadi.
 */
export function TagsContent() {
  return (
    <RequireAuth>
      <TagsBody />
    </RequireAuth>
  );
}

function TagsBody() {
  const { data, isLoading, error } = useApiQuery<HashtagListResponse>('/api/v1/hashtags');

  const hashtags = data?.hashtags ?? [];

  return (
    <>
      <AppHeader title="Mashhur mavzular" showBack backHref="/feed" />

      <div className="space-y-3 px-4 pt-4">
        {error && (
          <Alert variant="error" title="Mavzularni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {isLoading && (
          <>
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </>
        )}

        {!isLoading && !error && hashtags.length === 0 && (
          <EmptyState
            icon={Hash}
            title="Hali mavzu yo'q"
            description="Postingizga #belgi qo'shing — u shu ro'yxatda paydo bo'ladi."
          />
        )}

        <ul className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
          {hashtags.map((item) => (
            <li key={item.tag}>
              <Link
                href={`/feed/tag/${item.tag}`}
                className="hover:bg-secondary/50 flex items-center gap-3 px-4 py-3.5 transition-colors"
              >
                <span className="bg-secondary text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Hash className="size-4.5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.tag}</span>

                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {`${item.postCount} ta post`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
