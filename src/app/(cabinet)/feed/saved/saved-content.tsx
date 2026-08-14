'use client';

import { Bookmark } from 'lucide-react';
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

/**
 * Saqlangan postlar.
 *
 * ── Nima uchun bu sahifa MUHIM ───────────────────────────────────────
 * Odam videoda mahsulotni ko'rdi, lekin hozir pul yo'q yoki vaqti
 * yo'q. Saqlanmasa — u postni boshqa hech qachon topa olmaydi:
 * lenta oqadi va o'sha video pastda ko'milib qoladi.
 *
 * Saqlash esa uni "keyin sotib olaman" ro'yxatiga qo'yadi va bu —
 * to'g'ridan-to'g'ri sotuvga olib boradigan yo'l.
 */
export function SavedContent() {
  return (
    <RequireAuth>
      <SavedBody />
    </RequireAuth>
  );
}

function SavedBody() {
  const list = useCursorList<PostView>('/api/v1/feed/saved', 'posts');
  const actions = usePostActions(list.setItems);

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  return (
    <>
      <AppHeader title="Saqlanganlar" showBack backHref="/feed" />

      <div className="space-y-4 px-4 pt-4">
        {actions.error && <Alert variant="error">{actions.error}</Alert>}

        {list.error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
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
            icon={Bookmark}
            title="Hali hech narsa saqlamagansiz"
            description="Postdagi xatcho'p belgisini bosing — u shu yerda turadi va uni faqat siz ko'rasiz."
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
