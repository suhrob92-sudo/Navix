'use client';

import { Newspaper } from 'lucide-react';

import { PostList } from '@/components/feed/post-list';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import type { PostView } from '@/modules/feed/feed.types';

export interface UserPostsProps {
  username: string;
  /** O'z profilimi — bo'sh holatdagi matn shunga qarab o'zgaradi. */
  isOwn: boolean;
}

/**
 * Profildagi postlar ro'yxati.
 *
 * ── Nima uchun profil sahifasidan AJRATILGAN ─────────────────────────
 * Profil sahifasi allaqachon uzun: ma'lumotlar, sonlar, amallar,
 * bloklash va shikoyat oynalari. Postlar ham o'sha yerga qo'shilsa,
 * fayl o'qib bo'lmas holga kelardi.
 *
 * Bundan tashqari bu ro'yxat lentadagi bilan BIR XIL kartani
 * ishlatadi — yoqtirish va o'chirish avtomatik ishlaydi.
 */
export function UserPosts({ username, isOwn }: UserPostsProps) {
  const list = useCursorList<PostView>(`/api/v1/users/${username}/posts`, 'posts');
  const actions = usePostActions(list.setItems);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Postlar</h2>

      {actions.error && <Alert variant="error">{actions.error}</Alert>}

      {list.error && <Alert variant="error">{list.error}</Alert>}

      {list.isLoading && (
        <>
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </>
      )}

      {!list.isLoading && !list.error && list.items.length === 0 && (
        <EmptyState
          icon={Newspaper}
          title={isOwn ? 'Siz hali post yozmagansiz' : "Hali post yo'q"}
          description={
            isOwn
              ? "Lentaga kirib birinchi postingizni yozing — uni obunachilaringiz ko'radi."
              : 'Bu odam hali hech narsa yozmagan.'
          }
        />
      )}

      <PostList posts={list.items} actions={actions} canPin={isOwn} />

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
    </section>
  );
}
