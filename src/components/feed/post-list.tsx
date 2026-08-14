'use client';

import { PostCard } from '@/components/feed/post-card';
import type { PostActions } from '@/hooks/use-post-actions';
import type { PostView } from '@/modules/feed/feed.types';

export interface PostListProps {
  posts: PostView[];
  actions: PostActions;
  /** O'chirish va tahrirlash tugmalari ko'rinsinmi (o'z postlarida). */
  canManage?: boolean;
}

/**
 * Postlar ro'yxati — barcha lentalar uchun BITTA ulanish joyi.
 *
 * ── Nima uchun kerak ─────────────────────────────────────────────────
 * Postlar TO'RT joyda ko'rsatiladi: lenta, saqlanganlar, mavzu
 * sahifasi va profil. Har birida `PostCard` ga o'nta tugma qo'lda
 * ulansa, ertaga yangi tugma qo'shilganda to'rt joyni tahrirlash
 * kerak bo'lardi va bittasi albatta unutilardi.
 *
 * Shu sababdan ulanish shu yerda — bir marta.
 */
export function PostList({ posts, actions, canManage = true }: PostListProps) {
  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <div
          key={post.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
        >
          <PostCard
            post={post}
            isBusy={actions.busyPostId === post.id}
            onToggleLike={() => actions.toggleLike(post)}
            onDoubleTapLike={() => actions.likeOnly(post)}
            onToggleSave={() => actions.toggleSave(post)}
            onShared={() => void actions.sharePost(post)}
            onProductClick={(productId) => actions.trackProductClick(post.id, productId)}
            onReport={(reason, note) => actions.reportPost(post.id, reason, note)}
            {...(canManage
              ? {
                  onEdit: (body: string) => actions.editPost(post.id, body),
                  onDelete: () => actions.deletePost(post.id),
                }
              : {})}
          />
        </div>
      ))}
    </div>
  );
}
