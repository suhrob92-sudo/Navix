'use client';

import { History } from 'lucide-react';

import { FeedHeader } from '@/components/feed/feed-header';
import { PostList } from '@/components/feed/post-list';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import type { PostView } from '@/modules/feed/feed.types';

/**
 * Oxirgi ko'rganlar.
 *
 * ── Nima uchun bu bo'lim KERAK ────────────────────────────────────────
 * Lentada surib ketayotgan odam qiziqarli videoni ko'radi-yu, uni
 * saqlashni unutadi. Keyin qidiruvdan topa olmaydi: video nomi ham,
 * muallifi ham esida qolmagan.
 *
 * Bu ro'yxat hech qanday qo'shimcha harakat talab qilmaydi — u o'zi
 * to'ladi.
 *
 * ── Nima uchun SAQLANGANLARDAN alohida ────────────────────────────────
 * Saqlash — ataylab qilingan tanlov, ro'yxat esa abadiy qoladi.
 * Ko'rish o'z-o'zidan yoziladi va tez almashadi. Ikkalasini
 * aralashtirsak, saqlash o'z ma'nosini yo'qotardi.
 */
export function FeedHistoryContent() {
  const list = useCursorList<PostView>('/api/v1/feed/history', 'posts');
  const actions = usePostActions(list.setItems);

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  return (
    <>
      <FeedHeader title="Oxirgi ko'rganlar" />

      <div className="space-y-4 px-4 pt-4 pb-24">
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
            icon={History}
            title="Hozircha bo'sh"
            description="Ko'rgan videolaringiz shu yerda to'planadi — keyin ularni izlab yurmaysiz."
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
