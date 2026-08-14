'use client';

import { Hash } from 'lucide-react';
import Link from 'next/link';

import { AppHeader } from '@/components/app/app-header';
import { PostList } from '@/components/feed/post-list';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { RequireAuth } from '@/modules/auth/require-auth';
import type { PostView } from '@/modules/feed/feed.types';

export interface TagContentProps {
  tag: string;
}

/**
 * Bitta mavzudagi postlar.
 *
 * ── Nima uchun bu sahifa kerak ───────────────────────────────────────
 * Matndagi `#poyabzal` bosilganda odam nimadir kutadi. Havola hech
 * qayerga olib bormasa, mavzular shunchaki ko'k rangdagi bezak
 * bo'lib qolardi.
 */
export function TagContent({ tag }: TagContentProps) {
  return (
    <RequireAuth>
      <TagBody tag={tag} />
    </RequireAuth>
  );
}

function TagBody({ tag }: TagContentProps) {
  const list = useCursorList<PostView>(`/api/v1/hashtags/${encodeURIComponent(tag)}`, 'posts');
  const actions = usePostActions(list.setItems);

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  return (
    <>
      <AppHeader title={`#${tag}`} showBack backHref="/feed" />

      <div className="space-y-4 px-4 pt-4">
        {actions.error && <Alert variant="error">{actions.error}</Alert>}

        {list.error && (
          <Alert variant="error" title="Mavzuni yuklab bo'lmadi">
            {list.error}
          </Alert>
        )}

        {list.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={Hash}
            title="Bu mavzuda post yo'q"
            description={`Birinchi bo'lib yozing: postingizga #${tag} qo'shsangiz, u shu yerda paydo bo'ladi.`}
            action={
              <Button asChild variant="outline">
                <Link href="/feed">Lentaga o&apos;tish</Link>
              </Button>
            }
          />
        )}

        <PostList posts={list.items} actions={actions} />

        {list.hasMore && (
          <Button
            variant="outline"
            fullWidth
            isLoading={list.isLoadingMore}
            loadingText="Yuklanmoqda..."
            onClick={list.loadMore}
          >
            Yana ko&apos;rsatish
          </Button>
        )}
      </div>
    </>
  );
}
